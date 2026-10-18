import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'

export function SettingsPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErr('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMsg('Password updated.')
      setPassword('')
      setConfirm('')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const input =
    'w-full max-w-xl px-4 py-2.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-lg text-[15px] font-medium text-[#1E293B] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20'

  return (
    <div className="p-6">
      <section className="mb-6 rounded-3xl border border-[#E2E8F0] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0F766E]">Account settings</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Security preferences</h1>
            <p className="mt-2 max-w-2xl text-[#475569]">Update your login credentials with the same secure, consistent experience used across the rest of the workspace.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] px-4 py-2 text-sm font-semibold text-[#047857]">
            <ShieldCheck className="h-4 w-4" />
            Secure account updates
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={onSubmit} className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-[#0F172A]">Change password</h2>
          <p className="mt-1 text-sm text-[#475569]">Use at least 8 characters and confirm the new password before saving.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[14px] font-bold text-[#1E293B]">New password</label>
              <input type="password" autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[14px] font-bold text-[#1E293B]">Confirm password</label>
              <input type="password" autoComplete="new-password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {err && <p className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B91C1C]">{err}</p>}
            {msg && <p className="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#15803D]">{msg}</p>}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#0F766E] px-5 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)] transition-colors hover:bg-[#0D5F58] disabled:opacity-60"
          >
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <aside className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-bold text-[#0F172A]">Security notes</h3>
          <ul className="mt-4 space-y-3 text-sm text-[#475569]">
            <li className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">Use a unique password you have not used on other work accounts.</li>
            <li className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">Changes are applied through the existing Supabase auth flow without altering your workspace access rules.</li>
            <li className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">You can return here anytime to keep your account credentials current.</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
