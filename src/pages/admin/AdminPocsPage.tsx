import { useCallback, useEffect, useState } from 'react'
import { deletePoc, fetchAllPocsAdmin, getCachedAdminPocs, upsertPoc } from '@/services/pocs'
import type { Poc } from '@/types/domain'

interface PocForm {
  id?: string
  title: string
  slug: string
  description: string
  industry: string
  tagLine: string
  client: string
  solution_function: string
  tech: string
  contact: string
  featured: boolean
  sort_rank: number
  date_label: string
  visibility: 'visible' | 'hidden'
  thumbnail: string
}

const emptyForm = (): PocForm => ({
  title: '',
  slug: '',
  description: '',
  industry: '',
  tagLine: '',
  client: '',
  solution_function: '',
  tech: '',
  contact: '',
  featured: false,
  sort_rank: 0,
  date_label: '',
  visibility: 'visible',
  thumbnail: '',
})

function toForm(p: Poc): PocForm {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    industry: p.industry ?? '',
    tagLine: p.tags.join(', '),
    client: p.client ?? '',
    solution_function: p.solution_function ?? '',
    tech: p.tech ?? '',
    contact: p.contact ?? '',
    featured: p.featured,
    sort_rank: p.sort_rank,
    date_label: p.date_label ?? '',
    visibility: p.visibility,
    thumbnail: p.thumbnail ?? '',
  }
}

export function AdminPocsPage() {
  const cachedPocs = getCachedAdminPocs()
  const hasInitialCachedPocs = cachedPocs.length > 0
  const [pocs, setPocs] = useState<Poc[]>(cachedPocs)
  const [loading, setLoading] = useState(!hasInitialCachedPocs)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<PocForm | null>(null)

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setErr(null)
    try {
      const rows = await fetchAllPocsAdmin()
      setPocs(rows)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load POCs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(!hasInitialCachedPocs)
  }, [hasInitialCachedPocs, load])

  async function save() {
    if (!editing) return
    setErr(null)
    try {
      await upsertPoc({
        id: editing.id,
        title: editing.title,
        slug: editing.slug,
        description: editing.description,
        industry: editing.industry || null,
        tags: editing.tagLine ? editing.tagLine.split(',').map((s) => s.trim()) : [],
        client: editing.client || null,
        solution_function: editing.solution_function || null,
        tech: editing.tech || null,
        contact: editing.contact || null,
        featured: editing.featured,
        sort_rank: editing.sort_rank,
        date_label: editing.date_label || null,
        thumbnail: editing.thumbnail || null,
        visibility: editing.visibility,
      })
      setEditing(null)
      await load(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function toggleVisibility(p: Poc) {
    setErr(null)
    try {
      await upsertPoc({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        industry: p.industry,
        tags: p.tags,
        client: p.client,
        solution_function: p.solution_function,
        tech: p.tech,
        contact: p.contact,
        featured: p.featured,
        sort_rank: p.sort_rank,
        date_label: p.date_label,
        thumbnail: p.thumbnail,
        visibility: p.visibility === 'visible' ? 'hidden' : 'visible',
      })
      await load(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function remove(p: Poc) {
    if (!window.confirm(`Delete POC "${p.title}"?`)) return
    setErr(null)
    try {
      await deletePoc(p.id)
      await load(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">POC management</h1>
          <p className="text-[15px] font-medium text-[#475569] mt-1">Add, edit, delete, and control catalogue visibility.</p>
        </div>
        <button
          type="button"
          className="px-5 py-2.5 bg-[#0F766E] text-white rounded-lg font-bold text-[15px] hover:bg-[#0D5F58] shadow-sm"
          onClick={() => setEditing(emptyForm())}
        >
          Add POC
        </button>
      </div>

      {err && <p className="text-sm font-medium text-[#B91C1C]">{err}</p>}

      {editing && (
        <div
          className="bg-white border-[1.5px] border-[#CBD5E1] rounded-xl p-6 shadow-sm space-y-3"
          style={{ boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}
        >
          <h2 className="font-bold text-lg text-[#1E293B]">{editing.id ? 'Edit POC' : 'New POC'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledInput label="Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
            <LabeledInput label="Slug" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} />
            <LabeledInput label="Industry" value={editing.industry} onChange={(v) => setEditing({ ...editing, industry: v })} />
            <LabeledInput
              label="Sort rank"
              type="number"
              value={String(editing.sort_rank)}
              onChange={(v) => setEditing({ ...editing, sort_rank: Number(v) || 0 })}
            />
            <LabeledInput
              label="Tags (comma-separated)"
              value={editing.tagLine}
              onChange={(v) => setEditing({ ...editing, tagLine: v })}
            />
            <LabeledInput label="Date label" value={editing.date_label} onChange={(v) => setEditing({ ...editing, date_label: v })} />
            <LabeledInput label="Client" value={editing.client} onChange={(v) => setEditing({ ...editing, client: v })} />
            <LabeledInput
              label="Function"
              value={editing.solution_function}
              onChange={(v) => setEditing({ ...editing, solution_function: v })}
            />
            <LabeledInput label="Tech" value={editing.tech} onChange={(v) => setEditing({ ...editing, tech: v })} />
            <LabeledInput label="Contact" value={editing.contact} onChange={(v) => setEditing({ ...editing, contact: v })} />
            <label className="flex items-center gap-2 text-[14px] font-bold text-[#1E293B] md:col-span-2">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
              />
              Featured
            </label>
            <div className="md:col-span-2">
              <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">Description</label>
              <textarea
                className="w-full min-h-[100px] px-4 py-2.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-lg text-[15px] font-medium"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="px-5 py-2 bg-[#0F766E] text-white rounded-lg font-bold text-[14px]" onClick={() => void save()}>
              Save
            </button>
            <button type="button" className="px-5 py-2 border border-[#CBD5E1] rounded-lg font-bold text-[14px]" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        className="bg-white border-[1.5px] border-[#CBD5E1] rounded-xl overflow-hidden shadow-sm"
        style={{ boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}
      >
        {loading ? (
          <p className="p-6 text-[15px] font-medium text-[#475569]">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                <tr>
                  <th className="px-4 py-3 font-bold text-[#475569]">Title</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Slug</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Visibility</th>
                  <th className="px-4 py-3 font-bold text-[#475569]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E1]">
                {pocs.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-bold text-[#1E293B]">{p.title}</td>
                    <td className="px-4 py-3 font-medium text-[#475569]">{p.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md border ${
                          p.visibility === 'visible'
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                            : 'bg-[#E5E7EB] text-[#475569] border-[#D1D5DB]'
                        }`}
                      >
                        {p.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="text-xs font-bold text-[#0284C7]" onClick={() => setEditing(toForm(p))}>
                          Edit
                        </button>
                        <button type="button" className="text-xs font-bold text-[#475569]" onClick={() => void toggleVisibility(p)}>
                          Toggle visibility
                        </button>
                        <button type="button" className="text-xs font-bold text-[#B91C1C]" onClick={() => void remove(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-[14px] font-bold text-[#1E293B] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-white border-[1.5px] border-[#CBD5E1] rounded-lg text-[15px] font-medium"
      />
    </div>
  )
}
