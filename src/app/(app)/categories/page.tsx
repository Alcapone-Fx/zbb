import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoriesClient } from '@/components/categories/CategoriesClient'
import type { CategoryGroupWithCategories } from '@/types/category'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: groups }, { data: categories }] = await Promise.all([
    supabase
      .from('category_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
  ])

  const initialGroups: CategoryGroupWithCategories[] = (groups ?? []).map((g) => ({
    ...g,
    categories: (categories ?? []).filter((c) => c.group_id === g.id),
  }))

  return <CategoriesClient initialGroups={initialGroups} />
}
