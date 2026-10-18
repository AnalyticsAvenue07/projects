import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { BulletsEditor } from './ContentEditor'

export interface AddOverviewTabDialogProps {
  open: boolean
  projectTitle?: string
  targetType?: 'tab' | 'section'
  onOpenChange: (open: boolean) => void
  onCreate: (data: {
    title: string
    eyebrow?: string
    description?: string
    content?: string
    bullets?: string[]
  }) => Promise<void>
}

export function AddOverviewTabDialog({
  open,
  projectTitle,
  targetType = 'tab',
  onOpenChange,
  onCreate,
}: AddOverviewTabDialogProps) {
  const [title, setTitle] = useState('')
  const [eyebrow, setEyebrow] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [bullets, setBullets] = useState<string[]>([])

  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setTitle('')
      setEyebrow('')
      setDescription('')
      setContent('')
      setBullets([])
      setValidationError(null)
      setShowDiscardConfirm(false)
    }
  }, [open])

  const isDirty = Boolean(title.trim() || eyebrow.trim() || description.trim() || content.trim() || bullets.length > 0)

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false)
    onOpenChange(false)
  }

  const handleCreate = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError(`Please enter a title for the new ${targetType}.`)
      return
    }

    if (trimmedTitle.length > 100) {
      setValidationError('Title cannot exceed 100 characters.')
      return
    }

    setValidationError(null)
    setIsSubmitting(true)

    try {
      await onCreate({
        title: trimmedTitle,
        eyebrow: eyebrow.trim() || undefined,
        description: description.trim() || undefined,
        content: content.trim() || undefined,
        bullets: bullets.map((b) => b.trim()).filter(Boolean),
      })
      onOpenChange(false)
    } catch {
      setValidationError(`Unable to create ${targetType}. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            handleAttemptClose()
          } else {
            onOpenChange(true)
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl p-6 sm:p-8"
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault()
              setShowDiscardConfirm(true)
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault()
              setShowDiscardConfirm(true)
            }
          }}
        >
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Add New Overview {targetType === 'tab' ? 'Tab' : 'Section'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              {targetType === 'tab'
                ? `Create a custom tab scoped strictly to ${projectTitle ? `"${projectTitle}"` : 'this project'}.`
                : `Add a new section inside the Overview area for ${projectTitle ? `"${projectTitle}"` : 'this project'}.`}
            </DialogDescription>
          </DialogHeader>

          {validationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-medium">
              {validationError}
            </div>
          )}

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="new-tab-title" className="text-sm font-semibold text-slate-700">
                {targetType === 'tab' ? 'Tab Title' : 'Section Title'}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-tab-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (validationError) setValidationError(null)
                }}
                placeholder="e.g. Commercial Strategy, Compliance Protocol, Architecture Notes"
                className="rounded-xl text-sm"
              />
            </div>

            {/* Eyebrow */}
            <div className="space-y-1.5">
              <Label htmlFor="new-tab-eyebrow" className="text-sm font-semibold text-slate-700">
                Eyebrow / Category Tag (optional)
              </Label>
              <Input
                id="new-tab-eyebrow"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                placeholder="e.g. Strategy, Operational Guidelines, Custom Analysis"
                className="rounded-xl text-sm"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <Label htmlFor="new-tab-desc" className="text-sm font-semibold text-slate-700">
                Short Description (optional)
              </Label>
              <Input
                id="new-tab-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary sentence..."
                className="rounded-xl text-sm"
              />
            </div>

            {/* Main Content */}
            <div className="space-y-1.5">
              <Label htmlFor="new-tab-content" className="text-sm font-semibold text-slate-700">
                Main Content
              </Label>
              <Textarea
                id="new-tab-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter rich details, explanations, mathematical formulations, or business notes..."
                rows={5}
                className="rounded-xl text-sm font-normal leading-relaxed resize-y"
              />
              <p className="text-xs text-slate-400">
                Paragraph line breaks will be preserved when rendered.
              </p>
            </div>

            {/* Bullets */}
            <BulletsEditor
              bullets={bullets}
              onChange={setBullets}
              label="Key Points / Bullet Items (optional)"
              placeholder="Add an actionable highlight or capability..."
            />
          </div>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end border-t border-slate-100 pt-4 gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={handleAttemptClose}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="gap-2 rounded-xl bg-[#0F766E] font-semibold text-white hover:bg-[#0D5F58]"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Creating...' : `Create ${targetType === 'tab' ? 'Tab' : 'Section'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              Discard unsaved {targetType}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              You entered information for a new {targetType}. If you discard now, your input will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-slate-200 hover:bg-slate-100">
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="rounded-xl bg-amber-600 font-semibold text-white hover:bg-amber-700"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
