import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalsClient } from '@/components/settings/GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: groups } = await supabase
    .from('category_groups')
    .select('id, name, ideal_percentage')
    .eq('user_id', user.id)
    .eq('is_system', false)
    .eq('is_archived', false)
    .order('display_order', { ascending: true })

  const initialGroups = (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    ideal_percentage: g.ideal_percentage !== null ? Number(g.ideal_percentage) : null,
  }))

  return <GoalsClient initialGroups={initialGroups} />
}
