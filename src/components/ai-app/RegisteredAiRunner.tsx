import { useEffect, useState } from 'react'
import type { RegisteredAiServiceItem } from '@/types/projectManagement'
import { RegisteredAiService } from '@/services/registeredAiService'
import { isDemoMode } from '@/services/dataMode'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

export interface RegisteredAiRunnerProps {
  serviceId: string
  defaultInputs?: Record<string, any>
  readOnly?: boolean
}

export function RegisteredAiRunner({ serviceId, defaultInputs = {}, readOnly }: RegisteredAiRunnerProps) {
  const service = RegisteredAiService.getServiceBySlug(serviceId)
  const [inputs, setInputs] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...defaultInputs }
    if (service) {
      Object.entries(service.inputSchema.properties).forEach(([key, prop]) => {
        if (initial[key] === undefined && prop.default !== undefined) {
          initial[key] = prop.default
        }
      })
    }
    return initial
  })

  const [health, setHealth] = useState<{ isOnline: boolean; latencyMs: number; statusText: string } | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [executionMeta, setExecutionMeta] = useState<{ timeMs: number; mode: string } | null>(null)

  useEffect(() => {
    if (!service) return
    let active = true
    RegisteredAiService.checkHealth(service.id).then((h) => {
      if (active) setHealth(h)
    })
    return () => {
      active = false
    }
  }, [service])

  if (!service) {
    return (
      <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/50 p-8 text-center text-xs text-rose-700">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <strong>Service Integration Missing:</strong> Service ID "{serviceId}" is not registered in the platform runtime catalog. Developer integration is required.
      </div>
    )
  }

  const handleRun = async () => {
    setError(null)
    if (!isDemoMode() && health && !health.isOnline) {
      setError(`External endpoint at ${service.serviceUrl} is unreachable. Please ensure the microservice is deployed and online before executing live inference.`)
      return
    }
    setRunning(true)
    try {
      const res = await RegisteredAiService.executeService(service.id, inputs)
      setResult(res.result)
      setExecutionMeta({ timeMs: res.executionTimeMs, mode: res.mode })
    } catch (err: any) {
      setError(err.message || 'Inference execution failed.')
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    const defaults: Record<string, any> = {}
    Object.entries(service.inputSchema.properties).forEach(([key, prop]) => {
      if (prop.default !== undefined) defaults[key] = prop.default
    })
    setInputs(defaults)
    setResult(null)
    setError(null)
  }

  const isEndpointOffline = !isDemoMode() && health !== null && !health.isOnline

  return (
    <div className="space-y-6">
      {/* Mode / Health Status Banner */}
      {isDemoMode() ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Demonstration Mode (Simulated AI Inference):</span>
            <p className="mt-0.5 text-amber-800">
              Running deterministic synthetic predictions in client runtime. No external microservice endpoints are invoked. Real inference results require starting registered backend microservices and switching to live API mode.
            </p>
          </div>
        </div>
      ) : isEndpointOffline ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Microservice Endpoint Offline:</span>
            <p className="mt-0.5 text-rose-800">
              The external inference endpoint at <code className="font-mono font-bold">{service.serviceUrl}</code> did not respond to health checks. Live inference is disabled to prevent fabricated predictions.
            </p>
          </div>
        </div>
      ) : null}

      {/* Service Header & Status */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#ECFDF5] p-3 text-[#0F766E]">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">{service.name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-mono text-slate-600">
                  v{service.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {health ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  health.isOnline
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    health.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {health.statusText} ({health.latencyMs}ms)
              </span>
            ) : (
              <span className="text-xs text-slate-400">Pinging runtime...</span>
            )}
          </div>
        </div>

        {/* Dynamic Inputs Form */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inference Inputs & Parameters
            </h4>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-2xs font-semibold text-slate-400 hover:text-slate-700"
            >
              <RotateCcw className="h-3 w-3" /> Reset sample inputs
            </button>
          </div>

          {Object.entries(service.inputSchema.properties).map(([fieldName, prop]) => {
            const val = inputs[fieldName] ?? ''
            const isTextarea = prop.type === 'string' && (prop.default?.length > 40 || fieldName.includes('text'))

            return (
              <div key={fieldName} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    {prop.label || fieldName}{' '}
                    {prop.required && <span className="text-rose-500">*</span>}
                  </span>
                  {prop.description && (
                    <span className="text-2xs font-normal text-slate-400">{prop.description}</span>
                  )}
                </label>

                {prop.enum ? (
                  <select
                    value={val}
                    onChange={(e) => setInputs((p) => ({ ...p, [fieldName]: e.target.value }))}
                    disabled={readOnly || running || isEndpointOffline}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-[#0F766E] focus:outline-none"
                  >
                    {prop.enum.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : isTextarea ? (
                  <textarea
                    rows={4}
                    value={val}
                    onChange={(e) => setInputs((p) => ({ ...p, [fieldName]: e.target.value }))}
                    disabled={readOnly || running || isEndpointOffline}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                ) : prop.type === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => setInputs((p) => ({ ...p, [fieldName]: e.target.checked }))}
                      disabled={readOnly || running || isEndpointOffline}
                      className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span className="text-xs font-semibold text-slate-600">Enabled</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setInputs((p) => ({ ...p, [fieldName]: e.target.value }))}
                    disabled={readOnly || running || isEndpointOffline}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-[#0F766E] focus:outline-none"
                  />
                )}
              </div>
            )
          })}

          <div className="pt-2 flex items-center justify-between">
            <p className="text-2xs text-slate-400">
              Executing against registered endpoint: <code className="text-slate-600 font-mono">{service.serviceUrl}</code>
            </p>
            <button
              type="button"
              onClick={handleRun}
              disabled={running || isEndpointOffline}
              title={isEndpointOffline ? 'Service endpoint is offline' : ''}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0D655E] disabled:opacity-50 transition-colors"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
              {running ? 'Executing Inference...' : isEndpointOffline ? 'Service Offline' : 'Execute AI Pipeline'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Output Presentation */}
      {result && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0F766E]" />
              <h4 className="text-sm font-bold text-[#0F172A]">AI Pipeline Execution Results</h4>
            </div>
            {executionMeta && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-mono font-semibold text-slate-600">
                  {executionMeta.timeMs}ms latency
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                    executionMeta.mode === 'demo'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {executionMeta.mode === 'demo' ? 'Demonstration Mode (Simulated)' : 'Live Inference'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(result).map(([k, v]) => {
              const schemaProp = service.outputSchema.properties[k]
              const label = schemaProp?.label || k.replace(/_/g, ' ')

              return (
                <div key={k} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {label}
                  </span>
                  {schemaProp?.format === 'badge' ? (
                    <span className="inline-block rounded-xl bg-[#0F766E] px-3 py-1 text-xs font-bold text-white shadow-2xs">
                      {String(v)}
                    </span>
                  ) : (
                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">{String(v)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
