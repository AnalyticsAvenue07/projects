import { useEffect, useState } from 'react'
import { RotateCcw, Save, X } from 'lucide-react'
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
import type { OverviewSection } from '@/types/projectContent'

export interface OverviewSectionEditorProps {
  open: boolean
  section: OverviewSection | null
  onOpenChange: (open: boolean) => void
  onSave: (
    sectionId: string,
    data: {
      title: string
      eyebrow?: string
      description?: string
      content?: string
      bullets?: string[]
    }
  ) => Promise<void>
  onReset?: (sectionId: string) => Promise<void>
}

export function OverviewSectionEditor({
  open,
  section,
  onOpenChange,
  onSave,
  onReset,
}: OverviewSectionEditorProps) {
  const [title, setTitle] = useState('')
  const [eyebrow, setEyebrow] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [bullets, setBullets] = useState<string[]>([])

  const [initialState, setInitialState] = useState<{
    title: string
    eyebrow: string
    description: string
    content: string
    bullets: string[]
  }>({
    title: '',
    eyebrow: '',
    description: '',
    content: '',
    bullets: [],
  })

  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when section changes or dialog opens
  useEffect(() => {
    if (section && open) {
      const init = {
        title: section.title || '',
        eyebrow: section.eyebrow || '',
        description: section.description || '',
        content: section.content || '',
        bullets: section.bullets ? [...section.bullets] : [],
      }
      setTitle(init.title)
      setEyebrow(init.eyebrow)
      setDescription(init.description)
      setContent(init.content)
      setBullets(init.bullets)
      setInitialState(init)
      setValidationError(null)
      setShowDiscardConfirm(false)
      setShowResetConfirm(false)
    }
  }, [section, open])

  // Check if form is dirty
  const isDirty =
    title !== initialState.title ||
    eyebrow !== initialState.eyebrow ||
    description !== initialState.description ||
    content !== initialState.content ||
    JSON.stringify(bullets) !== JSON.stringify(initialState.bullets)

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

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Section title is required.')
      return
    }

    if (trimmedTitle.length > 100) {
      setValidationError('Title cannot exceed 100 characters.')
      return
    }

    setValidationError(null)
    setIsSubmitting(true)

    try {
      if (section) {
        await onSave(section.id, {
          title: trimmedTitle,
          eyebrow: eyebrow.trim() || undefined,
          description: description.trim() || undefined,
          content: content.trim() || undefined,
          bullets: bullets.map((b) => b.trim()).filter(Boolean),
        })
      }
      onOpenChange(false)
    } catch {
      setValidationError('Unable to save changes. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmReset = async () => {
    if (!section || !onReset) return
    setIsSubmitting(true)
    try {
      await onReset(section.id)
      setShowResetConfirm(false)
      onOpenChange(false)
    } catch {
      setValidationError('Unable to restore original content. Please try again.')
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
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  Edit Section
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  Modify details for "{section?.title || 'Overview Section'}". Changes are saved locally.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {validationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-medium">
              {validationError}
            </div>
          )}

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="sec-title" className="text-sm font-semibold text-slate-700">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sec-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (validationError) setValidationError(null)
                }}
                placeholder="e.g. Capabilities, Purpose, Pricing Formula"
                className="rounded-xl text-sm"
              />
            </div>

            {/* Eyebrow */}
            <div className="space-y-1.5">
              <Label htmlFor="sec-eyebrow" className="text-sm font-semibold text-slate-700">
                Eyebrow / Category Tag (optional)
              </Label>
              <Input
                id="sec-eyebrow"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                placeholder="e.g. Overview, Intelligence, Formula"
                className="rounded-xl text-sm"
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <Label htmlFor="sec-desc" className="text-sm font-semibold text-slate-700">
                Short Description (optional)
              </Label>
              <Input
                id="sec-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary or subtitle..."
                className="rounded-xl text-sm"
              />
            </div>

            {/* Main Content */}
            <div className="space-y-1.5">
              <Label htmlFor="sec-content" className="text-sm font-semibold text-slate-700">
                Main Content Paragraphs
              </Label>
              <Textarea
                id="sec-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Detailed explanations, formulas, or methodology paragraphs..."
                rows={5}
                className="rounded-xl text-sm font-normal leading-relaxed resize-y"
              />
              <p className="text-xs text-slate-400">
                Line breaks and formatting will be preserved in the overview card.
              </p>
            </div>

            {/* Bullets Editor */}
            <BulletsEditor
              bullets={bullets}
              onChange={setBullets}
              label="Key Points / Bullet Items"
              placeholder="Add key feature, capability, or impact item..."
            />
          </div>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4 gap-3">
            <div>
              {Boolean(onReset && section && !section.isCustom && section.isOverridden) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isSubmitting}
                  className="gap-2 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
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
                onClick={handleSave}
                disabled={isSubmitting}
                className="gap-2 rounded-xl bg-[#0F766E] font-semibold text-white hover:bg-[#0D5F58]"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              Discard unsaved changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              You have unsaved edits in this section. If you discard now, your changes will be lost.
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
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to default confirmation dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              Restore original content?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Restore the original built-in application content for "{section?.title}"? Your customized override for this section will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-slate-200 hover:bg-slate-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="rounded-xl bg-[#0F766E] font-semibold text-white hover:bg-[#0D5F58]"
            >
              Restore Original
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
