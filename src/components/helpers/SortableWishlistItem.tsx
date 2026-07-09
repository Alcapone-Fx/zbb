'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { WishlistItem, WishlistPriority } from '@/types/helpers'

const PRIORITY_LABEL: Record<WishlistPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}
const PRIORITY_COLOR: Record<WishlistPriority, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#6b7280',
}

interface Props {
  item: WishlistItem
  onConvert: (item: WishlistItem) => void
  onEdit: (item: WishlistItem) => void
  onDelete: (item: WishlistItem) => void
}

export function SortableWishlistItem({ item, onConvert, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: 'var(--bg-card)' }}
      className="rounded-xl p-4"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Reordenar"
          className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 w-6 h-10 -ml-1 flex items-center justify-center"
          style={{ color: 'var(--text-dim)' }}
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              {item.name}
            </span>
            {item.priority && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  color: PRIORITY_COLOR[item.priority],
                  background: `${PRIORITY_COLOR[item.priority]}22`,
                }}
              >
                {PRIORITY_LABEL[item.priority]}
              </span>
            )}
          </div>
          {item.estimated_cost != null && (
            <p className="text-sm mt-0.5 font-semibold" style={{ color: 'var(--ac)' }}>
              ${item.estimated_cost.toLocaleString('es', { minimumFractionDigits: 2 })}
            </p>
          )}
          {item.notes && (
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-sub)' }}>
              {item.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onConvert(item)}
          className="flex-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: 'var(--ab)', color: 'var(--ac)' }}
        >
          Convertir en Fondo de Ahorro
        </button>
        <button
          onClick={() => onEdit(item)}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(item)}
          className="text-xs px-3 py-1.5 rounded-lg text-red-500"
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}
