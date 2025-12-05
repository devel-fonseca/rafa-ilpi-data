import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, Plus, Edit, Trash2 } from 'lucide-react'
import { useClinicalProfile } from '@/hooks/useClinicalProfiles'
import {
  useAllergiesByResident,
  useDeleteAllergy,
} from '@/hooks/useAllergies'
import {
  useConditionsByResident,
  useDeleteCondition,
} from '@/hooks/useConditions'
import {
  useDietaryRestrictionsByResident,
  useDeleteDietaryRestriction,
} from '@/hooks/useDietaryRestrictions'
import { ClinicalProfileModal } from './ClinicalProfileModal'
import { AllergyModal } from './AllergyModal'
import { ConditionModal } from './ConditionModal'
import { DietaryRestrictionModal } from './DietaryRestrictionModal'
import type { Allergy } from '@/api/allergies.api'
import type { Condition } from '@/api/conditions.api'
import type { DietaryRestriction } from '@/api/dietaryRestrictions.api'
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

interface ClinicalProfileTabProps {
  residentId: string
}

const ALLERGY_SEVERITY_LABELS = {
  LEVE: { label: 'Leve', variant: 'default' as const },
  MODERADA: { label: 'Moderada', variant: 'warning' as const },
  GRAVE: { label: 'Grave', variant: 'danger' as const },
  ANAFILAXIA: { label: 'Anafilaxia', variant: 'danger' as const },
}

const RESTRICTION_TYPE_LABELS = {
  ALERGIA_ALIMENTAR: 'Alergia Alimentar',
  INTOLERANCIA: 'Intolerância',
  RESTRICAO_MEDICA: 'Restrição Médica',
  RESTRICAO_RELIGIOSA: 'Restrição Religiosa',
  DISFAGIA: 'Disfagia',
  DIABETES: 'Diabetes',
  HIPERTENSAO: 'Hipertensão',
  OUTRA: 'Outra',
}

export function ClinicalProfileTab({ residentId }: ClinicalProfileTabProps) {
  // Estados dos modais
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [allergyModalOpen, setAllergyModalOpen] = useState(false)
  const [conditionModalOpen, setConditionModalOpen] = useState(false)
  const [restrictionModalOpen, setRestrictionModalOpen] = useState(false)

  // Estados para edição
  const [editingAllergy, setEditingAllergy] = useState<Allergy | undefined>()
  const [editingCondition, setEditingCondition] = useState<Condition | undefined>()
  const [editingRestriction, setEditingRestriction] = useState<DietaryRestriction | undefined>()

  // Estados para delete
  const [deletingAllergy, setDeletingAllergy] = useState<Allergy | undefined>()
  const [deletingCondition, setDeletingCondition] = useState<Condition | undefined>()
  const [deletingRestriction, setDeletingRestriction] = useState<DietaryRestriction | undefined>()

  // Buscar dados clínicos
  const { data: clinicalProfile, isLoading: profileLoading } = useClinicalProfile(residentId)
  const { data: allergies = [], isLoading: allergiesLoading } = useAllergiesByResident(residentId)
  const { data: conditions = [], isLoading: conditionsLoading } = useConditionsByResident(residentId)
  const {
    data: dietaryRestrictions = [],
    isLoading: restrictionsLoading,
  } = useDietaryRestrictionsByResident(residentId)

  // Mutations para delete
  const deleteAllergyMutation = useDeleteAllergy()
  const deleteConditionMutation = useDeleteCondition()
  const deleteRestrictionMutation = useDeleteDietaryRestriction()

  const isLoading =
    profileLoading || allergiesLoading || conditionsLoading || restrictionsLoading

  // Handlers para abrir modais de criação
  const handleCreateAllergy = () => {
    setEditingAllergy(undefined)
    setAllergyModalOpen(true)
  }

  const handleCreateCondition = () => {
    setEditingCondition(undefined)
    setConditionModalOpen(true)
  }

  const handleCreateRestriction = () => {
    setEditingRestriction(undefined)
    setRestrictionModalOpen(true)
  }

  // Handlers para abrir modais de edição
  const handleEditAllergy = (allergy: Allergy) => {
    setEditingAllergy(allergy)
    setAllergyModalOpen(true)
  }

  const handleEditCondition = (condition: Condition) => {
    setEditingCondition(condition)
    setConditionModalOpen(true)
  }

  const handleEditRestriction = (restriction: DietaryRestriction) => {
    setEditingRestriction(restriction)
    setRestrictionModalOpen(true)
  }

  // Handlers para delete
  const handleConfirmDeleteAllergy = async () => {
    if (!deletingAllergy) return
    await deleteAllergyMutation.mutateAsync(deletingAllergy.id)
    setDeletingAllergy(undefined)
  }

  const handleConfirmDeleteCondition = async () => {
    if (!deletingCondition) return
    await deleteConditionMutation.mutateAsync(deletingCondition.id)
    setDeletingCondition(undefined)
  }

  const handleConfirmDeleteRestriction = async () => {
    if (!deletingRestriction) return
    await deleteRestrictionMutation.mutateAsync(deletingRestriction.id)
    setDeletingRestriction(undefined)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Perfil Clínico Atual */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Perfil Clínico</CardTitle>
                <CardDescription>Estado de saúde e aspectos clínicos atuais</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setProfileModalOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                {clinicalProfile ? 'Editar' : 'Criar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {clinicalProfile ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Estado de Saúde</div>
                  <div className="mt-1 text-sm">
                    {clinicalProfile.healthStatus || (
                      <span className="text-muted-foreground italic">Não informado</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Necessidades Especiais
                  </div>
                  <div className="mt-1 text-sm">
                    {clinicalProfile.specialNeeds || (
                      <span className="text-muted-foreground italic">Não informado</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Aspectos Funcionais
                  </div>
                  <div className="mt-1 text-sm">
                    {clinicalProfile.functionalAspects || (
                      <span className="text-muted-foreground italic">Não informado</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhum perfil clínico cadastrado
                </p>
                <Button size="sm" onClick={() => setProfileModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Perfil Clínico
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alergias */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alergias</CardTitle>
                <CardDescription>
                  Registro de alergias e reações adversas
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleCreateAllergy}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Alergia
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {allergies.length > 0 ? (
              <div className="space-y-3">
                {allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{allergy.substance}</span>
                        {allergy.severity && (
                          <Badge variant={ALLERGY_SEVERITY_LABELS[allergy.severity].variant}>
                            {ALLERGY_SEVERITY_LABELS[allergy.severity].label}
                          </Badge>
                        )}
                      </div>
                      {allergy.reaction && (
                        <p className="text-sm text-muted-foreground mb-1">{allergy.reaction}</p>
                      )}
                      {allergy.notes && (
                        <p className="text-xs text-muted-foreground italic">{allergy.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditAllergy(allergy)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingAllergy(allergy)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhuma alergia cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condições Crônicas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Condições Crônicas e Diagnósticos</CardTitle>
                <CardDescription>
                  Registro de condições médicas e comorbidades
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleCreateCondition}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Condição
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {conditions.length > 0 ? (
              <div className="space-y-3">
                {conditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{condition.condition}</span>
                        {condition.icdCode && (
                          <Badge variant="outline" className="text-xs">
                            CID: {condition.icdCode}
                          </Badge>
                        )}
                      </div>
                      {condition.notes && (
                        <p className="text-sm text-muted-foreground">{condition.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCondition(condition)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingCondition(condition)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhuma condição cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restrições Alimentares */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Restrições Alimentares</CardTitle>
                <CardDescription>
                  Restrições dietéticas e orientações nutricionais
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleCreateRestriction}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Restrição
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dietaryRestrictions.length > 0 ? (
              <div className="space-y-3">
                {dietaryRestrictions.map((restriction) => (
                  <div
                    key={restriction.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          {RESTRICTION_TYPE_LABELS[restriction.restrictionType]}
                        </Badge>
                        <span className="font-medium">{restriction.description}</span>
                      </div>
                      {restriction.notes && (
                        <p className="text-sm text-muted-foreground">{restriction.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditRestriction(restriction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingRestriction(restriction)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Nenhuma restrição cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modais de Edição/Criação */}
      <ClinicalProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        residentId={residentId}
        profile={clinicalProfile}
      />

      <AllergyModal
        open={allergyModalOpen}
        onOpenChange={setAllergyModalOpen}
        residentId={residentId}
        allergy={editingAllergy}
      />

      <ConditionModal
        open={conditionModalOpen}
        onOpenChange={setConditionModalOpen}
        residentId={residentId}
        condition={editingCondition}
      />

      <DietaryRestrictionModal
        open={restrictionModalOpen}
        onOpenChange={setRestrictionModalOpen}
        residentId={residentId}
        restriction={editingRestriction}
      />

      {/* AlertDialogs para Confirmação de Delete */}
      <AlertDialog
        open={!!deletingAllergy}
        onOpenChange={(open) => !open && setDeletingAllergy(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Alergia</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a alergia a "{deletingAllergy?.substance}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteAllergy}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingCondition}
        onOpenChange={(open) => !open && setDeletingCondition(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Condição Crônica</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a condição "{deletingCondition?.condition}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCondition}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingRestriction}
        onOpenChange={(open) => !open && setDeletingRestriction(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Restrição Alimentar</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a restrição "{deletingRestriction?.description}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteRestriction}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
