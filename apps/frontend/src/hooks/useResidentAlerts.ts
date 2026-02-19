import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useResidents } from './useResidents'
import type { Resident } from '@/api/residents.api'
import { listResidentContracts } from '@/services/residentContractsApi'
import { tenantKey } from '@/lib/query-keys'
import { extractDateOnly } from '@/utils/dateHelpers'
import { subDays } from 'date-fns'

export interface ResidentAlert {
  type: 'critical' | 'warning' | 'info'
  title: string
  count: number
  description: string
  residents: Resident[]
  action: {
    label: string
    filter: string
  }
}

export interface ResidentMetrics {
  averageAge: number
  averageStayDays: number
  occupancyRate: number
  totalWithBed: number
  totalWithoutBed: number
}

export function useResidentAlerts() {
  // Buscar todos os residentes (com cache do React Query)
  const { residents, isLoading: isLoadingResidents, error } = useResidents({
    page: 1,
    limit: 1000,
  })

  // Buscar todos os contratos (com cache do React Query)
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: tenantKey('resident-contracts', 'list-all'),
    queryFn: () => listResidentContracts(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const isLoading = isLoadingResidents || isLoadingContracts

  const alerts = useMemo<ResidentAlert[]>(() => {
    if (!residents || residents.length === 0) return []

    const activeResidents = residents.filter((r) => r.status === 'Ativo')

    // Criar Set com IDs de residentes que possuem contrato vigente
    const residentsWithContract = new Set(
      contracts
        .filter((c) => c.status === 'VIGENTE')
        .map((c) => c.residentId)
    )

    // 🔴 ALERTAS CRÍTICOS
    const residentsWithoutBed = activeResidents.filter((r) => !r.bedId)
    const residentsWithoutLegalGuardian = activeResidents.filter(
      (r) => !r.legalGuardianName || r.legalGuardianName.trim() === ''
    )
    const hasValidEmergencyContact = (resident: Resident) => {
      if (!Array.isArray(resident.emergencyContacts) || resident.emergencyContacts.length === 0) {
        return false
      }

      return resident.emergencyContacts.some((contact) => {
        const name = contact?.name?.trim() || ''
        const phone = contact?.phone?.trim() || ''
        return name.length > 0 && phone.length > 0
      })
    }

    const residentsWithoutEmergencyContact = activeResidents.filter(
      (r) => !hasValidEmergencyContact(r)
    )
    const residentsWithIncompleteData = activeResidents.filter((r) => {
      const requiredFields = ['cpf', 'admissionDate', 'birthDate']
      return requiredFields.some((field) => !r[field as keyof Resident])
    })
    const residentsWithoutContract = activeResidents.filter(
      (r) => !residentsWithContract.has(r.id)
    )

    // 🟡 AVISOS
    const residentsWithoutPhoto = activeResidents.filter((r) => !r.fotoUrl)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const ninetyDaysAgo = subDays(today, 90)
    const residentsWithoutRecentAnthropometry = activeResidents.filter((r) => {
      const latestMeasurementDate =
        r.latestAnthropometry?.measurementDate || r.latestAnthropometry?.createdAt

      if (!latestMeasurementDate) return true

      const dayKey = extractDateOnly(latestMeasurementDate)
      const measurementDate = new Date(`${dayKey}T00:00:00`)
      return measurementDate < ninetyDaysAgo
    })

    // 🔵 INFORMATIVOS
    const currentMonth = new Date().getMonth()
    const birthdaysThisMonth = activeResidents.filter((r) => {
      if (!r.birthDate) return false
      const birthMonth = new Date(r.birthDate).getMonth()
      return birthMonth === currentMonth
    }).sort((a, b) => {
      const daysInCurrentMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate()
      const todayDay = today.getDate()

      const getBirthDay = (birthDate?: string) => {
        if (!birthDate) return Number.MAX_SAFE_INTEGER
        const dayKey = extractDateOnly(birthDate)
        const [, , day] = dayKey.split('-').map(Number)
        return Number.isFinite(day) ? day : Number.MAX_SAFE_INTEGER
      }

      const dayA = getBirthDay(a.birthDate)
      const dayB = getBirthDay(b.birthDate)

      const distanceA = dayA >= todayDay ? dayA - todayDay : dayA + daysInCurrentMonth - todayDay
      const distanceB = dayB >= todayDay ? dayB - todayDay : dayB + daysInCurrentMonth - todayDay

      return distanceA - distanceB
    })

    // 📅 ADMISSÕES RECENTES
    // IMPORTANTE: Este alerta usa admissionDate (data de entrada na ILPI), não createdAt (data de cadastro no sistema).
    // Isso permite cadastrar residentes com datas retroativas para digitalização de registros históricos.
    // Exemplo: Um residente admitido em 2025-11-10 mas cadastrado hoje não aparecerá neste alerta.
    // Para ver cadastros recentes (independente da data de admissão), use "Residentes Recentes" que ordena por createdAt.

    // Normalizar thirtyDaysAgo para meia-noite (remover horas/minutos/segundos)
    // Isso garante comparação justa: "2025-11-10 00:00" vs "2025-12-20 00:00" (sem considerar horas)
    const thirtyDaysAgo = subDays(today, 30)

    const recentAdmissions = residents.filter((r) => {
      if (!r.admissionDate) return false
      // Usar extractDateOnly para evitar problemas de timezone (padrão DATETIME_STANDARD.md)
      const dayKey = extractDateOnly(r.admissionDate)
      const admissionDate = new Date(dayKey + 'T00:00:00')
      return admissionDate >= thirtyDaysAgo
    })

    const alertsList: ResidentAlert[] = []

    // Adicionar alertas críticos
    if (residentsWithoutBed.length > 0) {
      alertsList.push({
        type: 'critical',
        title: 'Sem leito atribuído',
        count: residentsWithoutBed.length,
        description: 'Residentes ativos sem acomodação definida',
        residents: residentsWithoutBed,
        action: {
          label: 'Atribuir leitos',
          filter: 'without-bed',
        },
      })
    }

    if (residentsWithoutLegalGuardian.length > 0) {
      alertsList.push({
        type: 'critical',
        title: 'Sem responsável legal',
        count: residentsWithoutLegalGuardian.length,
        description: 'Residentes sem responsável cadastrado',
        residents: residentsWithoutLegalGuardian,
        action: {
          label: 'Cadastrar responsável',
          filter: 'without-guardian',
        },
      })
    }

    if (residentsWithoutEmergencyContact.length > 0) {
      alertsList.push({
        type: 'critical',
        title: 'Sem contato de emergência',
        count: residentsWithoutEmergencyContact.length,
        description: 'Residentes sem contato de emergência válido ou com dados incompletos',
        residents: residentsWithoutEmergencyContact,
        action: {
          label: 'Adicionar/completar contato',
          filter: 'without-emergency-contact',
        },
      })
    }

    if (residentsWithIncompleteData.length > 0) {
      alertsList.push({
        type: 'critical',
        title: 'Dados incompletos',
        count: residentsWithIncompleteData.length,
        description: 'Faltam dados obrigatórios (CPF, admissão ou nascimento)',
        residents: residentsWithIncompleteData,
        action: {
          label: 'Completar cadastro',
          filter: 'incomplete-data',
        },
      })
    }

    if (residentsWithoutContract.length > 0) {
      alertsList.push({
        type: 'critical',
        title: 'Sem contrato',
        count: residentsWithoutContract.length,
        description: 'Residentes ativos sem contrato vigente',
        residents: residentsWithoutContract,
        action: {
          label: 'Cadastrar contrato',
          filter: 'without-contract',
        },
      })
    }

    // Adicionar avisos
    if (residentsWithoutRecentAnthropometry.length > 0) {
      alertsList.push({
        type: 'warning',
        title: 'Sem antropometria recente (90 dias)',
        count: residentsWithoutRecentAnthropometry.length,
        description: 'Residentes sem medição de peso/altura nos últimos 90 dias',
        residents: residentsWithoutRecentAnthropometry,
        action: {
          label: 'Nova medição antropométrica',
          filter: 'without-recent-anthropometry',
        },
      })
    }

    if (residentsWithoutPhoto.length > 0) {
      alertsList.push({
        type: 'warning',
        title: 'Sem foto',
        count: residentsWithoutPhoto.length,
        description: 'Residentes sem foto cadastrada',
        residents: residentsWithoutPhoto,
        action: {
          label: 'Adicionar fotos',
          filter: 'without-photo',
        },
      })
    }


    // Adicionar informativos
    if (birthdaysThisMonth.length > 0) {
      alertsList.push({
        type: 'info',
        title: 'Aniversariantes do mês',
        count: birthdaysThisMonth.length,
        description: 'Lista com data de aniversário e idade dos residentes neste mês',
        residents: birthdaysThisMonth,
        action: {
          label: 'Ver aniversariantes',
          filter: 'birthdays-month',
        },
      })
    }

    if (recentAdmissions.length > 0) {
      alertsList.push({
        type: 'info',
        title: 'Admissões recentes',
        count: recentAdmissions.length,
        description: 'Admitidos nos últimos 30 dias',
        residents: recentAdmissions,
        action: {
          label: 'Ver novos residentes',
          filter: 'recent-admissions',
        },
      })
    }

    return alertsList
  }, [residents, contracts])

  const metrics = useMemo<ResidentMetrics>(() => {
    if (!residents || residents.length === 0) {
      return {
        averageAge: 0,
        averageStayDays: 0,
        occupancyRate: 0,
        totalWithBed: 0,
        totalWithoutBed: 0,
      }
    }

    const activeResidents = residents.filter((r) => r.status === 'Ativo')

    // Calcular idade média
    const today = new Date()
    const ages = activeResidents
      .filter((r) => r.birthDate)
      .map((r) => {
        // Usar extractDateOnly para evitar problemas de timezone
        const dayKey = extractDateOnly(r.birthDate)
        const birthDate = new Date(dayKey + 'T12:00:00')
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age
      })
    const averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0

    // Calcular tempo médio de permanência
    const stayDays = activeResidents
      .filter((r) => r.admissionDate)
      .map((r) => {
        // Usar extractDateOnly para evitar problemas de timezone
        const dayKey = extractDateOnly(r.admissionDate!)
        const admissionDate = new Date(dayKey + 'T12:00:00')
        const diffTime = Math.abs(today.getTime() - admissionDate.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      })
    const averageStayDays = stayDays.length > 0 ? Math.round(stayDays.reduce((a, b) => a + b, 0) / stayDays.length) : 0

    // Calcular ocupação
    const totalWithBed = activeResidents.filter((r) => r.bedId).length
    const totalWithoutBed = activeResidents.filter((r) => !r.bedId).length
    const occupancyRate = activeResidents.length > 0 ? Math.round((totalWithBed / activeResidents.length) * 100) : 0

    return {
      averageAge,
      averageStayDays,
      occupancyRate,
      totalWithBed,
      totalWithoutBed,
    }
  }, [residents])

  return {
    alerts,
    metrics,
    isLoading,
    error,
    totalResidents: residents?.length || 0,
  }
}
