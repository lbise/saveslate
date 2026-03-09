import { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface UseIconPickerReturn {
  isIconPickerOpen: boolean;
  setIsIconPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  iconSearchQuery: string;
  setIconSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  allIconNames: string[];
  filteredIconNames: string[];
}

export function useIconPicker(): UseIconPickerReturn {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const allIconNames = useMemo(
    () => Object.keys(LucideIcons.icons).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filteredIconNames = useMemo(() => {
    const query = iconSearchQuery.trim().toLowerCase();
    if (!query) return allIconNames;
    return allIconNames.filter((iconName) => iconName.toLowerCase().includes(query));
  }, [allIconNames, iconSearchQuery]);

  return {
    isIconPickerOpen,
    setIsIconPickerOpen,
    iconSearchQuery,
    setIconSearchQuery,
    allIconNames,
    filteredIconNames,
  };
}
