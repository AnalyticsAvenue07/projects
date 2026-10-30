import { useState } from 'react'
import type { NotebookCell, NotebookConfig } from '@/types/projectManagement'
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  Info,
  Terminal,
} from 'lucide-react'

interface SafeNotebookRendererProps {
  config: NotebookConfig
  title?: string
}

/**
 * Strips potentially dangerous executable tags and inline event handlers from HTML outputs
 */
function sanitizeNotebookHtml(rawHtml: string): string {
  if (!rawHtml) return ''
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*href\s*=\s*["']javascript:[^"']*["']/gi, '')
}

export function SafeNotebookRenderer({ config, title }: SafeNotebookRendererProps) {
  const [copiedCellIndex, setCopiedCellIndex] = useState<number | null>(null)

  const handleCopyCode = (source: string, index: number) => {
    navigator.clipboard.writeText(source)
    setCopiedCellIndex(index)
    setTimeout(() => setCopiedCellIndex(null), 2000)
  }

  const { metadata, cells, connectedAppUrl, connectedAppLabel } = config

  return (
    <div className="space-y-6">
      {/* Safety & Execution Boundary Notice */}
      <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 text-xs text-sky-900 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-950">Static Research Notebook (Safe View-Only Runtime)</p>
              <p className="mt-0.5 text-sky-800">
                Code execution is safely sandboxed. All visual graphs, outputs, and telemetry are rendered from the notebook's pre-computed snapshots.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="rounded-full bg-white/80 border border-sky-200 px-3 py-1 font-mono font-bold text-sky-800 text-2xs">
              Kernel: {metadata?.kernel || 'Python 3'}
            </span>
            <span className="rounded-full bg-white/80 border border-sky-200 px-3 py-1 font-mono font-bold text-sky-800 text-2xs">
              {metadata?.cellCount || cells.length} Cells ({metadata?.codeCellCount || 0} Code, {metadata?.markdownCellCount || 0} Markdown)
            </span>
          </div>
        </div>
      </div>

      {/* Connected Interactive Application Banner (if configured) */}
      {connectedAppUrl && (
        <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded-full bg-teal-100 text-[#0F766E] border border-teal-200 px-3 py-0.5 text-2xs font-bold uppercase tracking-wider">
                Interactive Environment
              </span>
              <h3 className="text-base font-bold text-[#0F172A]">
                {connectedAppLabel || 'Separately Deployed Interactive Application'}
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                A live, runnable version of this research pipeline has been deployed to an isolated enterprise compute runtime.
              </p>
            </div>
            <a
              href={connectedAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F766E] px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E] transition-all shrink-0"
            >
              Launch Live Application <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Notebook Cells Container */}
      <div className="space-y-4">
        {cells.map((cell, idx) => {
          const sourceText = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source || '')

          if (cell.cell_type === 'markdown') {
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs transition-all hover:border-slate-300"
              >
                <div className="flex items-center gap-2 mb-3 text-2xs font-bold uppercase tracking-wider text-slate-400">
                  <FileText className="h-3.5 w-3.5" /> Markdown Cell [{idx + 1}]
                </div>
                <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {sourceText}
                </div>
              </div>
            )
          }

          // Code cell
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Code Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-[#F8FAFC] px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 font-mono text-2xs font-bold text-slate-500">
                  <Code2 className="h-3.5 w-3.5 text-[#0F766E]" />
                  <span>In [{cell.execution_count ?? idx + 1}]:</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(sourceText, idx)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {copiedCellIndex === idx ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy Code
                    </>
                  )}
                </button>
              </div>

              {/* Code Editor Preview */}
              <div className="bg-[#0F172A] p-4 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
                <pre className="m-0 font-mono">{sourceText}</pre>
              </div>

              {/* Outputs (if any) */}
              {cell.outputs && cell.outputs.length > 0 && (
                <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-slate-400">
                    <Terminal className="h-3 w-3" /> Output [{cell.execution_count ?? idx + 1}]
                  </div>

                  {cell.outputs.map((out, outIdx) => {
                    // Standard stream text (stdout/stderr)
                    if (out.output_type === 'stream') {
                      const text = Array.isArray(out.text) ? out.text.join('') : String(out.text || '')
                      return (
                        <div
                          key={outIdx}
                          className="rounded-xl border border-slate-200 bg-white p-3 font-mono text-2xs text-slate-800 whitespace-pre-wrap overflow-x-auto"
                        >
                          {text}
                        </div>
                      )
                    }

                    // Display Data or Execute Result (Images, Plain text, sanitized HTML)
                    if (out.output_type === 'display_data' || out.output_type === 'execute_result') {
                      const data = out.data || {}

                      // PNG / JPEG Image
                      if (data['image/png']) {
                        return (
                          <div key={outIdx} className="rounded-xl border border-slate-200 bg-white p-4 flex justify-center">
                            <img
                              src={`data:image/png;base64,${data['image/png']}`}
                              alt={`Notebook visual output ${outIdx + 1}`}
                              className="max-h-[500px] object-contain rounded-lg shadow-2xs"
                            />
                          </div>
                        )
                      }

                      if (data['image/jpeg']) {
                        return (
                          <div key={outIdx} className="rounded-xl border border-slate-200 bg-white p-4 flex justify-center">
                            <img
                              src={`data:image/jpeg;base64,${data['image/jpeg']}`}
                              alt={`Notebook visual output ${outIdx + 1}`}
                              className="max-h-[500px] object-contain rounded-lg shadow-2xs"
                            />
                          </div>
                        )
                      }

                      // Sanitized HTML
                      if (data['text/html']) {
                        const htmlStr = Array.isArray(data['text/html'])
                          ? data['text/html'].join('')
                          : String(data['text/html'])
                        const safeHtml = sanitizeNotebookHtml(htmlStr)
                        return (
                          <div
                            key={outIdx}
                            className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto text-xs text-slate-800"
                            dangerouslySetInnerHTML={{ __html: safeHtml }}
                          />
                        )
                      }

                      // Plain text fallback
                      if (data['text/plain']) {
                        const plainText = Array.isArray(data['text/plain'])
                          ? data['text/plain'].join('')
                          : String(data['text/plain'])
                        return (
                          <div
                            key={outIdx}
                            className="rounded-xl border border-slate-200 bg-white p-3 font-mono text-2xs text-slate-700 whitespace-pre-wrap overflow-x-auto"
                          >
                            {plainText}
                          </div>
                        )
                      }
                    }

                    // Error output
                    if (out.output_type === 'error') {
                      const traceback = out.traceback?.join('\n') || `${out.ename}: ${out.evalue}`
                      return (
                        <div
                          key={outIdx}
                          className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs font-mono text-rose-800 space-y-1"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-rose-900">
                            <AlertTriangle className="h-4 w-4" />
                            {out.ename || 'Runtime Error'}: {out.evalue}
                          </div>
                          <pre className="text-2xs whitespace-pre-wrap text-rose-700 overflow-x-auto">
                            {traceback}
                          </pre>
                        </div>
                      )
                    }

                    return null
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
