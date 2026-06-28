import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  ideal_percentage: z.number().min(0).max(100).nullable().optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  ideal_percentage: z.number().min(0).max(100).nullable().optional(),
  is_archived: z.boolean().optional(),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  group_id: z.string().uuid(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  group_id: z.string().uuid().optional(),
  is_archived: z.boolean().optional(),
})

export const reorderGroupsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export const reorderCategoriesSchema = z.object({
  group_id: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

export interface CategoryGroup {
  id: string
  user_id: string
  name: string
  ideal_percentage: number | null
  display_order: number
  is_system: boolean
  is_archived: boolean
}

export interface Category {
  id: string
  user_id: string
  group_id: string
  name: string
  display_order: number
  is_system: boolean
  is_archived: boolean
}

export interface CategoryGroupWithCategories extends CategoryGroup {
  categories: Category[]
}
