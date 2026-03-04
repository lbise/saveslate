import type { Tag } from '../types';
import { readStorageWithLegacy } from './storage-migration';
import { loadTransactions, saveTransactions } from './transaction-storage';

const TAGS_KEY = 'saveslate:tags';
const LEGACY_TAGS_KEY = 'melomoney:tags';
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const DEFAULT_TAG_COLOR = '#55AEC8';

export const TAG_COLOR_PRESETS = [
  '#55AEC8',
  '#6AA7FF',
  '#4FD08A',
  '#EF6A6A',
  '#7E9AB3',
  '#C7A2FF',
  '#F5BB00',
] as const;

const TAG_COLOR_PRESET_SET = new Set<string>(TAG_COLOR_PRESETS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTagColor(value: string | undefined): string {
  if (!value) {
    return DEFAULT_TAG_COLOR;
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return DEFAULT_TAG_COLOR;
  }

  const normalized = trimmed.length === 7
    ? trimmed.toUpperCase()
    : `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();

  return TAG_COLOR_PRESET_SET.has(normalized)
    ? normalized
    : DEFAULT_TAG_COLOR;
}

function parseTag(value: unknown): Tag | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? normalizeTagName(value.name) : '';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt.trim() : '';
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt.trim() : '';

  if (!id || !name || !createdAt || !updatedAt) {
    return null;
  }

  const color = normalizeTagColor(typeof value.color === 'string' ? value.color : undefined);

  return {
    id,
    name,
    color,
    createdAt,
    updatedAt,
  };
}

function hasTagNameConflict(tags: Tag[], normalizedName: string, ignoredTagId?: string): boolean {
  const normalizedLowerCaseName = normalizedName.toLowerCase();
  return tags.some((tag) => tag.id !== ignoredTagId && tag.name.toLowerCase() === normalizedLowerCaseName);
}

export function createUniqueTagId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function saveTags(tags: Tag[]): void {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
}

export function loadTags(): Tag[] {
  try {
    const raw = readStorageWithLegacy(TAGS_KEY, LEGACY_TAGS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalizedTags = parsed
      .map((tag) => parseTag(tag))
      .filter((tag): tag is Tag => tag !== null);

    if (normalizedTags.length !== parsed.length) {
      saveTags(normalizedTags);
    }

    return normalizedTags;
  } catch {
    return [];
  }
}

export function addTag(tagDraft: {
  name: string;
  color?: string;
}): Tag {
  const tags = loadTags();
  const name = normalizeTagName(tagDraft.name);
  if (!name) {
    throw new Error('Tag name is required.');
  }

  if (hasTagNameConflict(tags, name)) {
    throw new Error('A tag with this name already exists.');
  }

  const now = new Date().toISOString();
  const existingIds = new Set(tags.map((tag) => tag.id));
  const nextTag: Tag = {
    id: createUniqueTagId(existingIds),
    name,
    color: normalizeTagColor(tagDraft.color),
    createdAt: now,
    updatedAt: now,
  };

  tags.push(nextTag);
  saveTags(tags);
  return nextTag;
}

export function updateTag(
  id: string,
  updates: Partial<Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>>,
): Tag | null {
  const tags = loadTags();
  const tagIndex = tags.findIndex((tag) => tag.id === id);
  if (tagIndex === -1) {
    return null;
  }

  const currentTag = tags[tagIndex];
  const nextName = updates.name === undefined
    ? currentTag.name
    : normalizeTagName(updates.name);
  if (!nextName) {
    throw new Error('Tag name is required.');
  }

  if (hasTagNameConflict(tags, nextName, currentTag.id)) {
    throw new Error('A tag with this name already exists.');
  }

  const nextTag: Tag = {
    ...currentTag,
    name: nextName,
    color: updates.color === undefined
      ? currentTag.color
      : normalizeTagColor(updates.color),
    updatedAt: new Date().toISOString(),
  };

  tags[tagIndex] = nextTag;
  saveTags(tags);
  return nextTag;
}

export function deleteTag(id: string): {
  deleted: boolean;
  unlinkedTransactions: number;
} {
  const tags = loadTags();
  const remainingTags = tags.filter((tag) => tag.id !== id);
  if (remainingTags.length === tags.length) {
    return {
      deleted: false,
      unlinkedTransactions: 0,
    };
  }

  saveTags(remainingTags);

  const transactions = loadTransactions();
  let unlinkedTransactions = 0;

  const updatedTransactions = transactions.map((transaction) => {
    if (!transaction.tagIds || transaction.tagIds.length === 0 || !transaction.tagIds.includes(id)) {
      return transaction;
    }

    const remainingTagIds = transaction.tagIds.filter((tagId) => tagId !== id);
    unlinkedTransactions += 1;

    if (remainingTagIds.length === 0) {
      return {
        ...transaction,
        tagIds: undefined,
      };
    }

    return {
      ...transaction,
      tagIds: remainingTagIds,
    };
  });

  if (unlinkedTransactions > 0) {
    saveTransactions(updatedTransactions);
  }

  return {
    deleted: true,
    unlinkedTransactions,
  };
}
