import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { tryGetSupabase } from '@/lib/supabase/client'
import type { AppUser, UserRole, UserStatus } from '@/types/domain'

export interface AuthState {
  session: Session | null
  profile: AppUser | null
  initialized: boolean
  profileLoading: boolean
  profileError: string | null
  init: () => Promise<void>
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initialized: false,
  profileLoading: false,
  profileError: null,

  init: async () => {
    const supabase = tryGetSupabase()
    if (!supabase) {
      set({ session: null, profile: null, initialized: true, profileLoading: false, profileError: null })
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    set({ session })

    if (session?.user) {
      await fetchAndSetProfile(supabase, session.user.id, set)
    } else {
      set({ profile: null, profileLoading: false, profileError: null })
    }

    set({ initialized: true })

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({ session: nextSession })
      if (nextSession?.user) {
        void fetchAndSetProfile(supabase, nextSession.user.id, set)
      } else {
        set({ profile: null, profileLoading: false, profileError: null })
      }
    })
  },

  refreshProfile: async () => {
    const supabase = tryGetSupabase()
    const uid = get().session?.user?.id
    if (!supabase || !uid) return
    await fetchAndSetProfile(supabase, uid, set, true)
  },

  signOut: async () => {
    const supabase = tryGetSupabase()
    if (supabase) await supabase.auth.signOut()
    set({ session: null, profile: null, profileLoading: false, profileError: null })
  },
}))

async function fetchAndSetProfile(
  supabase: NonNullable<ReturnType<typeof tryGetSupabase>>,
  userId: string,
  set: (partial: Partial<AuthState>) => void,
  forceRefresh = false
) {
  const currentProfile = useAuthStore.getState().profile
  const hasExistingProfile = currentProfile?.id === userId

  if (hasExistingProfile && !forceRefresh) {
    return
  }

  set({ profileLoading: true, profileError: null })

  for (const delayMs of [0, 150, 400, 900]) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (error) {
      set({
        profile: hasExistingProfile ? currentProfile : null,
        profileLoading: false,
        profileError: error.message,
      })
      return
    }

    if (!data) {
      continue
    }

    set({
      profile: {
        id: data.id,
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        designation: data.designation,
        industry: data.industry,
        use_case: data.use_case,
        role: data.role as UserRole,
        status: data.status as UserStatus,
        created_at: data.created_at,
      },
      profileLoading: false,
      profileError: null,
    })
    return
  }

  set({
    profile: hasExistingProfile ? currentProfile : null,
    profileLoading: false,
    profileError: 'No public.users profile was found for the active auth session.',
  })
}
