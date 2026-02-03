import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

export interface ContractualResponsible {
  name: string
  cpf: string
  role: 'RESPONSAVEL_CONTRATUAL'
}

interface ContractualResponsiblesManagerProps {
  responsibles: ContractualResponsible[]
  onChange: (responsibles: ContractualResponsible[]) => void
  errors?: Record<string, string>
}

export function ContractualResponsiblesManager({
  responsibles,
  onChange,
  errors = {},
}: ContractualResponsiblesManagerProps) {
  const addResponsible = () => {
    onChange([...responsibles, { name: '', cpf: '', role: 'RESPONSAVEL_CONTRATUAL' }])
  }

  const removeResponsible = (index: number) => {
    onChange(responsibles.filter((_, i) => i !== index))
  }

  const updateResponsible = (index: number, field: 'name' | 'cpf', value: string) => {
    const updated = [...responsibles]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Responsáveis Contratuais</CardTitle>
        <CardDescription>
          Informe os responsáveis contratuais caso existam (ex: filhos, irmãos, curadores)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {responsibles.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md text-center">
            <p>
              <strong>Nenhum responsável contratual adicionado.</strong>
            </p>
            <p className="mt-2">
              Deixe em branco se o residente tiver capacidade cognitiva para assinar o próprio
              contrato ou se não houver responsáveis pelo pagamento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {responsibles.map((responsible, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 bg-muted/50 rounded-md"
              >
                <div className="md:col-span-5 space-y-2">
                  <Label htmlFor={`responsible-name-${index}`}>Nome Completo *</Label>
                  <Input
                    id={`responsible-name-${index}`}
                    value={responsible.name}
                    onChange={(e) => updateResponsible(index, 'name', e.target.value)}
                    placeholder="Nome do responsável contratual"
                    className={errors[`responsible-${index}-name`] ? 'border-danger' : ''}
                  />
                  {errors[`responsible-${index}-name`] && (
                    <p className="text-sm text-danger">{errors[`responsible-${index}-name`]}</p>
                  )}
                </div>

                <div className="md:col-span-6 space-y-2">
                  <Label htmlFor={`responsible-cpf-${index}`}>CPF *</Label>
                  <Input
                    id={`responsible-cpf-${index}`}
                    value={responsible.cpf}
                    onChange={(e) => updateResponsible(index, 'cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className={errors[`responsible-${index}-cpf`] ? 'border-danger' : ''}
                  />
                  {errors[`responsible-${index}-cpf`] && (
                    <p className="text-sm text-danger">{errors[`responsible-${index}-cpf`]}</p>
                  )}
                </div>

                <div className="md:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeResponsible(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" onClick={addResponsible} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Responsável Contratual
        </Button>

        {errors.responsibles && <p className="text-sm text-danger">{errors.responsibles}</p>}
      </CardContent>
    </Card>
  )
}
