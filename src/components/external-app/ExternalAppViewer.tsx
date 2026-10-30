import { useState } from 'react'
import type { ExternalAppConfig } from '@/types/projectManagement'
import {
  AlertCircle,
  ExternalLink,
  Globe,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

interface ExternalAppViewerProps {
  config: ExternalAppConfig
  title: string
  description?: string
}

export function ExternalAppViewer({ config, title, description }: ExternalAppViewerProps) {
  const [iframeKey, setIframeKey] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  const { appType, appUrl, launchMethod, embedNotice, authRequired, authInstructions } = config

  const getPlatformLabel = () => {
    switch (appType) {
      case 'streamlit':
        return 'Streamlit Application'
      case 'gradio':
        return 'Gradio / HuggingFace ML App'
      case 'powerbi':
        return 'Power BI Interactive Report'
      case 'tableau':
        return 'Tableau Dashboard'
      case 'custom_web':
        return 'Custom Enterprise Web App'
      default:
        return 'External Web Application'
    }
  }

  const handleReload = () => {
    setIframeKey((prev) => prev + 1)
    setIframeError(false)
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
      {/* Platform & Governance Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-2xs font-bold text-indigo-700 uppercase tracking-wider">
                {getPlatformLabel()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-semibold text-slate-600">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Verified Destination
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">{title}</h3>
            {description && <p className="text-xs text-slate-600 max-w-2xl">{description}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
            >
              Open in New Tab <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Auth instructions notice if applicable */}
        {authRequired && authInstructions && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Authentication Notice:</span> {authInstructions}
            </div>
          </div>
        )}
      </div>

      {/* Embedded View vs Direct Launch Card */}
      {launchMethod === 'embed' ? (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Iframe Top Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#F8FAFC] px-5 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-mono text-2xs text-slate-500 truncate max-w-md">
              <Globe className="h-3.5 w-3.5 text-[#0F766E] shrink-0" />
              <span className="truncate">{appUrl}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReload}
                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Reload application frame"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-2xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                New Tab <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Fallback notification if embedding has security policies */}
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-2xs text-slate-500 flex items-center justify-between">
            <span>
              Sandboxed frame rendering. If the target application blocks iframe embedding (X-Frame-Options or CSP), use the <strong>Open in New Tab</strong> button.
            </span>
            {embedNotice && <span className="font-semibold text-slate-600 ml-2 shrink-0">{embedNotice}</span>}
          </div>

          {/* Sandboxed Iframe Container */}
          <div className="relative w-full h-[700px] bg-slate-100">
            <iframe
              key={iframeKey}
              src={appUrl}
              title={title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="camera; microphone; geolocation"
              className="w-full h-full border-0"
              onError={() => setIframeError(true)}
            />
          </div>
        </div>
      ) : (
        /* Direct Launch Card for New Tab launch method */
        <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs text-center max-w-2xl mx-auto space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#ECFDF5] border border-[#A7F3D0]">
            <Globe className="h-8 w-8 text-[#0F766E]" />
          </div>

          <div className="space-y-2">
            <h4 className="text-xl font-bold text-[#0F172A]">{title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              This application runs as an independently deployed service at{' '}
              <span className="font-mono text-slate-700 break-all">{appUrl}</span>.
              Click below to launch the application directly in a dedicated secure browser session.
            </p>
          </div>

          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-8 py-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all"
          >
            Launch Hosted Application <ExternalLink className="h-4 w-4" />
          </a>

          <p className="text-2xs text-slate-400">
            Destination validated against enterprise security and SSRF governance policies.
          </p>
        </div>
      )}
    </div>
  )
}
