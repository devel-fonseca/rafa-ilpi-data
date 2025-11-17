import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Plus, Edit2, Trash2, Pill } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MedicationModal } from './MedicationModal'
import type { CreateMedicationDto } from '@/api/prescriptions.api'

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
          <p className="text-sm text-gray-600">
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
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                        <Pill className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {medication.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {medication.presentation} - {medication.concentration}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {medication.isControlled && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                            Controlado
                          </Badge>
                        )}
                        {medication.isHighRisk && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            Alto Risco
                          </Badge>
                        )}
                        {medication.requiresDoubleCheck && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                            Dupla Checagem
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Dose:</span>
                        <p className="font-medium text-gray-900">{medication.dose}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Via:</span>
                        <p className="font-medium text-gray-900">
                          {ROUTE_LABELS[medication.route] || medication.route}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Frequência:</span>
                        <p className="font-medium text-gray-900">
                          {FREQUENCY_LABELS[medication.frequency] || medication.frequency}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Horários:</span>
                        <p className="font-medium text-gray-900">
                          {medication.scheduledTimes.join(', ')}
                        </p>
                      </div>
                    </div>

                    {medication.instructions && (
                      <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Instruções:</span> {medication.instructions}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-4 text-xs text-gray-600">
                      <span>
                        Início: {new Date(medication.startDate).toLocaleDateString('pt-BR')}
                      </span>
                      {medication.endDate && (
                        <span>
                          Término: {new Date(medication.endDate).toLocaleDateString('pt-BR')}
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
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
