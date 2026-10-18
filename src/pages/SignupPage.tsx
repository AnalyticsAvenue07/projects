import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AuthLayout } from '@/layouts/AuthLayout'
import { signUpWithProfile } from '@/services/auth'
import { sendWelcome, sendAdminAlert } from '@/services/email'
import { tryGetSupabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

const inputClass =
  'w-full px-4 py-2.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-lg text-[15px] font-medium text-[#1E293B] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20'

export function SignupPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const initialized = useAuthStore((s) => s.initialized)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [industry, setIndustry] = useState('')
  const [useCase, setUseCase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const configured = Boolean(tryGetSupabase())

  if (initialized && session) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!configured) {
      setError('Supabase is not configured.')
      return
    }
    setLoading(true)
    try {
      const { session } = await signUpWithProfile({
        email,
        password,
        name: fullName,
        company,
        phone,
        designation,
        industry,
        useCase,
      })

      if (!session) {
        throw new Error('Unable to initialize your session after signup. Please try signing in.')
      }
      
      // Trigger transactional emails (best-effort, do not block signup flow)
      try {
        // welcome email to user
        void sendWelcome(email, fullName)
        // admin alert
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || ''
        if (adminEmail) void sendAdminAlert(adminEmail, email, fullName, { company, designation })
      } catch (e) {
        // swallow errors to avoid breaking UX
        console.error('Email service error', e)
      }

      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-1">Create account</h1>
      <p className="text-[15px] font-medium text-[#475569] mb-6">Request access to the Analytics Avenue solution library.</p>

      {!configured && (
        <p className="text-sm font-medium text-[#B91C1C] mb-4">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.</p>
      )}

      <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 -mr-1">
        <Field label="Full name" id="name" value={fullName} onChange={setFullName} required />
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
        />
        <Field label="Company name" id="company" value={company} onChange={setCompany} required />
        <Field label="Phone number" id="phone" type="tel" value={phone} onChange={setPhone} required />
        <Field label="Designation" id="designation" value={designation} onChange={setDesignation} required />
        <Field label="Industry" id="industry" value={industry} onChange={setIndustry} required />
        <div>
          <label htmlFor="useCase" className="block text-[14px] font-bold text-[#1E293B] mb-1.5">
            Use case
          </label>
          <textarea
            id="useCase"
            required
            rows={3}
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            className={inputClass + ' resize-none'}
          />
        </div>

        {error && <p className="text-sm font-medium text-[#B91C1C]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 mt-2 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] transition-colors disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-[14px] font-semibold text-[#475569]">
        Already have an account?{' '}
        <Link to="/login" className="text-[#0284C7] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

function Field({
  label,
  id,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-bold text-[#1E293B] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}
