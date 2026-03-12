import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_PATCH_FIELDS = [
  'name',
  'industry',
  'target_audience',
  'description',
  'onboarding_completed',
] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Inte inloggad', code: 'unauthorized' },
      { status: 401 }
    )
  }

  let { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error?.code === 'PGRST116') {
    // No org yet — create one
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({ user_id: user.id })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: 'Kunde inte skapa organisation' },
        { status: 500 }
      )
    }
    org = newOrg
  } else if (error) {
    return NextResponse.json(
      { error: 'Kunde inte hämta organisation' },
      { status: 500 }
    )
  }

  return NextResponse.json(org)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Inte inloggad', code: 'unauthorized' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  let { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error?.code === 'PGRST116') {
    // No org row yet — create it
    const { data: newOrg, error: insertError } = await supabase
      .from('organizations')
      .insert({ user_id: user.id, ...updates })
      .select()
      .single()

    if (insertError) {
      console.error('PATCH /api/org insert error:', insertError)
      return NextResponse.json(
        { error: 'Kunde inte skapa organisation' },
        { status: 500 }
      )
    }
    org = newOrg
  } else if (error) {
    console.error('PATCH /api/org error:', error)
    return NextResponse.json(
      { error: 'Kunde inte uppdatera organisation' },
      { status: 500 }
    )
  }

  return NextResponse.json(org)
}
