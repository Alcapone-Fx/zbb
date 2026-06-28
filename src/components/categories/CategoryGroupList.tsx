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
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CategoryGroupItem } from './CategoryGroupItem'
import type { Category, CategoryGroupWithCategories } from '@/types/category'

interface CategoryGroupListProps {
  groups: CategoryGroupWithCategories[]
  onReorderGroups: (newOrder: CategoryGroupWithCategories[]) => void
  onEditGroup: (group: CategoryGroupWithCategories) => void
  onArchiveGroup: (group: CategoryGroupWithCategories) => void
  onDeleteGroup: (group: CategoryGroupWithCategories) => void
  onAddCategory: (groupId: string) => void
  onEditCategory: (category: Category) => void
  onArchiveCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
  onReorderCategories: (groupId: string, newOrder: Category[]) => void
}

export function CategoryGroupList({
  groups,
  onReorderGroups,
  onEditGroup,
  onArchiveGroup,
  onDeleteGroup,
  onAddCategory,
  onEditCategory,
  onArchiveCategory,
  onDeleteCategory,
  onReorderCategories,
}: CategoryGroupListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // System groups are not sortable — only include non-system groups in DnD
  const userGroups = groups.filter((g) => !g.is_system)
  const systemGroups = groups.filter((g) => g.is_system)
  const userGroupIds = userGroups.map((g) => g.id)

  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = userGroups.findIndex((g) => g.id === active.id)
    const newIdx = userGroups.findIndex((g) => g.id === over.id)
    const reordered = arrayMove(userGroups, oldIdx, newIdx)
    onReorderGroups([...reordered, ...systemGroups])
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleGroupDragEnd}
      >
        <SortableContext items={userGroupIds} strategy={verticalListSortingStrategy}>
          {userGroups.map((group) => (
            <CategoryGroupItem
              key={group.id}
              group={group}
              onEditGroup={onEditGroup}
              onArchiveGroup={onArchiveGroup}
              onDeleteGroup={onDeleteGroup}
              onAddCategory={onAddCategory}
              onEditCategory={onEditCategory}
              onArchiveCategory={onArchiveCategory}
              onDeleteCategory={onDeleteCategory}
              onReorderCategories={onReorderCategories}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* System groups are shown below, non-draggable */}
      {systemGroups.map((group) => (
        <CategoryGroupItem
          key={group.id}
          group={group}
          onEditGroup={() => {}}
          onArchiveGroup={() => {}}
          onDeleteGroup={() => {}}
          onAddCategory={() => {}}
          onEditCategory={() => {}}
          onArchiveCategory={() => {}}
          onDeleteCategory={() => {}}
          onReorderCategories={() => {}}
        />
      ))}
    </div>
  )
}
