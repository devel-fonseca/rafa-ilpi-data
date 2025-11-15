import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useResident, useDeleteResident } from '@/hooks/useResidents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'

export default function ResidentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [deleteModal, setDeleteModal] = useState(false)

  const { data: resident, isLoading, error } = useResident(id || '')
  const deleteMutation = useDeleteResident()

  // Calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Obter cor do badge de status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return 'bg-green-100 text-green-800'
      case 'INATIVO':
        return 'bg-yellow-100 text-yellow-800'
      case 'ALTA':
        return 'bg-blue-100 text-blue-800'
      case 'OBITO':
        return 'bg-gray-100 text-gray-800'
      case 'TRANSFERIDO':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Traduzir grau de dependência
  const translateDependency = (dependency?: string) => {
    switch (dependency) {
      case 'INDEPENDENTE':
        return 'Independente'
      case 'SEMI_DEPENDENTE':
        return 'Semi-dependente'
      case 'DEPENDENTE_PARCIAL':
        return 'Dependente Parcial'
      case 'DEPENDENTE_TOTAL':
        return 'Dependente Total'
      default:
        return 'Não informado'
    }
  }

  // Traduzir estado civil
  const translateMaritalStatus = (status?: string) => {
    switch (status) {
      case 'SOLTEIRO':
        return 'Solteiro(a)'
      case 'CASADO':
        return 'Casado(a)'
      case 'DIVORCIADO':
        return 'Divorciado(a)'
      case 'VIUVO':
        return 'Viúvo(a)'
      case 'UNIAO_ESTAVEL':
        return 'União Estável'
      case 'OUTRO':
        return 'Outro'
      default:
        return 'Não informado'
    }
  }

  // Traduzir tipo sanguíneo
  const translateBloodType = (bloodType?: string) => {
    if (!bloodType || bloodType === 'NAO_INFORMADO') return 'Não informado'
    const map: Record<string, string> = {
      'A_POSITIVO': 'A+',
      'A_NEGATIVO': 'A-',
      'B_POSITIVO': 'B+',
      'B_NEGATIVO': 'B-',
      'AB_POSITIVO': 'AB+',
      'AB_NEGATIVO': 'AB-',
      'O_POSITIVO': 'O+',
      'O_NEGATIVO': 'O-'
    }
    return map[bloodType] || bloodType
  }

  // Traduzir escolaridade
  const translateEducation = (education?: string) => {
    switch (education) {
      case 'NAO_ALFABETIZADO':
        return 'Não Alfabetizado'
      case 'FUNDAMENTAL_INCOMPLETO':
        return 'Fundamental Incompleto'
      case 'FUNDAMENTAL_COMPLETO':
        return 'Fundamental Completo'
      case 'MEDIO_INCOMPLETO':
        return 'Médio Incompleto'
      case 'MEDIO_COMPLETO':
        return 'Médio Completo'
      case 'SUPERIOR_INCOMPLETO':
        return 'Superior Incompleto'
      case 'SUPERIOR_COMPLETO':
        return 'Superior Completo'
      case 'POS_GRADUACAO':
        return 'Pós-Graduação'
      default:
        return 'Não informado'
    }
  }

  // Confirmar exclusão
  const handleDelete = async () => {
    if (!id) return

    try {
      await deleteMutation.mutateAsync(id)
      toast({
        title: 'Sucesso',
        description: 'Residente removido com sucesso',
      })
      navigate('/dashboard/residentes')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover residente',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-gray-600">Residente não encontrado</div>
        <Button variant="outline" onClick={() => navigate('/dashboard/residentes')}>
          Voltar para a lista
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/residentes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{resident.fullName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={getStatusBadgeColor(resident.status)}>
                {resident.status}
              </Badge>
              <span className="text-gray-600">
                {calculateAge(resident.birthDate)} anos
              </span>
              {resident.cpf && (
                <span className="text-gray-600">CPF: {resident.cpf}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/residentes/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteModal(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Data de Admissão</CardDescription>
            <CardTitle className="text-lg">
              {resident.admissionDate
                ? format(new Date(resident.admissionDate), 'dd/MM/yyyy', { locale: ptBR })
                : '-'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Tempo na Instituição</CardDescription>
            <CardTitle className="text-lg">
              {resident.admissionDate
                ? `${Math.floor(
                    (new Date().getTime() - new Date(resident.admissionDate).getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                  )} meses`
                : '-'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Grau de Dependência</CardDescription>
            <CardTitle className="text-lg">
              {resident.dependencyLevel || '-'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs">Responsável</CardDescription>
            <CardTitle className="text-lg">{resident.legalGuardianName || '-'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="responsible">Responsável</TabsTrigger>
          <TabsTrigger value="medical">Informações Médicas</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        {/* Dados Pessoais */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>Informações básicas do residente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Nome Completo</div>
                  <div className="font-medium">{resident.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nome Social</div>
                  <div className="font-medium">{resident.socialName || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">CPF</div>
                  <div className="font-medium">{resident.cpf || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">RG</div>
                  <div className="font-medium">{resident.rg || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Órgão Emissor</div>
                  <div className="font-medium">{resident.rgIssuer || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">CNS</div>
                  <div className="font-medium">{resident.cns || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Data de Nascimento</div>
                  <div className="font-medium">
                    {format(new Date(resident.birthDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Gênero</div>
                  <div className="font-medium">
                    {resident.gender === 'MASCULINO'
                      ? 'Masculino'
                      : resident.gender === 'FEMININO'
                      ? 'Feminino'
                      : 'Outro'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Estado Civil</div>
                  <div className="font-medium">{translateMaritalStatus(resident.civilStatus)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Cidade de Nascimento</div>
                  <div className="font-medium">
                    {resident.birthCity && resident.birthState
                      ? `${resident.birthCity}/${resident.birthState}`
                      : 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Religião</div>
                  <div className="font-medium">{resident.religion || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Escolaridade</div>
                  <div className="font-medium">{resident.education || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Profissão</div>
                  <div className="font-medium">{resident.profession || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nome da Mãe</div>
                  <div className="font-medium">{resident.motherName || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nome do Pai</div>
                  <div className="font-medium">{resident.fatherName || 'Não informado'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Tipo de Admissão</div>
                  <div className="font-medium">{resident.admissionType || 'Não informado'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Motivo da Admissão</div>
                  <div className="font-medium">{resident.admissionReason || 'Não informado'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Condições na Admissão</div>
                  <div className="font-medium">{resident.admissionConditions || 'Não informado'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contato */}
        <TabsContent value="contact">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Endereço Atual</CardTitle>
                <CardDescription>Endereço onde o residente está atualmente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500">Endereço</div>
                        <div className="font-medium">
                          {resident.currentStreet
                            ? `${resident.currentStreet}${resident.currentNumber ? `, ${resident.currentNumber}` : ''}${resident.currentComplement ? `, ${resident.currentComplement}` : ''}${resident.currentDistrict ? `, ${resident.currentDistrict}` : ''}${
                                resident.currentCity ? `, ${resident.currentCity}` : ''
                              }${resident.currentState ? `/${resident.currentState}` : ''}${
                                resident.currentCep ? ` - CEP: ${resident.currentCep}` : ''
                              }`
                            : 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Telefone</div>
                        <div className="font-medium">{resident.currentPhone || 'Não informado'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {resident.originStreet && (
              <Card>
                <CardHeader>
                  <CardTitle>Endereço de Origem</CardTitle>
                  <CardDescription>Endereço anterior do residente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-500">Endereço</div>
                          <div className="font-medium">
                            {`${resident.originStreet}${resident.originNumber ? `, ${resident.originNumber}` : ''}${resident.originComplement ? `, ${resident.originComplement}` : ''}${resident.originDistrict ? `, ${resident.originDistrict}` : ''}${
                              resident.originCity ? `, ${resident.originCity}` : ''
                            }${resident.originState ? `/${resident.originState}` : ''}${
                              resident.originCep ? ` - CEP: ${resident.originCep}` : ''
                            }`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {resident.originPhone && (
                      <div>
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">Telefone</div>
                            <div className="font-medium">{resident.originPhone}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {resident.emergencyContacts && resident.emergencyContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Contatos de Emergência</CardTitle>
                  <CardDescription>Pessoas para contatar em caso de emergência</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resident.emergencyContacts.map((contact: any, index: number) => (
                      <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-500">Nome</div>
                            <div className="font-medium">{contact.name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Telefone</div>
                            <div className="font-medium">{contact.phone}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Relacionamento</div>
                            <div className="font-medium">{contact.relationship}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Responsável */}
        <TabsContent value="responsible">
          <Card>
            <CardHeader>
              <CardTitle>Responsável Legal</CardTitle>
              <CardDescription>Informações do responsável pelo residente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Nome</div>
                  <div className="font-medium">{resident.legalGuardianName || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">CPF</div>
                  <div className="font-medium">
                    {resident.legalGuardianCpf || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">RG</div>
                  <div className="font-medium">
                    {resident.legalGuardianRg || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tipo de Responsabilidade</div>
                  <div className="font-medium">{resident.legalGuardianType || 'Não informado'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Telefone</div>
                  <div className="font-medium">
                    {resident.legalGuardianPhone || 'Não informado'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Endereço</div>
                  <div className="font-medium">
                    {resident.legalGuardianStreet
                      ? `${resident.legalGuardianStreet}${resident.legalGuardianNumber ? `, ${resident.legalGuardianNumber}` : ''}${resident.legalGuardianComplement ? `, ${resident.legalGuardianComplement}` : ''}${resident.legalGuardianDistrict ? `, ${resident.legalGuardianDistrict}` : ''}${
                          resident.legalGuardianCity ? `, ${resident.legalGuardianCity}` : ''
                        }${resident.legalGuardianState ? `/${resident.legalGuardianState}` : ''}${
                          resident.legalGuardianCep ? ` - CEP: ${resident.legalGuardianCep}` : ''
                        }`
                      : 'Não informado'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Informações Médicas */}
        <TabsContent value="medical">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais de Saúde</CardTitle>
                <CardDescription>Dados básicos de saúde</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Tipo Sanguíneo</div>
                    <div className="font-medium">{translateBloodType(resident.bloodType)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Altura</div>
                    <div className="font-medium">
                      {resident.height ? `${resident.height} m` : 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Peso</div>
                    <div className="font-medium">
                      {resident.weight ? `${resident.weight} kg` : 'Não informado'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Grau de Dependência</div>
                    <div className="font-medium">{resident.dependencyLevel || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Usa Auxílio de Mobilidade?</div>
                    <div className="font-medium">
                      {resident.mobilityAid !== undefined
                        ? resident.mobilityAid
                          ? 'Sim'
                          : 'Não'
                        : 'Não informado'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">Estado de Saúde</div>
                    <div className="font-medium">{resident.healthStatus || 'Não informado'}</div>
                  </div>
                  {resident.specialNeeds && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-500">Necessidades Especiais</div>
                      <div className="font-medium">{resident.specialNeeds}</div>
                    </div>
                  )}
                  {resident.functionalAspects && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-500">Aspectos Funcionais</div>
                      <div className="font-medium">{resident.functionalAspects}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Condições Médicas</CardTitle>
                <CardDescription>Alergias, condições crônicas e medicamentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Alergias</div>
                    <div className="font-medium">{resident.allergies || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Condições Crônicas</div>
                    <div className="font-medium">{resident.chronicConditions || 'Não informado'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Medicamentos na Admissão</div>
                    <div className="font-medium">{resident.medicationsOnAdmission || 'Não informado'}</div>
                  </div>
                  {resident.dietaryRestrictions && (
                    <div>
                      <div className="text-sm text-gray-500">Restrições Alimentares</div>
                      <div className="font-medium">{resident.dietaryRestrictions}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {resident.healthPlans && resident.healthPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Planos de Saúde</CardTitle>
                  <CardDescription>Planos de saúde do residente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resident.healthPlans.map((plan: any, index: number) => (
                      <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-500">Nome do Plano</div>
                            <div className="font-medium">{plan.name}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Número da Carteirinha</div>
                            <div className="font-medium">{plan.cardNumber}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {resident.belongings && resident.belongings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pertences</CardTitle>
                  <CardDescription>Bens pessoais do residente</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {resident.belongings.map((item: string, index: number) => (
                      <li key={index} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Documentos digitalizados do residente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-32 space-y-3">
                <FileText className="h-10 w-10 text-gray-300" />
                <div className="text-gray-500">Nenhum documento disponível</div>
                <Button variant="outline" size="sm" disabled>
                  Upload será implementado em breve
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModal} onOpenChange={setDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o residente <strong>{resident.fullName}</strong>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}