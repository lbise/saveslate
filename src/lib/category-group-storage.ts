import {
  CATEGORY_GROUPS,
  getAllCategoryGroupTemplates,
  getCategoryGroupById as getTemplateCategoryGroupById,
  getCategoryGroupSeedForPreset,
} from '../data/mock/category-groups';
import type { CategoryGroup, CategoryPreset, CategorySource } from '../types';

const CATEGORY_GROUPS_KEY = 'saveslate:category-groups';
const CATEGORY_SOURCES = new Set<CategorySource>(['system', 'preset', 'custom']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCategorySource(value: unknown): value is CategorySource {
  return typeof value === 'string' && CATEGORY_SOURCES.has(value as CategorySource);
}

function normalizeSource(value: unknown, isDefault: boolean): CategorySource {
  if (isCategorySource(value)) {
    return value;
  }

  return isDefault ? 'preset' : 'custom';
}

export function parseCategoryGroup(value: unknown): CategoryGroup | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const icon = typeof value.icon === 'string' && value.icon.trim() ? value.icon.trim() : 'Folder';
  const order = typeof value.order === 'number' && Number.isFinite(value.order)
    ? value.order
    : Number.NaN;
  const isDefault = value.isDefault === true;
  const hidden = value.hidden === true;

  if (!id || !name || Number.isNaN(order)) {
    return null;
  }

  return {
    id,
    name,
    icon,
    order,
    isDefault,
    hidden,
    source: normalizeSource(value.source, isDefault),
  };
}

function sanitizeCategoryGroups(categoryGroups: CategoryGroup[]): CategoryGroup[] {
  const seenIds = new Set<string>();

  return categoryGroups
    .map((categoryGroup) => parseCategoryGroup(categoryGroup))
    .filter((categoryGroup): categoryGroup is CategoryGroup => categoryGroup !== null)
    .filter((categoryGroup) => {
      if (seenIds.has(categoryGroup.id)) {
        return false;
      }

      seenIds.add(categoryGroup.id);
      return true;
    });
}

export function createUniqueCategoryGroupId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `category-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function saveCategoryGroups(categoryGroups: CategoryGroup[]): void {
  localStorage.setItem(CATEGORY_GROUPS_KEY, JSON.stringify(sanitizeCategoryGroups(categoryGroups)));
}

export function loadCategoryGroups(): CategoryGroup[] {
  try {
    const raw = localStorage.getItem(CATEGORY_GROUPS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const categoryGroups = sanitizeCategoryGroups(parsed as CategoryGroup[]);
    if (categoryGroups.length !== parsed.length) {
      saveCategoryGroups(categoryGroups);
    }

    return categoryGroups;
  } catch {
    return [];
  }
}

export function getCategoryGroupById(id: string): CategoryGroup | undefined {
  const groupId = id.trim();
  if (!groupId) {
    return undefined;
  }

  return loadCategoryGroups().find((group) => group.id === groupId)
    ?? getTemplateCategoryGroupById(groupId);
}

export function getVisibleCategoryGroups(): CategoryGroup[] {
  return loadCategoryGroups().filter((group) => !group.hidden);
}

export function getDefaultCategoryGroups(): CategoryGroup[] {
  return loadCategoryGroups().filter((group) => group.isDefault);
}

export function addCategoryGroup(categoryGroup: CategoryGroup): CategoryGroup {
  const categoryGroups = loadCategoryGroups();
  const existingIds = new Set(categoryGroups.map((existingGroup) => existingGroup.id));
  const nextId = categoryGroup.id && !existingIds.has(categoryGroup.id)
    ? categoryGroup.id
    : createUniqueCategoryGroupId(existingIds);

  const fallbackOrder = categoryGroups.reduce((maxOrder, existingGroup) => Math.max(maxOrder, existingGroup.order), 0) + 1;
  const nextCategoryGroup = parseCategoryGroup({
    ...categoryGroup,
    id: nextId,
    order: Number.isFinite(categoryGroup.order) ? categoryGroup.order : fallbackOrder,
    source: categoryGroup.source ?? 'custom',
  });

  if (!nextCategoryGroup) {
    throw new Error('Invalid category group');
  }

  categoryGroups.push(nextCategoryGroup);
  saveCategoryGroups(categoryGroups);
  return nextCategoryGroup;
}

export function updateCategoryGroup(
  id: string,
  updates: Partial<Omit<CategoryGroup, 'id'>>,
): CategoryGroup | null {
  const categoryGroups = loadCategoryGroups();
  const groupIndex = categoryGroups.findIndex((group) => group.id === id);
  if (groupIndex === -1) {
    return null;
  }

  const currentGroup = categoryGroups[groupIndex];
  const nextCategoryGroup = parseCategoryGroup({
    ...currentGroup,
    ...updates,
    id,
  });

  if (!nextCategoryGroup) {
    return null;
  }

  categoryGroups[groupIndex] = nextCategoryGroup;
  saveCategoryGroups(categoryGroups);
  return nextCategoryGroup;
}

export function deleteCategoryGroup(id: string): boolean {
  const categoryGroup = getCategoryGroupById(id);
  if (!categoryGroup || categoryGroup.source === 'system') {
    return false;
  }

  const categoryGroups = loadCategoryGroups();
  const filteredGroups = categoryGroups.filter((group) => group.id !== id);
  if (filteredGroups.length === categoryGroups.length) {
    return false;
  }

  saveCategoryGroups(filteredGroups);
  return true;
}

export function mergeCategoryGroups(incomingGroups: CategoryGroup[]): CategoryGroup[] {
  const existingGroups = loadCategoryGroups();
  const existingIds = new Set(existingGroups.map((group) => group.id));
  const highestOrder = existingGroups.reduce((maxOrder, group) => Math.max(maxOrder, group.order), 0);

  const merged = [
    ...existingGroups,
    ...incomingGroups.map((incomingGroup, index) => {
      const nextId = incomingGroup.id && !existingIds.has(incomingGroup.id)
        ? incomingGroup.id
        : createUniqueCategoryGroupId(existingIds);

      existingIds.add(nextId);

      return parseCategoryGroup({
        ...incomingGroup,
        id: nextId,
        order: Number.isFinite(incomingGroup.order) ? incomingGroup.order : highestOrder + index + 1,
        source: incomingGroup.source ?? (incomingGroup.isDefault ? 'preset' : 'custom'),
      });
    }).filter((group): group is CategoryGroup => group !== null),
  ];

  saveCategoryGroups(merged);
  return merged;
}

export function seedCategoryGroupsForPreset(preset: CategoryPreset): CategoryGroup[] {
  const categoryGroups = getCategoryGroupSeedForPreset(preset);
  saveCategoryGroups(categoryGroups);
  return categoryGroups;
}

export function getCategoryGroupTemplateCatalog(): CategoryGroup[] {
  return getAllCategoryGroupTemplates();
}

export function getVisibleCategoryGroupTemplateCatalog(): CategoryGroup[] {
  return CATEGORY_GROUPS;
}
