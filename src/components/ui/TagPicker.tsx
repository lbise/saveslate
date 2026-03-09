import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Plus, Search, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { DEFAULT_TAG_COLOR, TAG_COLOR_PRESETS } from '../../lib/tag-storage';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tag } from '../../types';

interface TagPickerProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag: (draft: { name: string; color: string }) => Tag;
  onUpdateTag: (tagId: string, updates: { name: string; color: string }) => Tag;
  onDeleteTag: (tagId: string) => boolean;
  tagUsageCountById?: Map<string, number>;
  onClose: () => void;
  className?: string;
}

function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function TagPicker({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  tagUsageCountById,
  onClose,
  className,
}: TagPickerProps) {
  const [query, setQuery] = useState('');
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(DEFAULT_TAG_COLOR);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [pendingDeleteTagId, setPendingDeleteTagId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectedTagIdSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredTags = useMemo(() => {
    return [...tags]
      .sort((left, right) => left.name.localeCompare(right.name))
      .filter((tag) => {
        if (!normalizedQuery) {
          return true;
        }

        return tag.name.toLowerCase().includes(normalizedQuery);
      });
  }, [tags, normalizedQuery]);

  const toggleTagSelection = (tagId: string) => {
    if (selectedTagIdSet.has(tagId)) {
      onChange(selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId));
      return;
    }

    onChange([...selectedTagIds, tagId]);
  };

  const resetForm = () => {
    setEditingTagId(null);
    setFormName('');
    setFormColor(DEFAULT_TAG_COLOR);
    setFormError(null);
  };

  const startEditingTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setFormName(tag.name);
    setFormColor(tag.color);
    setFormError(null);
    setPendingDeleteTagId(null);
  };

  const submitTagForm = () => {
    const normalizedName = normalizeTagName(formName);
    if (!normalizedName) {
      setFormError('Tag name is required.');
      return;
    }

    try {
      if (editingTagId) {
        onUpdateTag(editingTagId, {
          name: normalizedName,
          color: formColor,
        });
      } else {
        const createdTag = onCreateTag({
          name: normalizedName,
          color: formColor,
        });

        if (!selectedTagIdSet.has(createdTag.id)) {
          onChange([...selectedTagIds, createdTag.id]);
        }
      }

      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save tag.');
    }
  };

  const confirmTagDelete = (tagId: string) => {
    const deleted = onDeleteTag(tagId);
    if (!deleted) {
      setFormError('Unable to delete tag.');
      return;
    }

    if (selectedTagIdSet.has(tagId)) {
      onChange(selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId));
    }

    if (editingTagId === tagId) {
      resetForm();
    }

    setPendingDeleteTagId(null);
  };

  return (
    <div
      className={cn(
        'absolute z-30 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-(--radius-md) py-1 shadow-(--shadow-md)',
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative px-2 py-1.5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dimmed" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search tags..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-7 py-1.5 h-auto"
        />
      </div>

      {selectedTagIds.length > 0 && (
        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full px-2 py-1.5 rounded-(--radius-sm) bg-transparent border-none cursor-pointer text-sm text-dimmed hover:text-foreground hover:bg-secondary transition-colors text-left flex items-center gap-2"
          >
            <X size={12} />
            Clear tags
          </button>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto py-1 px-2 space-y-1">
        {filteredTags.length === 0 ? (
          <div className="px-2 py-2 text-sm text-dimmed text-center">
            {tags.length === 0 ? 'No tags yet. Add your first tag below.' : 'No tags found'}
          </div>
        ) : (
          filteredTags.map((tag) => {
            const isSelected = selectedTagIdSet.has(tag.id);
            const isPendingDelete = pendingDeleteTagId === tag.id;
            const usageCount = tagUsageCountById?.get(tag.id) ?? 0;

            return (
              <div
                key={tag.id}
                className={cn(
                  'flex items-center gap-2 rounded-(--radius-sm) px-2 py-1.5 transition-colors',
                  isSelected
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleTagSelection(tag.id)}
                  className="flex items-center gap-2 min-w-0 flex-1 bg-transparent border-none cursor-pointer p-0 text-left"
                >
                  <TagIcon size={12} style={{ color: tag.color }} className="shrink-0" />
                  <span className="text-sm truncate" style={{ color: tag.color }}>
                    {tag.name}
                  </span>
                  <span className="text-sm text-dimmed ml-auto shrink-0">{usageCount}</span>
                </button>

                <div className="ml-auto flex items-center gap-1">
                  {isPendingDelete ? (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmTagDelete(tag.id);
                        }}
                        className="text-sm text-expense bg-transparent border-none cursor-pointer hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteTagId(null);
                        }}
                        className="text-sm text-dimmed bg-transparent border-none cursor-pointer hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEditingTag(tag);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-(--radius-sm) bg-transparent border-none text-dimmed hover:text-foreground hover:bg-secondary cursor-pointer"
                        title={`Edit tag ${tag.name}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteTagId(tag.id);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-(--radius-sm) bg-transparent border-none text-dimmed hover:text-expense hover:bg-expense/10 cursor-pointer"
                        title={`Delete tag ${tag.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="h-px bg-border mx-2 my-1" />

      <div className="px-2 pb-2 space-y-2">
        <div className="space-y-1">
          <p className="text-sm text-dimmed">{editingTagId ? 'Edit tag' : 'Create tag'}</p>
          <Input
            type="text"
            className="h-auto py-1.5"
            value={formName}
            onChange={(event) => {
              setFormName(event.target.value);
              if (formError) {
                setFormError(null);
              }
            }}
            placeholder="Tag name"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TAG_COLOR_PRESETS.map((color) => {
            const isActive = formColor.toUpperCase() === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setFormColor(color)}
                className={cn(
                  'w-6 h-6 rounded-full border transition-all',
                  isActive
                    ? 'border-foreground ring-1 ring-foreground'
                    : 'border-border hover:border-dimmed',
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            );
          })}
          {editingTagId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-dimmed bg-transparent border-none cursor-pointer hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>

        {formError && (
          <p className="text-sm text-expense">{formError}</p>
        )}

        <Button
          type="button"
          onClick={submitTagForm}
          className="w-full"
          size="sm"
        >
          <Plus size={14} />
          {editingTagId ? 'Save tag' : 'Add tag'}
        </Button>
      </div>
    </div>
  );
}
