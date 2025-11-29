/**
 * useMasterFilter Hook
 *
 * Generic hook for fetching data with filter AST support.
 * Integrates with TanStack Query and uses the query compiler to build Supabase queries.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/database.types';
import type {
  FilterAST,
  QueryCompilationOptions,
} from '@/src/lib/filters/types';
import { buildSupabaseQuery } from '@/src/lib/filters/query-compiler';
import { validateAST } from '@/src/lib/filters/validation';

/**
 * Options for useMasterFilter
 */
export interface UseMasterFilterOptions<T = unknown>
  extends Omit<QueryCompilationOptions, 'rootTable'> {
  /** Root table to query from */
  rootTable: string;
  /** Filter AST (optional - if not provided, fetches all records) */
  ast?: FilterAST;
  /** Additional TanStack Query options */
  queryOptions?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>;
  /** Custom select fields for UI display (beyond what's needed for filtering) */
  additionalSelectFields?: string[];
}

/**
 * Serialize filter AST for query key
 */
const serializeASTForQueryKey = (ast?: FilterAST): string => {
  if (!ast || ast.rules.length === 0) {
    return 'all';
  }
  return JSON.stringify(ast);
};

/**
 * Generic hook for fetching data with filter AST
 *
 * @param options Configuration options
 * @returns TanStack Query result
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMasterFilter({
 *   rootTable: 'students',
 *   ast: filterAST,
 *   includeCount: true,
 * });
 * ```
 */
export const useMasterFilter = <T = unknown>(
  options: UseMasterFilterOptions<T>
) => {
  const {
    rootTable,
    ast,
    selectFields,
    includeCount = false,
    maxDepth = 3,
    additionalSelectFields,
    queryOptions,
  } = options;

  // Combine select fields
  const allSelectFields = [
    ...(selectFields || []),
    ...(additionalSelectFields || []),
  ];

  return useQuery<T[], Error>({
    queryKey: [
      rootTable,
      'filtered',
      ast ? serializeASTForQueryKey(ast) : 'all',
    ],
    queryFn: async (): Promise<T[]> => {
      const supabase = createClient();

      // If no AST or empty AST, fetch all records
      if (!ast || ast.rules.length === 0) {
        const queryBuilder = supabase
          .from(rootTable as keyof Database['public']['Tables'])
          .select(
            allSelectFields.length > 0 ? allSelectFields.join(', ') : '*',
            {
              count: includeCount ? 'exact' : undefined,
            }
          );

        const { data, error } = await queryBuilder;
        if (error) {
          throw new Error(error.message);
        }
        return (data as T[]) ?? [];
      }

      // Validate AST
      const validationErrors = validateAST(ast, maxDepth);
      if (validationErrors.length > 0) {
        const errorMessages = validationErrors
          .map((e) => `${e.path}: ${e.message}`)
          .join('; ');
        throw new Error(`Invalid filter AST: ${errorMessages}`);
      }

      // Build and execute query
      const queryBuilder = buildSupabaseQuery(supabase, ast, {
        rootTable,
        selectFields: allSelectFields.length > 0 ? allSelectFields : undefined,
        includeCount,
        maxDepth,
      });

      // Execute the query - the builder returns a promise-like object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (queryBuilder as any);
      const { data, error } = result;

      if (error) {
        throw new Error(error.message);
      }

      return (data as T[]) ?? [];
    },
    ...queryOptions,
  });
};

/**
 * Hook for fetching data with count
 *
 * @param options Configuration options
 * @returns TanStack Query result with count
 */
export const useMasterFilterWithCount = <T = unknown>(
  options: UseMasterFilterOptions<T>
) => {
  const query = useMasterFilter<T>({
    ...options,
    includeCount: true,
  });

  // Note: Supabase returns count separately, but we're using it internally
  // For now, we'll return the data and let the caller handle count if needed
  // In a future enhancement, we could extract count from the response
  return query;
};
