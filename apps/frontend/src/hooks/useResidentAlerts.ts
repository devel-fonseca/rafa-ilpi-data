import { useMemo } from 'react'
import { useResidents } from './useResidents'
import type { Resident } from '@/api/residents.api'
import { extractDateOnly } from '@/utils/dateHelpers'

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
  const { residents, isLoading, error } = useResidents({
    page: 1,
    limit: 1000,
  })

  const alerts = useMemo<ResidentAlert[]>(() => {
    if (!residents || residents.length === 0) return []

    const activeResidents = residents.filter((r) => r.status === 'Ativo')

    // 🔴 ALERTAS CRÍTICOS
    const residentsWithoutBed = activeResidents.filter((r) => !r.bedId)
    const residentsWithoutLegalGuardian = activeResidents.filter(
      (r) => !r.legalGuardianName || r.legalGuardianName.trim() === ''
    )
    const residentsWithoutEmergencyContact = activeResidents.filter(
      (r) => !r.legalGuardianPhone || r.legalGuardianPhone.trim() === ''
    )
    const residentsWithIncompleteData = activeResidents.filter((r) => {
      const requiredFields = ['cpf', 'admissionDate', 'birthDate']
      return requiredFields.some((field) => !r[field as keyof Resident])
    })

    // 🟡 AVISOS
    const residentsWithoutPhoto = activeResidents.filter((r) => !r.fotoUrl)

    const residentsWithIncompleteAnthropometricData = activeResidents.filter(
      (r) => r.height == null || r.weight == null || !r.bloodType || !r.dependencyLevel
    )

    // 🔵 INFORMATIVOS
    const currentMonth = new Date().getMonth()
    const birthdaysThisMonth = activeResidents.filter((r) => {
      if (!r.birthDate) return false
      const birthMonth = new Date(r.birthDate).getMonth()
      return birthMonth === currentMonth
    })

    // Normalizar thirtyDaysAgo para meia-noite (remover horas/minutos/segundos)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

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
        description: 'Residentes sem telefone do responsável',
        residents: residentsWithoutEmergencyContact,
        action: {
          label: 'Adicionar contato',
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

    // Adicionar avisos
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

    if (residentsWithIncompleteAnthropometricData.length > 0) {
      alertsList.push({
        type: 'warning',
        title: 'Dados antropométricos incompletos',
        count: residentsWithIncompleteAnthropometricData.length,
        description: 'Faltam: altura, peso, tipo sanguíneo ou grau de dependência',
        residents: residentsWithIncompleteAnthropometricData,
        action: {
          label: 'Completar dados',
          filter: 'incomplete-anthropometric-data',
        },
      })
    }

    // Adicionar informativos
    if (birthdaysThisMonth.length > 0) {
      alertsList.push({
        type: 'info',
        title: 'Aniversariantes do mês',
        count: birthdaysThisMonth.length,
        description: 'Residentes que fazem aniversário este mês',
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
  }, [residents])

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
