import { useState, useMemo, useRef } from 'react'
import { Plus, Loader2, Filter, X, Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useClinicalNotesByResident } from '@/hooks/useClinicalNotes'
import { useAuthStore } from '@/stores/auth.store'
import type { ClinicalNote, ClinicalProfession } from '@/api/clinicalNotes.api'
import { ClinicalNoteCard } from './ClinicalNoteCard'
import { ClinicalNotesForm } from './ClinicalNotesForm'
import { ViewClinicalNoteModal } from './ViewClinicalNoteModal'
import { ClinicalNoteHistoryModal } from './ClinicalNoteHistoryModal'
import { ClinicalNotePrintView } from './ClinicalNotePrintView'
import { PROFESSION_CONFIG } from '@/utils/clinicalNotesConstants'
import { extractDateOnly } from '@/utils/dateHelpers'

interface ClinicalNotesListProps {
  residentId: string
  residentName?: string
}

type PeriodFilter = 'today' | '7days' | '30days' | 'year' | 'all'

export function ClinicalNotesList({ residentId, residentName }: ClinicalNotesListProps) {
  const { user } = useAuthStore()
  const printRef = useRef<HTMLDivElement>(null)
  const notePrintRef = useRef<HTMLDivElement>(null)

  // Modal states
  const [formOpen, setFormOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | undefined>(undefined)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewedNote, setViewedNote] = useState<ClinicalNote | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyNoteId, setHistoryNoteId] = useState<string | null>(null)
  const [printNote, setPrintNote] = useState<ClinicalNote | null>(null)

  // Filter states
  const [professionFilter, setProfessionFilter] = useState<ClinicalProfession | 'all'>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  // Fetch data
  const { data: notes = [], isLoading, error } = useClinicalNotesByResident(residentId)

  // Print handlers
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Evolucoes_Clinicas_${residentId}_${extractDateOnly(new Date().toISOString())}`,
  })

  const handlePrintSingleNote = useReactToPrint({
    contentRef: notePrintRef,
    documentTitle: `Evolucao_Clinica_${printNote?.id}_${extractDateOnly(new Date().toISOString())}`,
  })

  // Filter notes by period
  const filterByPeriod = (note: ClinicalNote, period: PeriodFilter): boolean => {
    if (period === 'all') return true

    const now = new Date()
    const noteDate = new Date(note.noteDate)

    switch (period) {
      case 'today':
        return extractDateOnly(note.noteDate) === extractDateOnly(now.toISOString())
      case '7days':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return noteDate >= sevenDaysAgo
      case '30days':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return noteDate >= thirtyDaysAgo
      case 'year':
        return noteDate.getFullYear() === now.getFullYear()
      default:
        return true
    }
  }

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    // Garantir que notes é sempre um array
    const safeNotes = Array.isArray(notes) ? notes : []

    return safeNotes
      .filter((note) => {
        // Filter by profession
        if (professionFilter !== 'all' && note.profession !== professionFilter) {
          return false
        }

        // Filter by period
        if (!filterByPeriod(note, periodFilter)) {
          return false
        }

        // Exclude amended notes
        if (note.isAmended) {
          return false
        }

        return true
      })
      .sort((a, b) => b.noteDate.localeCompare(a.noteDate)) // Most recent first
  }, [notes, professionFilter, periodFilter])

  // Check if user can edit a note
  const canEdit = (note: ClinicalNote): boolean => {
    if (!user) return false
    return note.createdBy === user.id
  }

  // Handlers
  const handleCreate = () => {
    setSelectedNote(undefined)
    setFormOpen(true)
  }

  const handleView = (note: ClinicalNote) => {
    setViewedNote(note)
    setViewModalOpen(true)
  }

  const handleEdit = (note: ClinicalNote) => {
    setSelectedNote(note)
    setFormOpen(true)
  }

  const handleHistory = (note: ClinicalNote) => {
    setHistoryNoteId(note.id)
    setHistoryModalOpen(true)
  }

  const handlePrintNote = (note: ClinicalNote) => {
    setPrintNote(note)
    // useReactToPrint will trigger automatically when printNote is set
    setTimeout(() => {
      handlePrintSingleNote()
    }, 100)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedNote(undefined)
  }

  const clearFilters = () => {
    setProfessionFilter('all')
    setPeriodFilter('all')
  }

  const hasActiveFilters = professionFilter !== 'all' || periodFilter !== 'all'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/30">
        Erro ao carregar evoluções clínicas
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com botões e filtros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Evoluções Clínicas Multiprofissionais (SOAP)</CardTitle>
              {residentName && (
                <CardDescription>
                  Evoluções registradas para {residentName}
                </CardDescription>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="gap-2"
                disabled={filteredNotes.length === 0}
              >
                <Printer className="h-4 w-4" />
                Imprimir Lista
              </Button>

              <Button size="sm" onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Evolução
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mt-4 p-4 bg-muted/30 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {/* Filtro por Profissão */}
            <Select
              value={professionFilter}
              onValueChange={(value) => setProfessionFilter(value as ClinicalProfession | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Profissão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as profissões</SelectItem>
                {Object.entries(PROFESSION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Período */}
            <Select
              value={periodFilter}
              onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            {/* Badge com total de resultados */}
            <Badge variant="secondary" className="ml-auto">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'evolução' : 'evoluções'}
            </Badge>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Lista de evoluções */}
        <CardContent>
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Nenhuma evolução clínica encontrada</p>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={handleCreate}>
                  Criar primeira evolução
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <ClinicalNoteCard
                  key={note.id}
                  note={note}
                  onView={handleView}
                  onEdit={handleEdit}
                  onHistory={handleHistory}
                  onPrint={handlePrintNote}
                  canEdit={canEdit(note)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print View for List (hidden) */}
      <div className="hidden">
        <div ref={printRef} className="p-8">
          <h1 className="text-2xl font-bold mb-4">Evoluções Clínicas</h1>
          {residentName && <p className="mb-6">Residente: {residentName}</p>}
          {filteredNotes.map((note, index) => (
            <div key={note.id} className="mb-8 pb-8 border-b">
              {/* TODO: Implementar print view detalhada (FASE 7) */}
              <p>Evolução {index + 1}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Print View for Individual Note (hidden) */}
      {printNote && (
        <ClinicalNotePrintView
          ref={notePrintRef}
          note={printNote}
          residentName={residentName || 'Residente'}
        />
      )}

      {/* Modals */}
      <ClinicalNotesForm
        open={formOpen}
        onOpenChange={handleFormClose}
        residentId={residentId}
        residentName={residentName}
        note={selectedNote}
        onSuccess={handleFormClose}
      />

      <ViewClinicalNoteModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        note={viewedNote}
        onEdit={handleEdit}
        onHistory={handleHistory}
        onPrint={handlePrintNote}
        canEdit={viewedNote ? canEdit(viewedNote) : false}
      />

      <ClinicalNoteHistoryModal
        noteId={historyNoteId}
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />
    </div>
  )
}
