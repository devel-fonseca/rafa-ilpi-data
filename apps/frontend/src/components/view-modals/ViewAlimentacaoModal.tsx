import { Eye } from 'lucide-react'
import { formatDateLongSafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { ActionDetailsSheet } from '@/design-system/components'

interface AlimentacaoData {
  refeicao: string
  cardapio?: string
  consistencia: string
  ingeriu: string
  auxilioNecessario: boolean
  volumeMl?: string | number
  intercorrencia?: string
  observacoes?: string
  [key: string]: unknown
}

interface AlimentacaoRecord {
  data: AlimentacaoData
  time: string
  date: string
  recordedBy: string
  createdAt: string
  notes?: string
  [key: string]: unknown
}

interface ViewAlimentacaoModalProps {
  open: boolean
  onClose: () => void
  record: AlimentacaoRecord
}

export function ViewAlimentacaoModal({
  open,
  onClose,
  record,
}: ViewAlimentacaoModalProps) {
  if (!record) return null

  const { data, time, date, recordedBy, createdAt, notes } = record
  const hasObservacoes =
    Boolean(data.observacoes && String(data.observacoes).trim().length > 0) ||
    Boolean(notes && String(notes).trim().length > 0)

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Alimentação - Detalhes"
      description="Visualização completa do registro de alimentação"
      icon={<Eye className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDateLongSafe(date)}</span>
            <span>•</span>
            <span>Horário {time}</span>
            <span>•</span>
            <span>Por <span className="font-medium text-foreground">{recordedBy}</span></span>
          </div>
        </div>
      )}
      bodyClassName="space-y-6"
    >
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">Refeição</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tipo</p>
            <Badge variant="outline" className="font-normal text-sm">
              {data.refeicao}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Consistência</p>
            <Badge variant="outline" className="font-normal">
              {data.consistencia}
            </Badge>
          </div>

          {data.cardapio && (
            <div className="space-y-1 col-span-2">
              <p className="text-xs text-muted-foreground">Cardápio</p>
              <p className="text-sm">{data.cardapio}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">
          Aceitação Alimentar
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ingestão</p>
            <Badge variant="outline" className="font-normal">
              {data.ingeriu}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Auxílio necessário</p>
            <Badge variant={data.auxilioNecessario ? 'default' : 'outline'}>
              {data.auxilioNecessario ? 'Sim' : 'Não'}
            </Badge>
          </div>
        </div>
      </div>

      {data.volumeMl && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">
            Hidratação durante a refeição
          </h3>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-sm font-medium">
              {data.volumeMl} ml
            </p>
          </div>
        </div>
      )}

      {data.intercorrencia && data.intercorrencia !== 'Nenhuma' && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">Intercorrência</h3>
          <Badge variant="outline" className="border-warning/40 text-warning">
            {data.intercorrencia}
          </Badge>
        </div>
      )}

      {hasObservacoes && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">
            Observações
          </h3>
          <div className="bg-muted/20 p-3 rounded-lg border">
            <p className="text-sm whitespace-pre-wrap">
              {notes || data.observacoes}
            </p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t text-xs text-muted-foreground">
        Registrado em {formatDateTimeSafe(createdAt)}
      </div>
    </ActionDetailsSheet>
  )
}
