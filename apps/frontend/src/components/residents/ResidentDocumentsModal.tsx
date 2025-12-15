import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ResidentDocuments } from './ResidentDocuments'

interface ResidentDocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  residentId: string
  residentName: string
}

export function ResidentDocumentsModal({
  isOpen,
  onClose,
  residentId,
  residentName,
}: ResidentDocumentsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos do Residente</DialogTitle>
          <DialogDescription>
            Gerencie os documentos de <strong>{residentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <ResidentDocuments residentId={residentId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
