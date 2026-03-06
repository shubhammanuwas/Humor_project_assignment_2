import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ProfileRow = {
  id?: string | null
  user_id?: string | null
  auth_user_id?: string | null
  is_superadmin?: boolean | null
}

type AdminContext = {
  supabase: ReturnType<typeof createSupabaseServerClient>
  userId: string
  userEmail: string | null
  profile: ProfileRow | null
  isSuperadmin: boolean
}

async function getProfileByField(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  field: 'user_id' | 'auth_user_id' | 'id',
  value: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, auth_user_id, is_superadmin')
    .eq(field, value)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as ProfileRow
}

async function loadAdminContext(): Promise<AdminContext | null> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let profile = await getProfileByField(supabase, 'user_id', user.id)
  if (!profile) {
    profile = await getProfileByField(supabase, 'auth_user_id', user.id)
  }
  if (!profile) {
    profile = await getProfileByField(supabase, 'id', user.id)
  }

  return {
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    profile,
    isSuperadmin: Boolean(profile?.is_superadmin),
  }
}

export async function requireSuperadminPage() {
  const context = await loadAdminContext()

  if (!context) {
    redirect('/login')
  }

  if (!context.isSuperadmin) {
    redirect('/protected')
  }

  return context
}

export async function getSuperadminActionContext(): Promise<
  { context: AdminContext } | { error: string }
> {
  const context = await loadAdminContext()

  if (!context) {
    return { error: 'Please sign in again.' }
  }

  if (!context.isSuperadmin) {
    return { error: 'Only superadmins can use admin actions.' }
  }

  return { context }
}
