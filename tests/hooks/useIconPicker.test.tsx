import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIconPicker } from '../../src/hooks';

describe('useIconPicker', () => {
  describe('initial state', () => {
    it('starts with isIconPickerOpen as false', () => {
      const { result } = renderHook(() => useIconPicker());
      expect(result.current.isIconPickerOpen).toBe(false);
    });

    it('starts with iconSearchQuery as empty string', () => {
      const { result } = renderHook(() => useIconPicker());
      expect(result.current.iconSearchQuery).toBe('');
    });

    it('returns allIconNames sorted alphabetically', () => {
      const { result } = renderHook(() => useIconPicker());
      const names = result.current.allIconNames;

      expect(names.length).toBeGreaterThan(0);

      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });
  });

  describe('allIconNames', () => {
    it('contains well-known lucide icon names', () => {
      const { result } = renderHook(() => useIconPicker());
      const names = result.current.allIconNames;

      // These are stable, widely-used icons in lucide-react (PascalCase keys)
      expect(names).toContain('Search');
      expect(names).toContain('House');
      expect(names).toContain('Settings');
      expect(names).toContain('Heart');
      expect(names).toContain('ArrowDown');
    });

    it('is referentially stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useIconPicker());
      const first = result.current.allIconNames;
      rerender();
      expect(result.current.allIconNames).toBe(first);
    });
  });

  describe('filteredIconNames', () => {
    it('equals allIconNames when query is empty', () => {
      const { result } = renderHook(() => useIconPicker());
      expect(result.current.filteredIconNames).toEqual(result.current.allIconNames);
    });

    it('filters icons by search query', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIconSearchQuery('arrow');
      });

      const filtered = result.current.filteredIconNames;
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(result.current.allIconNames.length);
      for (const name of filtered) {
        expect(name.toLowerCase()).toContain('arrow');
      }
    });

    it('is case-insensitive', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIconSearchQuery('ARROW');
      });
      const upper = [...result.current.filteredIconNames];

      act(() => {
        result.current.setIconSearchQuery('arrow');
      });
      const lower = [...result.current.filteredIconNames];

      act(() => {
        result.current.setIconSearchQuery('ArRoW');
      });
      const mixed = [...result.current.filteredIconNames];

      expect(upper).toEqual(lower);
      expect(lower).toEqual(mixed);
    });

    it('returns all icons when query is whitespace only', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIconSearchQuery('   ');
      });

      expect(result.current.filteredIconNames).toEqual(result.current.allIconNames);
    });

    it('trims whitespace from the query before matching', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIconSearchQuery('  home  ');
      });
      const withSpaces = [...result.current.filteredIconNames];

      act(() => {
        result.current.setIconSearchQuery('home');
      });
      const withoutSpaces = [...result.current.filteredIconNames];

      expect(withSpaces).toEqual(withoutSpaces);
    });

    it('returns empty array when query matches nothing', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIconSearchQuery('zzzzxxxxxnonexistenticon');
      });

      expect(result.current.filteredIconNames).toEqual([]);
    });

    it('returns all icons again after clearing query', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIconSearchQuery('arrow');
      });
      expect(result.current.filteredIconNames.length).toBeLessThan(
        result.current.allIconNames.length,
      );

      act(() => {
        result.current.setIconSearchQuery('');
      });
      expect(result.current.filteredIconNames).toEqual(result.current.allIconNames);
    });
  });

  describe('setIsIconPickerOpen', () => {
    it('toggles isIconPickerOpen to true', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIsIconPickerOpen(true);
      });

      expect(result.current.isIconPickerOpen).toBe(true);
    });

    it('toggles isIconPickerOpen back to false', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIsIconPickerOpen(true);
      });
      expect(result.current.isIconPickerOpen).toBe(true);

      act(() => {
        result.current.setIsIconPickerOpen(false);
      });
      expect(result.current.isIconPickerOpen).toBe(false);
    });

    it('supports functional updater', () => {
      const { result } = renderHook(() => useIconPicker());

      act(() => {
        result.current.setIsIconPickerOpen((prev) => !prev);
      });
      expect(result.current.isIconPickerOpen).toBe(true);

      act(() => {
        result.current.setIsIconPickerOpen((prev) => !prev);
      });
      expect(result.current.isIconPickerOpen).toBe(false);
    });
  });
});
