'use client'

import { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CategoryGroupList } from './CategoryGroupList'
import { GroupFormSheet } from './GroupFormSheet'
import { CategoryFormSheet } from './CategoryFormSheet'
import { ConfirmSheet } from '@/components/shared/ConfirmSheet'
import type {
  Category,
  CategoryGroup,
  CategoryGroupWithCategories,
  CreateGroupInput,
  UpdateGroupInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/category'

interface CategoriesClientProps {
  initialGroups: CategoryGroupWithCategories[]
}

type ConfirmState = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  destructive?: boolean
} | null

export function CategoriesClient({ initialGroups }: CategoriesClientProps) {
  const [groups, setGroups] = useState<CategoryGroupWithCategories[]>(initialGroups)

  const [groupSheet, setGroupSheet] = useState<{
    open: boolean
    group?: CategoryGroupWithCategories
  }>({ open: false })

  const [categorySheet, setCategorySheet] = useState<{
    open: boolean
    category?: Category
    groupId: string
  }>({ open: false, groupId: '' })

  const [confirm, setConfirm] = useState<ConfirmState>(null)

  // ── Group CRUD ──────────────────────────────────────────────────────────────

  async function handleSaveGroup(data: CreateGroupInput | UpdateGroupInput) {
    const editing = groupSheet.group
    const res = await fetch(
      editing ? `/api/categories/groups/${editing.id}` : '/api/categories/groups',
      {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

    if (editing) {
      setGroups((prev) =>
        prev.map((g) => (g.id === editing.id ? { ...g, ...json.data } : g))
      )
    } else {
      setGroups((prev) => [...prev, { ...json.data, categories: [] }])
    }
  }

  function handleArchiveGroup(group: CategoryGroupWithCategories) {
    const isArchiving = !group.is_archived
    setConfirm({
      title: isArchiving ? 'Archivar grupo' : 'Desarchivar grupo',
      description: isArchiving
        ? `¿Archivar "${group.name}"? Sus categorías también quedarán archivadas.`
        : `¿Desarchivar "${group.name}"?`,
      confirmLabel: isArchiving ? 'Archivar' : 'Desarchivar',
      onConfirm: async () => {
        const res = await fetch(`/api/categories/groups/${group.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived: isArchiving }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error')

        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== group.id) return g
            const updatedCategories = isArchiving
              ? g.categories.map((c) => (c.is_system ? c : { ...c, is_archived: true }))
              : g.categories
            return { ...g, ...json.data, categories: updatedCategories }
          })
        )
      },
    })
  }

  function handleDeleteGroup(group: CategoryGroupWithCategories) {
    setConfirm({
      title: 'Eliminar grupo',
      description: `¿Eliminar "${group.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: async () => {
        const res = await fetch(`/api/categories/groups/${group.id}`, { method: 'DELETE' })
        if (res.status === 409) {
          const json = await res.json()
          throw new Error(json.error)
        }
        if (!res.ok) throw new Error('Error al eliminar')
        setGroups((prev) => prev.filter((g) => g.id !== group.id))
      },
    })
  }

  // ── Category CRUD ───────────────────────────────────────────────────────────

  async function handleSaveCategory(data: CreateCategoryInput | UpdateCategoryInput) {
    const editing = categorySheet.category
    const res = await fetch(editing ? `/api/categories/${editing.id}` : '/api/categories', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

    if (editing) {
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          categories: g.categories.map((c) =>
            c.id === editing.id ? { ...c, ...json.data } : c
          ),
        }))
      )
    } else {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === json.data.group_id
            ? { ...g, categories: [...g.categories, json.data] }
            : g
        )
      )
    }
  }

  function handleArchiveCategory(category: Category) {
    const isArchiving = !category.is_archived
    setConfirm({
      title: isArchiving ? 'Archivar categoría' : 'Desarchivar categoría',
      description: isArchiving
        ? `¿Archivar "${category.name}"?`
        : `¿Desarchivar "${category.name}"?`,
      confirmLabel: isArchiving ? 'Archivar' : 'Desarchivar',
      onConfirm: async () => {
        const res = await fetch(`/api/categories/${category.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived: isArchiving }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error')
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            categories: g.categories.map((c) =>
              c.id === category.id ? { ...c, ...json.data } : c
            ),
          }))
        )
      },
    })
  }

  function handleDeleteCategory(category: Category) {
    setConfirm({
      title: 'Eliminar categoría',
      description: `¿Eliminar "${category.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: async () => {
        const res = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
        if (res.status === 409) {
          const json = await res.json()
          throw new Error(json.error)
        }
        if (!res.ok) throw new Error('Error al eliminar')
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            categories: g.categories.filter((c) => c.id !== category.id),
          }))
        )
      },
    })
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────

  async function handleReorderGroups(newOrder: CategoryGroupWithCategories[]) {
    setGroups(newOrder)
    const userGroups = newOrder.filter((g) => !g.is_system)
    await fetch('/api/categories/groups/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: userGroups.map((g) => g.id) }),
    })
  }

  async function handleReorderCategories(groupId: string, newOrder: Category[]) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, categories: newOrder } : g))
    )
    await fetch('/api/categories/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, ids: newOrder.map((c) => c.id) }),
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 flex items-start justify-between"
        style={{
          background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-1.5 -ml-1.5 rounded-xl transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-sub)' }}
            aria-label="Volver a Configuración"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1
              className="text-[22px] font-extrabold tracking-[-0.5px]"
              style={{ color: 'var(--text-main)' }}
            >
              Categorías
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
              Grupos y categorías de presupuesto
            </p>
          </div>
        </div>

        <button
          onClick={() => setGroupSheet({ open: true, group: undefined })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
          style={{
            background: 'var(--ab)',
            color: 'var(--ac)',
          }}
          aria-label="Nuevo grupo"
        >
          <Plus size={16} />
          Grupo
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-8">
        {groups.length === 0 ? (
          <div
            className="mt-4 p-8 rounded-2xl text-center"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--text-sub)' }}>
              Sin grupos aún. Crea tu primer grupo de categorías.
            </p>
            <button
              onClick={() => setGroupSheet({ open: true })}
              className="text-sm font-semibold"
              style={{ color: 'var(--ac)' }}
            >
              + Nuevo grupo
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <CategoryGroupList
              groups={groups}
              onReorderGroups={handleReorderGroups}
              onEditGroup={(g) => setGroupSheet({ open: true, group: g })}
              onArchiveGroup={handleArchiveGroup}
              onDeleteGroup={handleDeleteGroup}
              onAddCategory={(groupId) =>
                setCategorySheet({ open: true, groupId, category: undefined })
              }
              onEditCategory={(cat) =>
                setCategorySheet({ open: true, category: cat, groupId: cat.group_id })
              }
              onArchiveCategory={handleArchiveCategory}
              onDeleteCategory={handleDeleteCategory}
              onReorderCategories={handleReorderCategories}
            />
          </div>
        )}
      </div>

      {/* Group form sheet */}
      <GroupFormSheet
        open={groupSheet.open}
        onClose={() => setGroupSheet({ open: false })}
        group={groupSheet.group as CategoryGroup | undefined}
        onSave={handleSaveGroup}
      />

      {/* Category form sheet */}
      <CategoryFormSheet
        open={categorySheet.open}
        onClose={() => setCategorySheet((s) => ({ ...s, open: false }))}
        category={categorySheet.category}
        groupId={categorySheet.groupId}
        onSave={handleSaveCategory}
      />

      {/* Confirm sheet */}
      {confirm && (
        <ConfirmSheet
          open={true}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          destructive={confirm.destructive}
        />
      )}
    </>
  )
}
