'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  Lock,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SortableCategoryItem } from './SortableCategoryItem'
import type { Category, CategoryGroupWithCategories } from '@/types/category'

interface CategoryGroupItemProps {
  group: CategoryGroupWithCategories
  onEditGroup: (group: CategoryGroupWithCategories) => void
  onArchiveGroup: (group: CategoryGroupWithCategories) => void
  onDeleteGroup: (group: CategoryGroupWithCategories) => void
  onAddCategory: (groupId: string) => void
  onEditCategory: (category: Category) => void
  onArchiveCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
  onReorderCategories: (groupId: string, newOrder: Category[]) => void
}

interface SortableGroupHeaderProps {
  group: CategoryGroupWithCategories
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onAddCategory: () => void
}

function SortableGroupHeader({
  group,
  expanded,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  onAddCategory,
}: SortableGroupHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    disabled: group.is_system,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  if (group.is_system) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn('rounded-2xl overflow-hidden', group.is_archived && 'opacity-50')}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-card)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          <Lock size={14} style={{ color: 'var(--text-dim)' }} className="flex-shrink-0" />
          <span
            className="text-sm font-bold flex-1 truncate"
            style={{ color: 'var(--text-sub)' }}
          >
            {group.name}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-dim)' }}
          >
            Sistema
          </span>
          <button onClick={onToggle} className="p-1" style={{ color: 'var(--text-sub)' }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(group.is_archived && 'opacity-60')}
    >
      <div
        className="flex items-center gap-2 px-3 py-3 group/group rounded-2xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-card)',
        }}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label="Reordenar grupo"
          className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-0.5 rounded"
          style={{ color: 'var(--text-sub)' }}
        >
          <GripVertical size={16} />
        </button>

        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <span
            className={cn('text-sm font-bold truncate', group.is_archived && 'line-through')}
            style={{ color: group.is_archived ? 'var(--text-dim)' : 'var(--text-main)' }}
          >
            {group.name}
          </span>
          {group.ideal_percentage != null && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{
                background: 'var(--ab)',
                color: 'var(--ac)',
              }}
            >
              {group.ideal_percentage}%
            </span>
          )}
          {group.is_archived && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-dim)' }}
            >
              Archivado
            </span>
          )}
        </button>

        <div
          className="flex items-center gap-0.5 opacity-0 group-hover/group:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: 'var(--text-sub)' }}
        >
          {!group.is_archived && (
            <button
              onClick={onAddCategory}
              aria-label="Nueva categoría"
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={onEdit}
            aria-label="Editar grupo"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onArchive}
            aria-label={group.is_archived ? 'Desarchivar grupo' : 'Archivar grupo'}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            {group.is_archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          </button>
          <button
            onClick={onDelete}
            aria-label="Eliminar grupo"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--color-negative)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>

        <button onClick={onToggle} className="p-1 flex-shrink-0" style={{ color: 'var(--text-sub)' }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  )
}

export function CategoryGroupItem({
  group,
  onEditGroup,
  onArchiveGroup,
  onDeleteGroup,
  onAddCategory,
  onEditCategory,
  onArchiveCategory,
  onDeleteCategory,
  onReorderCategories,
}: CategoryGroupItemProps) {
  const [expanded, setExpanded] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = group.categories.findIndex((c) => c.id === active.id)
    const newIdx = group.categories.findIndex((c) => c.id === over.id)
    const newOrder = arrayMove(group.categories, oldIdx, newIdx)
    onReorderCategories(group.id, newOrder)
  }

  const categoryIds = group.categories.map((c) => c.id)

  return (
    <div className="flex flex-col gap-0">
      <SortableGroupHeader
        group={group}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        onEdit={() => onEditGroup(group)}
        onArchive={() => onArchiveGroup(group)}
        onDelete={() => onDeleteGroup(group)}
        onAddCategory={() => onAddCategory(group.id)}
      />

      {expanded && group.categories.length > 0 && (
        <div
          className="flex flex-col gap-1 pt-1 pb-2 px-2"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderLeft: '1px solid var(--border-section)',
            borderRight: '1px solid var(--border-section)',
            borderBottom: '1px solid var(--border-section)',
            borderRadius: '0 0 16px 16px',
            marginTop: '-4px',
          }}
        >
          {group.is_system ? (
            group.categories.map((cat) => (
              <SortableCategoryItem
                key={cat.id}
                category={cat}
                onEdit={() => {}}
                onArchive={() => {}}
                onDelete={() => {}}
              />
            ))
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                {group.categories.map((cat) => (
                  <SortableCategoryItem
                    key={cat.id}
                    category={cat}
                    onEdit={() => onEditCategory(cat)}
                    onArchive={() => onArchiveCategory(cat)}
                    onDelete={() => onDeleteCategory(cat)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {expanded && group.categories.length === 0 && !group.is_system && !group.is_archived && (
        <div
          className="px-4 py-3 text-center text-sm"
          style={{
            color: 'var(--text-dim)',
            background: 'rgba(255,255,255,0.02)',
            borderLeft: '1px solid var(--border-section)',
            borderRight: '1px solid var(--border-section)',
            borderBottom: '1px solid var(--border-section)',
            borderRadius: '0 0 16px 16px',
            marginTop: '-4px',
          }}
        >
          <button
            onClick={() => onAddCategory(group.id)}
            className="text-[var(--ac)] font-medium hover:underline text-sm"
          >
            + Nueva categoría
          </button>
        </div>
      )}
    </div>
  )
}
