import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advanceNextDueDate } from '@/lib/zbb/scheduled'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: scheduled } = await supabase
    .from('scheduled_transactions')
    .select('id, frequency, next_due_date, end_date, is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!scheduled) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (!scheduled.is_active) {
    return NextResponse.json({ error: 'La transacción programada no está activa' }, { status: 400 })
  }

  const nextDue = advanceNextDueDate(scheduled.frequency, scheduled.next_due_date)
  const isExpired = scheduled.end_date && nextDue > scheduled.end_date

  const { error } = await supabase
    .from('scheduled_transactions')
    .update({
      next_due_date: nextDue,
      is_active: isExpired ? false : true,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('POST skip: update error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ data: { next_due_date: nextDue } })
}
