'use client';

import { useMemo } from 'react';
import { useGetPrograms } from '@/src/hooks/useGetPrograms';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/database.types';
import Link from 'next/link';

export function PaymentPlanTemplatesTable() {
  const { data: programs, isLoading: programsLoading } = useGetPrograms();

  // Fetch all templates (we'll group by program)
  const { data: allTemplates, isLoading: templatesLoading } =
    useGetAllTemplates();

  const programMap = useMemo(() => {
    const map = new Map<string, string>();
    (programs ?? []).forEach((p) => map.set(p.id as string, p.name as string));
    return map;
  }, [programs]);

  const isLoading = programsLoading || templatesLoading;

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading templates…</p>;

  return (
    <div className="w-full overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="divide-x">
            <TableHead>Template Name</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Default</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {(allTemplates ?? []).map((t) => (
            <TableRow key={t.id} className="divide-x">
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                {programMap.get(t.program_id as string) ?? '—'}
              </TableCell>
              <TableCell>
                {t.is_default ? (
                  <Badge variant="default">Default</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/financial/templates/edit/${t.id}`}>
                        Edit
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {(allTemplates ?? []).length === 0 && (
            <TableRow className="divide-x">
              <TableCell colSpan={4}>
                <p className="text-muted-foreground text-sm">
                  No templates found. Create one to get started.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Quick inline hook to fetch all templates
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const useGetAllTemplates = () => {
  return useQuery({
    queryKey: ['payment-plan-templates'],
    queryFn: async (): Promise<Tables<'payment_plan_templates'>[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payment_plan_templates')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
};
