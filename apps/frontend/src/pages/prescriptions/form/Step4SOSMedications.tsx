import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SOSMedicationModal } from './SOSMedicationModal'
import type { CreateSOSMedicationDto } from '@/api/prescriptions.api'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'

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

const INDICATION_LABELS: Record<string, string> = {
  DOR: 'Dor',
  FEBRE: 'Febre',
  ANSIEDADE: 'Ansiedade',
  AGITACAO: 'Agitação',
  NAUSEA: 'Náusea/Vômito',
  INSONIA: 'Insônia',
  OUTRO: 'Outro',
}

export function Step4SOSMedications() {
  const { watch, setValue } = useFormContext()
  const sosMedications = watch('sosMedications') || []

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingMedication, setEditingMedication] = useState<CreateSOSMedicationDto | null>(null)

  const handleAdd = () => {
    setEditingIndex(null)
    setEditingMedication(null)
    setIsModalOpen(true)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditingMedication(sosMedications[index])
    setIsModalOpen(true)
  }

  const handleDelete = (index: number) => {
    const newMedications = sosMedications.filter((_, i) => i !== index)
    setValue('sosMedications', newMedications)
  }

  const handleSave = (medication: CreateSOSMedicationDto) => {
    if (editingIndex !== null) {
      const newMedications = [...sosMedications]
      newMedications[editingIndex] = medication
      setValue('sosMedications', newMedications)
    } else {
      setValue('sosMedications', [...sosMedications, medication])
    }
    setIsModalOpen(false)
    setEditingIndex(null)
    setEditingMedication(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold mb-2">Medicações SOS</h2>
          <p className="text-sm text-muted-foreground">
            Medicamentos para uso conforme necessário (Se Necessário)
          </p>
        </div>
        <Button onClick={handleAdd} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar SOS
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Medicações SOS são administradas apenas quando necessário, conforme
          indicação específica. Defina o intervalo mínimo entre doses e a dose
          máxima diária.
        </AlertDescription>
      </Alert>

      {sosMedications.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma medicação SOS adicionada. Clique em "Adicionar SOS" para incluir medicamentos
            de uso conforme necessário.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {sosMedications.map((medication: CreateSOSMedicationDto, index: number) => (
            <Card key={index} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-severity-warning/10">
                        <AlertCircle className="h-5 w-5 text-severity-warning" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground">
                            {medication.name}
                          </h3>
                          <Badge variant="outline" className="bg-severity-warning/5 text-severity-warning/80 border-severity-warning/30">
                            SOS
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatMedicationPresentation(medication.presentation)} - {medication.concentration}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Indicação:</span>
                        <p className="font-medium text-foreground">
                          {INDICATION_LABELS[medication.indication] || medication.indication}
                        </p>
                      </div>
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
                        <span className="text-muted-foreground">Intervalo Mínimo:</span>
                        <p className="font-medium text-foreground">{medication.minInterval}</p>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-severity-warning/5 border border-severity-warning/30 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-severity-warning" />
                        <span className="text-sm font-semibold text-severity-warning/90">
                          Dose Máxima Diária: {medication.maxDailyDoses}x
                        </span>
                      </div>
                      {medication.indicationDetails && (
                        <p className="text-sm text-severity-warning/90">
                          Detalhes: {medication.indicationDetails}
                        </p>
                      )}
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

      <SOSMedicationModal
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
