import { useEffect, useState } from 'react'
import { Check, Copy, Download, FileCode, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectDocumentItem } from '@/types/projectManagement'

interface TextPreviewViewerProps {
  doc: ProjectDocumentItem
  previewUrl: string
  onDownload: () => void
}

export function TextPreviewViewer({ doc, previewUrl, onDownload }: TextPreviewViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  const isMarkdown = doc.fileName.toLowerCase().endsWith('.md')

  useEffect(() => {
    let isCancelled = false
    const abortCtrl = new AbortController()

    const loadText = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(previewUrl, { signal: abortCtrl.signal })
        if (!res.ok) {
          throw new Error(`Failed to load text file (${res.status} ${res.statusText})`)
        }
        const text = await res.text()
        if (isCancelled) return
        setContent(text)
        setLoading(false)
      } catch (err: any) {
        if (isCancelled || err?.name === 'AbortError') return
        console.error('[TextPreviewViewer] Error loading text:', err)
        setError(err?.message || 'Failed to load document content.')
        setLoading(false)
      }
    }

    void loadText()

    return () => {
      isCancelled = true
      abortCtrl.abort()
    }
  }, [previewUrl])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('Document content copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <Loader2 className="h-8 w-8 text-[#0F766E] animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Loading document text...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900">Document Preview Unavailable</h4>
          <p className="text-xs text-rose-700">{error}</p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0D655E]"
        >
          <Download className="h-4 w-4" /> Download File
        </button>
      </div>
    )
  }

  const lines = content.split('\n')

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl overflow-hidden border border-slate-200">
      {/* Text Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-2 text-sky-700">
            <FileCode className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-2xs font-bold text-slate-500 uppercase tracking-wider">
              {isMarkdown ? 'Markdown Document' : 'Plain Text Document'}
            </span>
            <p className="text-xs font-bold text-slate-800">
              {lines.length.toLocaleString()} Lines • {content.length.toLocaleString()} Characters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-2xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      {/* Text View Body */}
      <div className="flex-1 overflow-auto max-h-[65vh] p-4 font-mono text-xs text-slate-800 bg-[#F8FAFC]">
        <pre className="whitespace-pre-wrap leading-relaxed select-text font-mono">
          {content}
        </pre>
      </div>
    </div>
  )
}
