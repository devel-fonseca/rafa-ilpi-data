import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionDetailsSheet } from '@/design-system/components'

interface ClinicalRecordSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  formId: string
  isLoading: boolean
  isEditing: boolean
  createActionLabel: string
  editActionLabel: string
  children: ReactNode
}

export function ClinicalRecordSheet({
  open,
  onOpenChange,
  title,
  description,
  formId,
  isLoading,
  isEditing,
  createActionLabel,
  editActionLabel,
  children,
}: ClinicalRecordSheetProps) {
  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      showDefaultClose={false}
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" form={formId} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? editActionLabel : createActionLabel}
          </Button>
        </>
      )}
    >
      {children}
    </ActionDetailsSheet>
  )
}
