import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ContinueCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onContinue: () => void
  onCancel?: () => void
}

export function ContinueCreationDialog({
  open,
  onOpenChange,
  title,
  description,
  onContinue,
  onCancel,
}: ContinueCreationDialogProps) {
  const handleCancel = () => {
    onOpenChange(false)
    onCancel?.()
  }

  const handleContinue = () => {
    onOpenChange(false)
    onContinue()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Não, obrigado</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>Sim, adicionar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}