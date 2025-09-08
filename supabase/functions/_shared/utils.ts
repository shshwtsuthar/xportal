// supabase/functions/_shared/utils.ts

/**
 * A simple, robust deep merge utility for JSON-like objects.
 * @param target The target object to merge into.
 * @param source The source object to merge from.
 * @returns A new object with the merged properties.
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const output = { ...target };
  
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key as keyof T];
        const targetValue = target[key as keyof T];
  
        // Recursively merge if both values are objects (and not arrays or null)
        if (isObject(targetValue) && isObject(sourceValue)) {
          // We need to cast here because TypeScript cannot infer the recursive structure.
          output[key as keyof T] = deepMerge(targetValue, sourceValue as Partial<typeof targetValue>) as T[keyof T];
        } else {
          // Otherwise, overwrite the value
          output[key as keyof T] = sourceValue as T[keyof T];
        }
      }
    }
    return output;
  }
  
  /**
   * A type guard to check if an item is a non-null, non-array object.
   * @param item The item to check.
   * @returns True if the item is a plain object, false otherwise.
   */
  function isObject(item: unknown): item is Record<string, unknown> {
    // The original expression was logically correct, but this more explicit form
    // directly checks for null before checking the type. This resolves parsing
    // issues related to the `typeof null === 'object'` JavaScript quirk.
    return (item !== null && typeof item === 'object' && !Array.isArray(item));
  }