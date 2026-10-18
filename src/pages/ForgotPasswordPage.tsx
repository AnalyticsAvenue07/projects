import { useState } from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/layouts/AuthLayout'
import { requestPasswordReset } from '@/services/auth'
import { tryGetSupabase } from '@/lib/supabase/client'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const configured = Boolean(tryGetSupabase())

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!configured) {
      setError('Supabase is not configured.')
      return
    }
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/login`
      await requestPasswordReset(email, redirectTo)
      setMessage('If an account exists for this email, you will receive reset instructions shortly.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-1">Forgot password</h1>
      <p className="text-[15px] font-medium text-[#475569] mb-6">We will email you a reset link.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[14px] font-bold text-[#1E293B] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-lg text-[15px] font-medium text-[#1E293B] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>
        {error && <p className="text-sm font-medium text-[#B91C1C]">{error}</p>}
        {message && <p className="text-sm font-medium text-[#15803D]">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] transition-colors disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-[14px] font-semibold">
        <Link to="/login" className="text-[#0284C7] hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
