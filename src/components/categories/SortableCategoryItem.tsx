'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/category'

interface SortableCategoryItemProps {
  category: Category
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}

export function SortableCategoryItem({
  category,
  onEdit,
  onArchive,
  onDelete,
}: SortableCategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: category.is_system,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (category.is_system) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl ml-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-row)',
        }}
      >
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium truncate block"
            style={{ color: 'var(--text-sub)' }}
          >
            {category.name}
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-dim)' }}
        >
          Sistema
        </span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 px-1 py-0.5 rounded-xl ml-4',
        category.is_archived && 'opacity-50'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
        className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 w-8 h-10 flex items-center justify-center rounded"
        style={{ color: 'var(--text-dim)' }}
      >
        <GripVertical size={14} />
      </button>

      <div className="flex-1 min-w-0 flex items-center gap-2 py-1">
        <span
          className={cn('text-sm font-medium truncate', category.is_archived && 'line-through')}
          style={{ color: category.is_archived ? 'var(--text-dim)' : 'var(--text-main)' }}
        >
          {category.name}
        </span>
        {category.is_archived && (
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-dim)' }}
          >
            Archivada
          </span>
        )}
      </div>

      <div
        className="flex items-center flex-shrink-0"
        style={{ color: 'var(--text-sub)' }}
      >
        <button
          onClick={onEdit}
          aria-label="Editar categoría"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onArchive}
          aria-label={category.is_archived ? 'Desarchivar categoría' : 'Archivar categoría'}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
        >
          {category.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </button>
        <button
          onClick={onDelete}
          aria-label="Eliminar categoría"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
          style={{ color: 'var(--color-negative)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
