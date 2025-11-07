export type SearchParamUpdates = Record<string, string | null | undefined>;

export function buildUrlWithParams(
  pathname: string,
  currentParams: URLSearchParams | { toString(): string },
  updates: SearchParamUpdates
): string {
  const params = new URLSearchParams(currentParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
