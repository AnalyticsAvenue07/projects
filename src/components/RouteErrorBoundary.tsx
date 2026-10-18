import { useRouteError, useNavigate } from 'react-router'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export function RouteErrorBoundary() {
  const error: any = useRouteError()
  const navigate = useNavigate()

  const errorMessage = error?.statusText || error?.message || 'An unexpected error occurred.'

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Something went wrong</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Unable to process or display this section. You can retry loading or return to the main dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F766E] text-white font-semibold text-sm hover:bg-[#0D655E] transition-colors shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>

        {Boolean(import.meta.env.DEV) && (
          <details className="mt-6 text-left border-t border-slate-100 pt-4">
            <summary className="text-xs text-slate-400 cursor-pointer font-medium hover:text-slate-600">
              Technical Details (Dev Only)
            </summary>
            <pre className="mt-2 p-3 bg-slate-900 text-slate-200 text-xs rounded-xl overflow-x-auto max-h-40 font-mono">
              {errorMessage}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
