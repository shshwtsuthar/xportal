import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/database.types';

export type TablePreferences = {
  visible_columns: string[];
  column_widths: Record<string, number>;
};

const TABLE_KEY_APPLICATIONS = 'applications.datatable';
export const getApplicationsTableKey = () => TABLE_KEY_APPLICATIONS;

const TABLE_KEY_INVOICES = 'invoices.datatable';
export const getInvoicesTableKey = () => TABLE_KEY_INVOICES;

const TABLE_KEY_DEPOSITS = 'deposits.datatable';
export const getDepositsTableKey = () => TABLE_KEY_DEPOSITS;

const TABLE_KEY_COMMISSIONS = 'commissions.datatable';
export const getCommissionsTableKey = () => TABLE_KEY_COMMISSIONS;

const TABLE_KEY_STUDENTS = 'students.datatable';
export const getStudentsTableKey = () => TABLE_KEY_STUDENTS;

const TABLE_KEY_PAYMENT_CONFIRMATIONS = 'payment-confirmations.datatable';
export const getPaymentConfirmationsTableKey = () =>
  TABLE_KEY_PAYMENT_CONFIRMATIONS;

export const useGetTablePreferences = (tableKey: string) => {
  return useQuery({
    queryKey: ['table-prefs', tableKey],
    queryFn: async (): Promise<TablePreferences> => {
      const supabase = createClient();

      // rto_id is enforced by RLS; we only need table_key and current user
      const { data, error } = await supabase
        .from('user_table_preferences')
        .select('visible_columns, column_widths')
        .eq('table_key', tableKey)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116: No rows returned for single() / maybeSingle()
        throw new Error(error.message);
      }

      return {
        visible_columns: data?.visible_columns ?? [],
        column_widths: (data?.column_widths as Record<string, number>) ?? {},
      };
    },
  });
};

type UpsertPayload = {
  tableKey: string;
  visible_columns?: string[];
  column_widths?: Record<string, number>;
};

export const useUpsertTablePreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tableKey,
      visible_columns,
      column_widths,
    }: UpsertPayload) => {
      const supabase = createClient();

      // Identify current user and tenant
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        throw new Error(userErr.message);
      }
      const user = userRes?.user;
      if (!user) {
        throw new Error('Not authenticated');
      }
      const rtoId = (
        user.app_metadata as Record<string, unknown> | undefined
      )?.['rto_id'] as string | undefined;
      if (!rtoId) {
        throw new Error('Missing rto_id in session app_metadata');
      }

      // Fetch current to preserve other fields in a single upsert
      const { data: existing, error: readErr } = await supabase
        .from('user_table_preferences')
        .select('visible_columns, column_widths')
        .eq('table_key', tableKey)
        .maybeSingle();
      if (readErr && readErr.code !== 'PGRST116') {
        throw new Error(readErr.message);
      }

      const nextVisible = visible_columns ?? existing?.visible_columns ?? [];
      const nextWidths =
        column_widths ??
        (existing?.column_widths as Record<string, number>) ??
        {};

      // Insert with defaults; RLS requires rto_id and user_id to match session.
      // rto_id is derived from JWT via server defaults in some tables; here we include it explicitly if required later.
      const { error } = await supabase.from('user_table_preferences').upsert(
        {
          table_key: tableKey,
          visible_columns: nextVisible,
          column_widths:
            nextWidths as unknown as Tables<'user_table_preferences'>['column_widths'],
          rto_id: rtoId,
          user_id: user.id,
        },
        { onConflict: 'rto_id,user_id,table_key' }
      );

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['table-prefs', vars.tableKey] });
    },
  });
};
