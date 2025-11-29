/**
 * useFilterState Hook
 *
 * Manages filter AST state with URL synchronization.
 * Provides methods to update, reset, add rules, and add groups.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type {
  FilterAST,
  FilterGroup,
  FilterRule,
} from '@/src/lib/filters/types';

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Options for useFilterState
 */
export interface UseFilterStateOptions {
  /** URL parameter name for storing filter AST (default: 'filters') */
  paramName?: string;
  /** Whether to persist to localStorage (default: false) */
  persistToLocalStorage?: boolean;
  /** localStorage key (default: 'filterState_{paramName}') */
  localStorageKey?: string;
}

/**
 * Default empty filter AST
 */
const createEmptyAST = (): FilterAST => ({
  id: generateId(),
  combinator: 'and',
  rules: [],
});

/**
 * Serialize filter AST to URL-safe string
 * Uses base64 encoding to handle special characters
 */
const serializeAST = (ast: FilterAST): string => {
  try {
    const json = JSON.stringify(ast);
    // Use base64 encoding for URL safety
    return btoa(encodeURIComponent(json));
  } catch (error) {
    console.error('Error serializing filter AST:', error);
    return '';
  }
};

/**
 * Deserialize URL string to filter AST
 */
const deserializeAST = (encoded: string): FilterAST | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as FilterAST;
  } catch (error) {
    console.error('Error deserializing filter AST:', error);
    return null;
  }
};

/**
 * Hook to manage filter AST state with URL synchronization
 *
 * @param options Configuration options
 * @returns Filter state and update methods
 */
export const useFilterState = (options: UseFilterStateOptions = {}) => {
  const {
    paramName = 'filters',
    persistToLocalStorage = false,
    localStorageKey,
  } = options;

  const searchParams = useSearchParams();
  const router = useRouter();
  const storageKey = localStorageKey || `filterState_${paramName}`;

  // Parse filter AST from URL
  const ast = useMemo((): FilterAST => {
    const encoded = searchParams.get(paramName);
    if (encoded) {
      const parsed = deserializeAST(encoded);
      if (parsed) {
        // Also save to localStorage if enabled
        if (persistToLocalStorage && typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          } catch (error) {
            console.error('Error saving to localStorage:', error);
          }
        }
        return parsed;
      }
    }

    // Try to load from localStorage if enabled
    if (persistToLocalStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as FilterAST;
          return parsed;
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    }

    // Return empty AST
    return createEmptyAST();
  }, [searchParams, paramName, persistToLocalStorage, storageKey]);

  // Update filter AST in URL
  const updateAST = useCallback(
    (newAST: FilterAST) => {
      const params = new URLSearchParams(searchParams);

      if (newAST.rules.length === 0) {
        // Remove filter param if empty
        params.delete(paramName);
      } else {
        // Serialize and set filter param
        const encoded = serializeAST(newAST);
        params.set(paramName, encoded);
      }

      router.replace(`?${params.toString()}`, { scroll: false });

      // Also save to localStorage if enabled
      if (persistToLocalStorage && typeof window !== 'undefined') {
        try {
          if (newAST.rules.length === 0) {
            localStorage.removeItem(storageKey);
          } else {
            localStorage.setItem(storageKey, JSON.stringify(newAST));
          }
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      }
    },
    [searchParams, router, paramName, persistToLocalStorage, storageKey]
  );

  // Reset filter to empty
  const resetFilter = useCallback(() => {
    updateAST(createEmptyAST());
  }, [updateAST]);

  // Add a new rule to a group
  const addRule = useCallback(
    (groupId: string, rule: Omit<FilterRule, 'id'>) => {
      const newAST = addRuleToGroup(ast, groupId, {
        ...rule,
        id: generateId(),
      });
      updateAST(newAST);
    },
    [ast, updateAST]
  );

  // Remove a rule from a group
  const removeRule = useCallback(
    (ruleId: string) => {
      const newAST = removeRuleFromAST(ast, ruleId);
      updateAST(newAST);
    },
    [ast, updateAST]
  );

  // Update a rule
  const updateRule = useCallback(
    (ruleId: string, updates: Partial<FilterRule>) => {
      const newAST = updateRuleInAST(ast, ruleId, updates);
      updateAST(newAST);
    },
    [ast, updateAST]
  );

  // Add a new group to a parent group
  const addGroup = useCallback(
    (parentGroupId: string, combinator: 'and' | 'or' = 'and') => {
      const newGroup: FilterGroup = {
        id: generateId(),
        combinator,
        rules: [],
      };
      const newAST = addGroupToGroup(ast, parentGroupId, newGroup);
      updateAST(newAST);
    },
    [ast, updateAST]
  );

  // Remove a group
  const removeGroup = useCallback(
    (groupId: string) => {
      const newAST = removeGroupFromAST(ast, groupId);
      updateAST(newAST);
    },
    [ast, updateAST]
  );

  // Update a group's combinator
  const updateGroupCombinator = useCallback(
    (groupId: string, combinator: 'and' | 'or') => {
      const newAST = updateGroupInAST(ast, groupId, { combinator });
      updateAST(newAST);
    },
    [ast, updateAST]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return ast.rules.length > 0;
  }, [ast]);

  // Count active rules (recursive)
  const activeFilterCount = useMemo(() => {
    return countRules(ast);
  }, [ast]);

  return {
    ast,
    updateAST,
    resetFilter,
    addRule,
    removeRule,
    updateRule,
    addGroup,
    removeGroup,
    updateGroupCombinator,
    hasActiveFilters,
    activeFilterCount,
  };
};

/**
 * Helper: Add a rule to a group
 */
const addRuleToGroup = (
  group: FilterGroup,
  groupId: string,
  rule: FilterRule
): FilterGroup => {
  if (group.id === groupId) {
    return {
      ...group,
      rules: [...group.rules, rule],
    };
  }

  return {
    ...group,
    rules: group.rules.map((node) => {
      if ('combinator' in node) {
        return addRuleToGroup(node, groupId, rule);
      }
      return node;
    }),
  };
};

/**
 * Helper: Remove a rule from AST
 */
const removeRuleFromAST = (ast: FilterAST, ruleId: string): FilterAST => {
  const removeFromGroup = (group: FilterGroup): FilterGroup => {
    return {
      ...group,
      rules: group.rules
        .filter((node) => {
          if ('combinator' in node) {
            return true; // Keep groups, recurse into them
          }
          return node.id !== ruleId; // Remove matching rule
        })
        .map((node) => {
          if ('combinator' in node) {
            return removeFromGroup(node);
          }
          return node;
        }),
    };
  };

  return removeFromGroup(ast);
};

/**
 * Helper: Update a rule in AST
 */
const updateRuleInAST = (
  ast: FilterAST,
  ruleId: string,
  updates: Partial<FilterRule>
): FilterAST => {
  const updateInGroup = (group: FilterGroup): FilterGroup => {
    return {
      ...group,
      rules: group.rules.map((node) => {
        if ('combinator' in node) {
          return updateInGroup(node);
        }
        if (node.id === ruleId) {
          return { ...node, ...updates };
        }
        return node;
      }),
    };
  };

  return updateInGroup(ast);
};

/**
 * Helper: Add a group to a parent group
 */
const addGroupToGroup = (
  group: FilterGroup,
  parentGroupId: string,
  newGroup: FilterGroup
): FilterGroup => {
  if (group.id === parentGroupId) {
    return {
      ...group,
      rules: [...group.rules, newGroup],
    };
  }

  return {
    ...group,
    rules: group.rules.map((node) => {
      if ('combinator' in node) {
        return addGroupToGroup(node, parentGroupId, newGroup);
      }
      return node;
    }),
  };
};

/**
 * Helper: Remove a group from AST
 */
const removeGroupFromAST = (ast: FilterAST, groupId: string): FilterAST => {
  // Can't remove root group
  if (ast.id === groupId) {
    return createEmptyAST();
  }

  const removeFromGroup = (group: FilterGroup): FilterGroup => {
    return {
      ...group,
      rules: group.rules
        .filter((node) => {
          if ('combinator' in node) {
            return node.id !== groupId; // Remove matching group
          }
          return true; // Keep rules
        })
        .map((node) => {
          if ('combinator' in node) {
            return removeFromGroup(node);
          }
          return node;
        }),
    };
  };

  return removeFromGroup(ast);
};

/**
 * Helper: Update a group in AST
 */
const updateGroupInAST = (
  ast: FilterAST,
  groupId: string,
  updates: Partial<FilterGroup>
): FilterAST => {
  const updateInGroup = (group: FilterGroup): FilterGroup => {
    if (group.id === groupId) {
      return { ...group, ...updates };
    }

    return {
      ...group,
      rules: group.rules.map((node) => {
        if ('combinator' in node) {
          return updateInGroup(node);
        }
        return node;
      }),
    };
  };

  return updateInGroup(ast);
};

/**
 * Helper: Count total rules in AST (recursive)
 */
const countRules = (group: FilterGroup): number => {
  return group.rules.reduce((count, node) => {
    if ('combinator' in node) {
      return count + countRules(node);
    }
    return count + 1;
  }, 0);
};
