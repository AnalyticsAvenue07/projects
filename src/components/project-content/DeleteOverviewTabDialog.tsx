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

export interface DeleteOverviewTabDialogProps {
  open: boolean
  title: string
  itemType?: 'tab' | 'section'
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteOverviewTabDialog({
  open,
  title,
  itemType = 'tab',
  onOpenChange,
  onConfirm,
}: DeleteOverviewTabDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-slate-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-slate-900">
            Delete this custom {itemType}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
            This action will permanently remove <span className="font-semibold text-slate-800">"{title}"</span> and its saved content for this project. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="rounded-xl border-slate-200 hover:bg-slate-100">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700"
          >
            Delete {itemType === 'tab' ? 'Tab' : 'Section'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
