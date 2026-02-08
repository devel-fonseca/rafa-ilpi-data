// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - Painel do Residente (Gestão Unificada)
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react'
import { Page, PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Clock, UserX, UserCircle } from 'lucide-react'
import { useResidents, useResident } from '@/hooks/useResidents'
import { useAllergiesByResident } from '@/hooks/useAllergies'
import { useConditionsByResident } from '@/hooks/useConditions'
import { useDietaryRestrictionsByResident } from '@/hooks/useDietaryRestrictions'
import { useClinicalProfile } from '@/hooks/useClinicalProfiles'
import { useVaccinationsByResident } from '@/hooks/useVaccinations'
import { useQuery } from '@tanstack/react-query'
import { prescriptionsApi } from '@/api/prescriptions.api'
import { tenantKey } from '@/lib/query-keys'
import { formatDate } from '@/utils/formatters'
import { extractDateOnly } from '@/utils/dateHelpers'
import {
  BasicInfoView,
  ClinicalProfileView,
  ConditionsView,
  AllergiesView,
  DietaryView,
  VaccinationsView,
  MedicationsView,
  RoutineScheduleView,
} from '@/components/resident-panel'
import type { Resident } from '@/api/residents.api'

// ========== HELPERS ==========

function calculateAge(birthDate: string): number {
  const birthDateOnly = extractDateOnly(birthDate)
  const birth = new Date(`${birthDateOnly}T12:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'secondary' {
  switch (status?.toUpperCase()) {
    case 'ATIVO':
      return 'success'
    case 'INATIVO':
      return 'warning'
    default:
      return 'secondary'
  }
}

// ========== TYPES ==========

type StatusFilter = 'active' | 'inactive' | 'recent'
type ViewType = 'basic' | 'clinical' | 'conditions' | 'allergies' | 'dietary' | 'vaccinations' | 'medications' | 'routine'

// ========== CONSTANTS ==========

const STATUS_FILTERS = [
  { value: 'recent' as StatusFilter, label: 'Recentes', icon: Clock },
  { value: 'active' as StatusFilter, label: 'Ativos', icon: Users },
  { value: 'inactive' as StatusFilter, label: 'Inativos', icon: UserX },
]

const VIEW_OPTIONS = [
  { value: 'basic' as ViewType, label: 'Informações Básicas' },
  { value: 'clinical' as ViewType, label: 'Perfil Clínico' },
  { value: 'conditions' as ViewType, label: 'Condições Crônicas' },
  { value: 'allergies' as ViewType, label: 'Alergias' },
  { value: 'dietary' as ViewType, label: 'Restrições Alimentares' },
  { value: 'vaccinations' as ViewType, label: 'Vacinações' },
  { value: 'medications' as ViewType, label: 'Medicamentos' },
  { value: 'routine' as ViewType, label: 'Programação da Rotina' },
]

// ========== COMPONENT ==========

export default function ResidentPanelPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('recent')
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewType>('basic')

  // Buscar lista de residentes
  const { residents, isLoading: isLoadingList } = useResidents({ limit: 100 })

  // Buscar residente selecionado
  const { data: selectedResident, isLoading: isLoadingResident } = useResident(
    selectedResidentId || undefined
  )

  const isClinicalView = activeView === 'clinical'
  const isAllergiesView = activeView === 'allergies'
  const isConditionsView = activeView === 'conditions'
  const isDietaryView = activeView === 'dietary'
  const isVaccinationsView = activeView === 'vaccinations'
  const isMedicationsView = activeView === 'medications'

  // Buscar dados clínicos do residente selecionado
  const { data: clinicalProfile, isLoading: isLoadingProfile } = useClinicalProfile(
    selectedResidentId || undefined,
    isClinicalView
  )
  const { data: allergies = [], isLoading: isLoadingAllergies } = useAllergiesByResident(
    selectedResidentId || undefined,
    isAllergiesView
  )
  const { data: conditions = [], isLoading: isLoadingConditions } = useConditionsByResident(
    selectedResidentId || undefined,
    isConditionsView
  )
  const { data: dietaryRestrictions = [], isLoading: isLoadingRestrictions } = useDietaryRestrictionsByResident(
    selectedResidentId || undefined,
    isDietaryView
  )
  const { data: vaccinations = [], isLoading: isLoadingVaccinations } = useVaccinationsByResident(
    selectedResidentId || undefined,
    isVaccinationsView
  )
  const { data: prescriptionsData, isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: tenantKey('prescriptions', 'resident-panel', selectedResidentId),
    queryFn: () => prescriptionsApi.findAll({
      residentId: selectedResidentId!,
      isActive: true,
      limit: 50,
    }),
    enabled: !!selectedResidentId && isMedicationsView,
  })
  const prescriptions = prescriptionsData?.data || []

  const isLoadingActiveViewData = (
    (isClinicalView && isLoadingProfile) ||
    (isAllergiesView && isLoadingAllergies) ||
    (isConditionsView && isLoadingConditions) ||
    (isDietaryView && isLoadingRestrictions) ||
    (isVaccinationsView && isLoadingVaccinations) ||
    (isMedicationsView && isLoadingPrescriptions)
  )

  // Filtrar residentes por status
  const filteredResidents = useMemo(() => {
    if (!residents) return []

    let filtered: Resident[] = []

    switch (statusFilter) {
      case 'active':
        filtered = residents.filter((r) => r.status === 'Ativo')
        break
      case 'inactive':
        filtered = residents.filter((r) => r.status !== 'Ativo')
        break
      case 'recent':
        // Ordenar por data de criação (cadastro mais recente)
        filtered = [...residents]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20)
        break
    }

    return filtered
  }, [residents, statusFilter])

  // Limpar seleção quando o residente selecionado não está mais na lista filtrada
  useEffect(() => {
    if (!selectedResidentId) return

    const isSelectedInList = filteredResidents.some((r) => r.id === selectedResidentId)
    if (!isSelectedInList) {
      setSelectedResidentId(null)
    }
  }, [filteredResidents, selectedResidentId])

  // Renderizar view baseado na seleção
  const renderContentView = () => {
    if (!selectedResident) return null

    switch (activeView) {
      case 'basic':
        return <BasicInfoView resident={selectedResident} />
      case 'clinical':
        return <ClinicalProfileView clinicalProfile={clinicalProfile} resident={selectedResident} />
      case 'conditions':
        return <ConditionsView conditions={conditions} />
      case 'allergies':
        return <AllergiesView allergies={allergies} />
      case 'dietary':
        return <DietaryView dietaryRestrictions={dietaryRestrictions} />
      case 'vaccinations':
        return <VaccinationsView vaccinations={vaccinations} />
      case 'medications':
        return <MedicationsView prescriptions={prescriptions} />
      case 'routine':
        return <RoutineScheduleView residentId={selectedResidentId!} />
      default:
        return null
    }
  }

  // ========== RENDER ==========

  return (
    <Page maxWidth="full">
      <PageHeader
        title="Painel do Residente"
        subtitle="Visualização centralizada de informações do residente"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:items-start">
        {/* ===== SIDEBAR - Lista de Residentes ===== */}
        <Card className="h-[500px] overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col overflow-hidden">
            {/* Filtros por Status */}
            <div className="flex border-b">
              {STATUS_FILTERS.map((filter, index) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setStatusFilter(filter.value)
                    setSelectedResidentId(null)
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  } ${index === 0 ? 'rounded-tl-lg' : ''} ${index === STATUS_FILTERS.length - 1 ? 'rounded-tr-lg' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Lista de Residentes */}
            <ScrollArea className="flex-1 w-full">
              {isLoadingList ? (
                <LoadingSpinner size="sm" className="py-8" />
              ) : filteredResidents.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum residente"
                  description="Nenhum residente encontrado com este filtro"
                  className="py-8"
                />
              ) : (
                <div className="p-3 pr-4 space-y-1">
                  {filteredResidents.map((resident) => (
                    <button
                      key={resident.id}
                      onClick={() => setSelectedResidentId(resident.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedResidentId === resident.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <PhotoViewer
                        photoUrl={resident.fotoUrl}
                        altText={resident.fullName}
                        size="xs"
                        rounded
                        className="flex-shrink-0"
                      />
                      <span
                        className="font-medium text-sm overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ display: 'block', maxWidth: 'calc(100% - 48px)' }}
                      >
                        {resident.fullName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ===== CONTEÚDO PRINCIPAL ===== */}
        <Card>
          <CardContent className="p-0">
            {selectedResidentId && (isLoadingResident || !selectedResident) ? (
              <div className="p-8">
                <LoadingSpinner size="md" message="Carregando residente..." />
              </div>
            ) : selectedResident ? (
              <>
                {/* Header com Nome, Info e Dropdown */}
                <div className="flex items-start justify-between p-4 border-b">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedResident.fullName}</h2>
                      <StatusBadge variant={getStatusBadgeVariant(selectedResident.status)}>
                        {selectedResident.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedResident.birthDate && `${calculateAge(selectedResident.birthDate)} anos`}
                      {selectedResident.admissionDate && ' • '}
                      {selectedResident.admissionDate && `Admitido em ${formatDate(selectedResident.admissionDate)}`}
                      {selectedResident.dischargeDate && ` • Desligamento em ${formatDate(selectedResident.dischargeDate)}`}
                    </p>
                  </div>
                  <Select value={activeView} onValueChange={(v) => setActiveView(v as ViewType)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conteúdo Dinâmico */}
                <div className="p-4">
                  {isLoadingResident || isLoadingActiveViewData ? (
                    <LoadingSpinner size="md" message="Carregando dados..." />
                  ) : (
                    renderContentView()
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                icon={UserCircle}
                title="Selecione um residente"
                description="Escolha um residente na lista ao lado para ver suas informações"
                className="py-16"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
