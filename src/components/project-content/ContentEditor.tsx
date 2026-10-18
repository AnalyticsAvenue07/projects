import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

export interface BulletsEditorProps {
  bullets: string[]
  onChange: (bullets: string[]) => void
  label?: string
  placeholder?: string
}

export function BulletsEditor({
  bullets,
  onChange,
  label = 'Bullet Points',
  placeholder = 'Add a key capability or bullet point...',
}: BulletsEditorProps) {
  const [newBulletText, setNewBulletText] = useState('')

  const handleAdd = () => {
    const trimmed = newBulletText.trim()
    if (!trimmed) return
    onChange([...bullets, trimmed])
    setNewBulletText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleUpdate = (index: number, value: string) => {
    const updated = [...bullets]
    updated[index] = value
    onChange(updated)
  }

  const handleRemove = (index: number) => {
    onChange(bullets.filter((_, i) => i !== index))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...bullets]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === bullets.length - 1) return
    const updated = [...bullets]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-slate-700">{label}</Label>
        <span className="text-xs text-slate-500">{bullets.length} items</span>
      </div>

      {bullets.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {bullets.map((bullet, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 transition hover:border-slate-300"
            >
              <span className="text-xs font-semibold text-slate-400 w-5 text-center shrink-0">
                {idx + 1}.
              </span>
              <Input
                value={bullet}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                className="h-8 flex-1 bg-white text-sm"
                placeholder="Bullet text"
              />
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-700"
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                  aria-label="Move bullet up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-700"
                  disabled={idx === bullets.length - 1}
                  onClick={() => handleMoveDown(idx)}
                  aria-label="Move bullet down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemove(idx)}
                  aria-label="Remove bullet"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new bullet row */}
      <div className="flex items-center gap-2">
        <Input
          value={newBulletText}
          onChange={(e) => setNewBulletText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-sm rounded-xl"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!newBulletText.trim()}
          variant="outline"
          className="shrink-0 gap-1.5 rounded-xl border-[#0F766E]/40 text-[#0F766E] hover:bg-[#0F766E]/10"
        >
          <Plus className="h-4 w-4" />
          Add Bullet
        </Button>
      </div>
    </div>
  )
}
