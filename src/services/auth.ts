import { getSupabase, tryGetSupabase } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

export interface SignUpPayload {
  email: string
  password: string
  name: string
  company: string
  phone: string
  designation: string
  industry: string
  useCase: string
}

export interface SignUpResult {
  session: Session | null
  user: User | null
}

export async function signUpWithProfile(payload: SignUpPayload): Promise<SignUpResult> {
  const supabase = tryGetSupabase()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      data: {
        full_name: payload.name,
        company_name: payload.company,
        phone: payload.phone,
        designation: payload.designation,
        industry: payload.industry,
        use_case: payload.useCase,
      },
    },
  })
  if (error) throw error

  if (!data.session) {
    const signInResult = await supabase.auth.signInWithPassword({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    })
    if (signInResult.error) throw signInResult.error

    const sessionResponse = await supabase.auth.getSession()
    if (sessionResponse.error) throw sessionResponse.error

    return {
      session: sessionResponse.data.session,
      user: sessionResponse.data.session?.user ?? null,
    }
  }

  return {
    session: data.session,
    user: data.user,
  }
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw error
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
  if (error) throw error
}
