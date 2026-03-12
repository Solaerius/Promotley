import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  await supabase.auth.exchangeCodeForSession(code)

  return NextResponse.redirect(`${origin}/`)
}
