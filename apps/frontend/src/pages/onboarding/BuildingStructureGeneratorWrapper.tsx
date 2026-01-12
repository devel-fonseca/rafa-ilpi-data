import { BuildingStructureGenerator } from '@/components/beds/BuildingStructureGenerator'

interface BuildingStructureGeneratorWrapperProps {
  onComplete: () => void
  onCancel: () => void
}

/**
 * Wrapper do BuildingStructureGenerator para uso no onboarding
 *
 * Converte o Dialog em tela full-screen e adapta props:
 * - open (sempre true)
 * - onOpenChange (fecha = onComplete ou onCancel dependendo do contexto)
 */
export function BuildingStructureGeneratorWrapper({
  onComplete,
  onCancel,
}: BuildingStructureGeneratorWrapperProps) {
  /**
   * Quando o Dialog fecha (onOpenChange(false)):
   * - Se foi após criar estrutura, chama onComplete
   * - Se foi cancelamento, chama onCancel
   *
   * NOTA: O BuildingStructureGenerator chama onOpenChange(false)
   * apenas após criar a estrutura com sucesso (linha 219).
   * Se usuário clicar em "Voltar" no primeiro step, não há forma
   * de cancelar pelo Dialog atual.
   *
   * Para onboarding, vamos assumir que onOpenChange(false) = onComplete
   * e adicionar um botão de "Pular" fora do Dialog.
   */
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Dialog fechou = estrutura criada com sucesso
      onComplete()
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Botão de pular (fora do Dialog) */}
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Pular e fazer manualmente depois →
          </button>
        </div>

        {/* BuildingStructureGenerator como Dialog (sempre aberto) */}
        <BuildingStructureGenerator open={true} onOpenChange={handleOpenChange} />
      </div>
    </div>
  )
}
