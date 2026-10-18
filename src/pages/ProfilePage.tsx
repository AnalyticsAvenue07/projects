import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { updateMyProfile } from '@/services/users'
import { useAuthStore } from '@/stores/authStore'

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [designation, setDesignation] = useState('')
  const [industry, setIndustry] = useState('')
  const [useCase, setUseCase] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setPhone(profile.phone ?? '')
    setCompany(profile.company ?? '')
    setDesignation(profile.designation ?? '')
    setIndustry(profile.industry ?? '')
    setUseCase(profile.use_case ?? '')
  }, [profile])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setErr(null)
    setMsg(null)
    setSaving(true)
    try {
      await updateMyProfile(profile.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        designation: designation.trim() || null,
        industry: industry.trim() || null,
        use_case: useCase.trim() || null,
      })
      const supabase = getSupabase()
      await supabase.auth.updateUser({ data: { full_name: name.trim() } })
      await refreshProfile()
      setMsg('Profile saved.')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return <p className="p-6 text-[15px] font-medium text-[#475569]">Loading…</p>
  }

  const input =
    'w-full max-w-xl px-4 py-2.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-lg text-[15px] font-medium text-[#1E293B] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20'

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#1E293B] mb-1">Profile</h1>
      <p className="text-[15px] font-medium text-[#475569] mb-6">Update your professional details.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Full name</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Email</label>
          <input className={input + ' bg-[#F8FAFC]'} value={profile.email} disabled readOnly />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Phone</label>
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Company</label>
          <input className={input} value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Designation</label>
          <input className={input} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Industry</label>
          <input className={input} value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Use case</label>
          <textarea className={input + ' min-h-[96px] resize-none'} value={useCase} onChange={(e) => setUseCase(e.target.value)} />
        </div>

        {err && <p className="text-sm font-medium text-[#B91C1C]">{err}</p>}
        {msg && <p className="text-sm font-medium text-[#15803D]">{msg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
