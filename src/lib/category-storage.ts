import {
  CATEGORIES,
  getAllCategoryTemplates,
  getCategoryById as getTemplateCategoryById,
  getCategorySeedForPreset,
} from '../data/mock/categories';
import type { Category, CategoryPreset, CategorySource } from '../types';

const CATEGORIES_KEY = 'saveslate:categories';
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

export function parseCategory(value: unknown): Category | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const icon = typeof value.icon === 'string' && value.icon.trim() ? value.icon.trim() : 'CircleHelp';
  const groupId = typeof value.groupId === 'string' && value.groupId.trim() ? value.groupId.trim() : undefined;
  const isDefault = value.isDefault === true;
  const hidden = value.hidden === true;

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    icon,
    groupId,
    isDefault,
    hidden,
    source: normalizeSource(value.source, isDefault),
  };
}

function sanitizeCategories(categories: Category[]): Category[] {
  const seenIds = new Set<string>();

  return categories
    .map((category) => parseCategory(category))
    .filter((category): category is Category => category !== null)
    .filter((category) => {
      if (seenIds.has(category.id)) {
        return false;
      }

      seenIds.add(category.id);
      return true;
    });
}

export function createUniqueCategoryId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `category-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(sanitizeCategories(categories)));
}

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const categories = sanitizeCategories(parsed as Category[]);
    if (categories.length !== parsed.length) {
      saveCategories(categories);
    }

    return categories;
  } catch {
    return [];
  }
}

export function getCategoryById(id: string): Category | undefined {
  const categoryId = id.trim();
  if (!categoryId) {
    return undefined;
  }

  return loadCategories().find((category) => category.id === categoryId)
    ?? getTemplateCategoryById(categoryId);
}

export function getVisibleCategories(): Category[] {
  return loadCategories().filter((category) => !category.hidden);
}

export function getDefaultCategories(): Category[] {
  return loadCategories().filter((category) => category.isDefault);
}

export function addCategory(category: Category): Category {
  const categories = loadCategories();
  const existingIds = new Set(categories.map((existingCategory) => existingCategory.id));
  const nextId = category.id && !existingIds.has(category.id)
    ? category.id
    : createUniqueCategoryId(existingIds);

  const nextCategory = parseCategory({
    ...category,
    id: nextId,
    source: category.source ?? 'custom',
  });

  if (!nextCategory) {
    throw new Error('Invalid category');
  }

  categories.push(nextCategory);
  saveCategories(categories);
  return nextCategory;
}

export function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id'>>,
): Category | null {
  const categories = loadCategories();
  const categoryIndex = categories.findIndex((category) => category.id === id);
  if (categoryIndex === -1) {
    return null;
  }

  const currentCategory = categories[categoryIndex];
  const nextCategory = parseCategory({
    ...currentCategory,
    ...updates,
    id,
  });

  if (!nextCategory) {
    return null;
  }

  categories[categoryIndex] = nextCategory;
  saveCategories(categories);
  return nextCategory;
}

export function deleteCategory(id: string): boolean {
  const category = getCategoryById(id);
  if (!category || category.source === 'system') {
    return false;
  }

  const categories = loadCategories();
  const filteredCategories = categories.filter((entry) => entry.id !== id);
  if (filteredCategories.length === categories.length) {
    return false;
  }

  saveCategories(filteredCategories);
  return true;
}

export function mergeCategories(incomingCategories: Category[]): Category[] {
  const existingCategories = loadCategories();
  const existingIds = new Set(existingCategories.map((category) => category.id));

  const merged = [
    ...existingCategories,
    ...incomingCategories.map((incomingCategory) => {
      const nextId = incomingCategory.id && !existingIds.has(incomingCategory.id)
        ? incomingCategory.id
        : createUniqueCategoryId(existingIds);

      existingIds.add(nextId);

      return parseCategory({
        ...incomingCategory,
        id: nextId,
        source: incomingCategory.source ?? (incomingCategory.isDefault ? 'preset' : 'custom'),
      });
    }).filter((category): category is Category => category !== null),
  ];

  saveCategories(merged);
  return merged;
}

export function seedCategoriesForPreset(preset: CategoryPreset): Category[] {
  const categories = getCategorySeedForPreset(preset);
  saveCategories(categories);
  return categories;
}

export function getCategoryTemplateCatalog(): Category[] {
  return getAllCategoryTemplates();
}

export function getVisibleCategoryTemplateCatalog(): Category[] {
  return CATEGORIES;
}
