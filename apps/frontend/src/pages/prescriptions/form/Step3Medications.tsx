import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Plus, Edit2, Trash2, Pill } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MedicationModal } from './MedicationModal'
import type { CreateMedicationDto } from '@/api/prescriptions.api'
import { formatDateOnlySafe } from '@/utils/dateHelpers'

const ROUTE_LABELS: Record<string, string> = {
  VO: 'Via Oral',
  IM: 'Intramuscular',
  EV: 'Endovenosa',
  SC: 'Subcutânea',
  TOPICA: 'Tópica',
  SL: 'Sublingual',
  RETAL: 'Retal',
  OCULAR: 'Ocular',
  NASAL: 'Nasal',
  INALATORIA: 'Inalatória',
  OUTRA: 'Outra',
}

const FREQUENCY_LABELS: Record<string, string> = {
  UMA_VEZ_DIA: '1x ao dia',
  DUAS_VEZES_DIA: '2x ao dia',
  SEIS_SEIS_H: '6/6h',
  OITO_OITO_H: '8/8h',
  DOZE_DOZE_H: '12/12h',
  PERSONALIZADO: 'Personalizado',
}

export function Step3Medications() {
  const { watch, setValue } = useFormContext()
  const medications = watch('medications') || []

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingMedication, setEditingMedication] = useState<CreateMedicationDto | null>(null)

  const handleAdd = () => {
    setEditingIndex(null)
    setEditingMedication(null)
    setIsModalOpen(true)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditingMedication(medications[index])
    setIsModalOpen(true)
  }

  const handleDelete = (index: number) => {
    const newMedications = medications.filter((_: any, i: number) => i !== index)
    setValue('medications', newMedications)
  }

  const handleSave = (medication: CreateMedicationDto) => {
    if (editingIndex !== null) {
      // Editando
      const newMedications = [...medications]
      newMedications[editingIndex] = medication
      setValue('medications', newMedications)
    } else {
      // Adicionando
      setValue('medications', [...medications, medication])
    }
    setIsModalOpen(false)
    setEditingIndex(null)
    setEditingMedication(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold mb-2">Medicamentos Contínuos</h2>
          <p className="text-sm text-muted-foreground">
            Adicione os medicamentos de uso contínuo com horários programados
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Medicamento
        </Button>
      </div>

      {medications.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhum medicamento adicionado. Clique em "Adicionar Medicamento" para começar.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {medications.map((medication: CreateMedicationDto, index: number) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {medication.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {medication.presentation} - {medication.concentration}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {medication.isControlled && (
                          <Badge variant="outline" className="bg-medication-controlled/5 text-medication-controlled/80 border-medication-controlled/30">
                            Controlado
                          </Badge>
                        )}
                        {medication.isHighRisk && (
                          <Badge variant="outline" className="bg-danger/5 text-danger/80 border-danger/30">
                            Alto Risco
                          </Badge>
                        )}
                        {medication.requiresDoubleCheck && (
                          <Badge variant="outline" className="bg-severity-warning/5 text-severity-warning/80 border-severity-warning/30">
                            Dupla Checagem
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Dose:</span>
                        <p className="font-medium text-foreground">{medication.dose}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Via:</span>
                        <p className="font-medium text-foreground">
                          {ROUTE_LABELS[medication.route] || medication.route}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frequência:</span>
                        <p className="font-medium text-foreground">
                          {FREQUENCY_LABELS[medication.frequency] || medication.frequency}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Horários:</span>
                        <p className="font-medium text-foreground">
                          {medication.scheduledTimes.join(', ')}
                        </p>
                      </div>
                    </div>

                    {medication.instructions && (
                      <div className="mt-3 p-2 bg-muted/50 rounded border border-border">
                        <p className="text-sm text-foreground/80">
                          <span className="font-medium">Instruções:</span> {medication.instructions}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Início: {formatDateOnlySafe(medication.startDate)}
                      </span>
                      {medication.endDate && (
                        <span>
                          Término: {formatDateOnlySafe(medication.endDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(index)}
                      className="text-danger hover:text-danger/80 hover:bg-danger/5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para adicionar/editar medicamento */}
      <MedicationModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingIndex(null)
          setEditingMedication(null)
        }}
        onSave={handleSave}
        initialData={editingMedication}
        isEditing={editingIndex !== null}
      />
    </div>
  )
}
