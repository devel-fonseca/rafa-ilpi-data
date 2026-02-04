import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  Plus,
  X,
  FileText,
  Edit,
  History,
  User,
  MapPin,
  HeartPulse,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Page, PageHeader } from "@/design-system/components";
import { PhotoUploadNew } from "@/components/form/PhotoUploadNew";
import { MaskedInput } from "@/components/form/MaskedInput";
import {
  validarCPF,
  getMensagemValidacaoCPF,
  getMensagemValidacaoCNS,
} from "@/utils/validators";
import { buscarCEP } from "@/services/viacep";
import {
  timestamptzToDisplay,
  displayToDate,
  mapEstadoCivilFromBackend,
  mapEstadoCivilToBackend,
  mapTipoSanguineoFromBackend,
  mapTipoSanguineoToBackend,
} from "@/utils/formMappers";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { uploadFile } from "@/services/upload";
import { BedSearchCombobox } from "@/components/beds/BedSearchCombobox";
import { ResidentHistoryDrawer } from "@/components/residents/ResidentHistoryDrawer";
import { toast } from "sonner";
import { PlanLimitWarningDialog } from "@/components/admin/PlanLimitWarningDialog";
import type { Resident } from "@/api/residents.api";
import { tenantKey } from "@/lib/query-keys";
import { useMySubscription } from "@/hooks/useTenant";

const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Componente Collapsible customizado (inline)
interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  required?: boolean;
}

function Collapsible({
  title,
  children,
  defaultOpen = true,
  required = false,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg mb-4 overflow-hidden">
      <div
        className="bg-muted px-5 py-4 font-semibold cursor-pointer flex justify-between items-center hover:bg-muted/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {title}
          {required && <span className="text-danger ml-1">*</span>}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 transition-transform",
            isOpen ? "" : "-rotate-90"
          )}
        />
      </div>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  );
}

// Schema Zod de validação
const residentSchema = z.object({
  // Status (opcional - apenas para modo edição)
  status: z.enum(["Ativo", "Inativo", "Falecido"]).optional(),

  // Motivo da alteração (obrigatório apenas no modo edição - RDC 502/2021 Art. 39)
  changeReason: z.string().optional(),

  // Dados Pessoais
  foto: z.any().optional(),
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  nomeSocial: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cns: z.string().optional(),
  cpf: z.string().refine((val) => validarCPF(val), "CPF inválido"),
  rg: z.string().optional(),
  orgaoExpedidor: z.string().optional(),
  escolaridade: z.string().optional(),
  profissao: z.string().optional(),
  genero: z
    .enum(["MASCULINO", "FEMININO", "OUTRO"])
    .refine((val) => val !== undefined, {
      message: "Gênero é obrigatório",
    }),
  estadoCivil: z.string().optional(),
  religiao: z.string().optional(),
  dataNascimento: z.string()
    .min(1, "Data de nascimento é obrigatória")
    .refine((dateStr) => {
      if (!dateStr) return true; // Se vazio, a validação .min() captura

      // Parse da data no formato DD/MM/AAAA (formato do MaskedInput)
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return false; // Formato inválido

      const birthDate = new Date(year, month - 1, day); // mês é 0-indexed
      const today = new Date();

      // Calcula idade considerando se já fez aniversário este ano
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      return age >= 60;
    }, {
      message: "Residente deve ter idade igual ou superior a 60 anos (RDC 502/2021 Art. 2º)"
    }),
  nacionalidade: z.string().optional(),
  naturalidade: z.string().optional(),
  ufNascimento: z.string().optional(),
  nomeMae: z.string().optional(),
  nomePai: z.string().optional(),
  documentosPessoaisUrls: z.array(z.any()).optional(),

  // Endereço Atual
  cepAtual: z.string().optional(),
  estadoAtual: z.string().optional(),
  cidadeAtual: z.string().optional(),
  logradouroAtual: z.string().optional(),
  numeroAtual: z.string().optional(),
  complementoAtual: z.string().optional(),
  bairroAtual: z.string().optional(),
  telefoneAtual: z.string().optional(),

  // Procedência (texto livre)
  procedencia: z.string().max(255).optional(),
  documentosEnderecoUrls: z.array(z.any()).optional(),

  // Contatos
  contatosEmergencia: z
    .array(
      z.object({
        nome: z.string().optional(),
        telefone: z.string().optional(),
        parentesco: z.string().optional(),
      })
    )
    .optional(),

  // Responsável Legal
  responsavelLegalNome: z.string().optional(),
  responsavelLegalEmail: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  responsavelLegalCpf: z.string().optional(),
  responsavelLegalRg: z.string().optional(),
  responsavelLegalTelefone: z.string().optional(),
  responsavelLegalTipo: z.string().optional(),
  responsavelLegalCep: z.string().optional(),
  responsavelLegalUf: z.string().optional(),
  responsavelLegalCidade: z.string().optional(),
  responsavelLegalLogradouro: z.string().optional(),
  responsavelLegalNumero: z.string().optional(),
  responsavelLegalComplemento: z.string().optional(),
  responsavelLegalBairro: z.string().optional(),
  responsavelLegalDocumentosUrls: z.array(z.any()).optional(),

  // Admissão
  dataAdmissao: z.string().min(1, "Data de admissão é obrigatória"),
  tipoAdmissao: z.string().optional(),
  motivoAdmissao: z.string().optional(),
  condicoesAdmissao: z.string().optional(),
  dataDesligamento: z.string().optional(),
  motivoDesligamento: z.string().optional(),
  termoAdmissao: z.any().optional(),
  consentimentoLgpd: z.any().optional(),
  consentimentoImagem: z.any().optional(),

  // Saúde (campos básicos mantidos - dados clínicos evolutivos migraram para tabelas dedicadas)
  necessitaAuxilioMobilidade: z
    .boolean()
    .nullable()
    .optional()
    .transform((val) => val ?? false),
  tipoSanguineo: z.string().optional(),
  altura: z.string().optional(),
  peso: z.string().optional(),
  grauDependencia: z.string().optional(),
  medicamentos: z.array(z.object({ nome: z.string().optional() })).optional(),
  observacoesSaude: z.string().optional(),
  laudoMedico: z.any().optional(), // Arquivo
  laudoMedicoUrl: z.string().optional(), // URL retornada do backend
  dataLaudoMedico: z.string().optional(),

  // Convênios
  convenios: z
    .array(
      z.object({
        nome: z.string().optional(),
        numero: z.string().optional(),
        arquivo: z.any().optional(),
      })
    )
    .optional(),

  // Pertences
  // pertences removido - agora gerenciado via módulo ResidentBelongings

  // Acomodação - Apenas o leito (o quarto é obtido através do leito)
  leitoNumero: z.string().optional(),
});

// Schema com validação condicional para changeReason (obrigatório no modo edição)
const getResidentSchema = (isEditMode: boolean) => {
  if (isEditMode) {
    return residentSchema.extend({
      changeReason: z
        .string()
        .min(10, "Motivo da alteração deve ter no mínimo 10 caracteres")
        .refine((val) => val.trim().length >= 10, {
          message:
            "Motivo da alteração deve ter no mínimo 10 caracteres (sem contar espaços)",
        }),
    });
  }
  return residentSchema;
};

type ResidentFormData = z.infer<typeof residentSchema>;

interface ResidentFormProps {
  readOnly?: boolean;
}

export function ResidentForm({ readOnly = false }: ResidentFormProps = {}) {
  // Estados para modo edição
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Carregando dados do residente
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>(
    undefined
  );
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [residentFullName, setResidentFullName] = useState<string | undefined>(
    undefined
  );

  // Estados gerais
  const [cpfValidation, setCpfValidation] = useState({
    valido: true,
    mensagem: "",
  });
  const [cnsValidation, setCnsValidation] = useState({
    valido: true,
    mensagem: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [hasSeenWarning, setHasSeenWarning] = useState(false);

  // Estado removido - BedSelector gerencia internamente a hierarquia

  // Ref para armazenar dados do residente carregado (para sincronizar Select depois)
  const residentDataRef = useRef<Resident | null>(null);

  // Buscar dados de subscription para verificar limites
  const { data: subscriptionData } = useMySubscription();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResidentFormData>({
    resolver: zodResolver(getResidentSchema(isEditMode)),
    mode: "onChange",
    defaultValues: {
      status: "Ativo", // Valor padrão para novos residentes
      leitoNumero: "", // Sempre iniciar com string vazia para evitar controlled/uncontrolled
      contatosEmergencia: [{ nome: "", telefone: "", parentesco: "" }],
      convenios: [{ nome: "", numero: "" }],
      necessitaAuxilioMobilidade: false,
    },
  });

  const {
    fields: contatosFields,
    append: appendContato,
    remove: removeContato,
  } = useFieldArray({
    control,
    name: "contatosEmergencia",
  });

  const {
    fields: conveniosFields,
    append: appendConvenio,
    remove: removeConvenio,
  } = useFieldArray({
    control,
    name: "convenios",
  });

  const {
    fields: medicamentosFields,
    append: appendMedicamento,
    remove: removeMedicamento,
  } = useFieldArray({
    control,
    name: "medicamentos",
  });

  // useFieldArray de pertences removido - agora gerenciado via módulo ResidentBelongings
  // Acessível em: /dashboard/residentes/:id/pertences

  // Hooks de Beds (Acomodação)
  // Removidos - BedSelector busca os dados internamente
  // const { data: rooms, isLoading: isLoadingRooms } = useRooms()
  // const { data: beds, isLoading: isLoadingBeds } = useBeds()

  // Refs para inputs de badges
  const medicamentosInputRef = useRef<HTMLInputElement>(null);

  const watchCpf = watch("cpf");
  const watchCns = watch("cns");
  const watchDataNascimento = watch("dataNascimento");
  // Removido - usando BedSelector agora

  // Validação de CPF em tempo real
  useEffect(() => {
    if (watchCpf) {
      setCpfValidation(getMensagemValidacaoCPF(watchCpf));
    }
  }, [watchCpf]);

  // Validação de CNS em tempo real
  useEffect(() => {
    if (watchCns) {
      setCnsValidation(getMensagemValidacaoCNS(watchCns));
    }
  }, [watchCns]);

  // Calcula idade a partir da data de nascimento (formato DD/MM/AAAA)
  const calculateAge = (dateStr: string): number | null => {
    if (!dateStr || dateStr.length !== 10) return null;

    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year || year < 1900) return null;

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 0 ? age : null;
  };

  // Mensagem de feedback para data de nascimento
  const getBirthDateFeedback = (): { message: string; isError: boolean } | null => {
    if (!watchDataNascimento || watchDataNascimento.length !== 10) {
      return { message: "Critério etário: 60 anos ou mais (art. 2º, RDC nº 502/2021).", isError: false };
    }

    const age = calculateAge(watchDataNascimento);

    if (age === null) {
      return { message: "Critério etário: 60 anos ou mais (art. 2º, RDC nº 502/2021).", isError: false };
    }

    if (age < 60) {
      return {
        message: "Residente deve ter idade igual ou superior a 60 anos (RDC 502/2021 Art. 2º)",
        isError: true
      };
    }

    return { message: `✓ Idade: ${age} anos`, isError: false };
  };

  // Verificar limite ao entrar na página (apenas em modo criação e se não viu ainda)
  useEffect(() => {
    if (isEditMode || !subscriptionData || hasSeenWarning) return;

    const { usage, plan } = subscriptionData;
    const percentage =
      plan.maxResidents > 0
        ? (usage.activeResidents / plan.maxResidents) * 100
        : 0;

    // Mostrar dialog se >= 80% do limite
    if (percentage >= 80) {
      setShowLimitDialog(true);
      setHasSeenWarning(true);
    }
  }, [subscriptionData, hasSeenWarning, isEditMode]);

  // Removido código antigo de sincronização - agora usando BedSelector

  // ========== CARREGAR DADOS DO RESIDENTE (MODO EDIÇÃO) ==========
  useEffect(() => {
    // Flag para verificar se componente ainda está montado
    let isMounted = true;
    // AbortController para cancelar requisições pendentes
    const controller = new AbortController();

    const loadResident = async () => {
      if (!id) {
        setIsEditMode(false);
        return;
      }

      if (!isMounted) return;

      setIsEditMode(true);
      setIsLoading(true);

      try {
        const response = await api.get(`/residents/${id}`, {
          signal: controller.signal,
        });

        // Verifica se o componente ainda está montado
        if (!isMounted) return;

        const resident = response.data;


        // ===== FOTO =====
        // O PhotoViewer cuida de assinar a URL automaticamente
        if (isMounted) {
          setCurrentPhotoUrl(resident.fotoUrl || undefined);
        }

        // Verifica novamente se está montado antes de começar a atualizar formulário
        if (!isMounted) return;

        // ===== DADOS PESSOAIS =====
        if (resident.fullName) {
          setValue("nome", resident.fullName);
          setResidentFullName(resident.fullName);
        }
        if (resident.socialName) setValue("nomeSocial", resident.socialName);
        if (resident.email) setValue("email", resident.email);
        if (resident.cns) setValue("cns", resident.cns);
        if (resident.cpf) setValue("cpf", resident.cpf);
        if (resident.rg) setValue("rg", resident.rg);
        if (resident.rgIssuer) setValue("orgaoExpedidor", resident.rgIssuer);
        if (resident.education) setValue("escolaridade", resident.education);
        if (resident.profession) setValue("profissao", resident.profession);
        if (resident.gender) setValue("genero", resident.gender);
        if (resident.civilStatus)
          setValue(
            "estadoCivil",
            mapEstadoCivilFromBackend(resident.civilStatus)
          );
        if (resident.religion) setValue("religiao", resident.religion);
        if (resident.birthDate)
          setValue("dataNascimento", timestamptzToDisplay(resident.birthDate));
        if (resident.nationality)
          setValue("nacionalidade", resident.nationality);
        if (resident.birthCity) setValue("naturalidade", resident.birthCity);
        if (resident.birthState) setValue("ufNascimento", resident.birthState);
        if (resident.motherName) setValue("nomeMae", resident.motherName);
        if (resident.fatherName) setValue("nomePai", resident.fatherName);
        if (resident.status) setValue("status", resident.status);

        // ===== ENDEREÇO ATUAL =====
        if (resident.currentCep) setValue("cepAtual", resident.currentCep);
        if (resident.currentState)
          setValue("estadoAtual", resident.currentState);
        if (resident.currentCity) setValue("cidadeAtual", resident.currentCity);
        if (resident.currentStreet)
          setValue("logradouroAtual", resident.currentStreet);
        if (resident.currentNumber)
          setValue("numeroAtual", resident.currentNumber);
        if (resident.currentComplement)
          setValue("complementoAtual", resident.currentComplement);
        if (resident.currentDistrict)
          setValue("bairroAtual", resident.currentDistrict);
        if (resident.currentPhone)
          setValue("telefoneAtual", resident.currentPhone);

        // ===== PROCEDÊNCIA =====
        if (resident.origin) setValue("procedencia", resident.origin);

        // ===== CONTATOS =====
        if (
          resident.emergencyContacts &&
          Array.isArray(resident.emergencyContacts) &&
          resident.emergencyContacts.length > 0
        ) {
          // Mapear emergencyContacts (inglês) para contatosEmergencia (português do form)
          const contatos = resident.emergencyContacts.map((contact) => ({
            nome: contact.name,
            telefone: contact.phone,
            parentesco: contact.relationship,
          }));
          setValue("contatosEmergencia", contatos);
        }

        // ===== RESPONSÁVEL LEGAL =====
        if (resident.legalGuardianName)
          setValue("responsavelLegalNome", resident.legalGuardianName);
        if (resident.legalGuardianEmail)
          setValue("responsavelLegalEmail", resident.legalGuardianEmail);
        if (resident.legalGuardianCpf)
          setValue("responsavelLegalCpf", resident.legalGuardianCpf);
        if (resident.legalGuardianRg)
          setValue("responsavelLegalRg", resident.legalGuardianRg);
        if (resident.legalGuardianPhone)
          setValue("responsavelLegalTelefone", resident.legalGuardianPhone);
        if (resident.legalGuardianType)
          setValue("responsavelLegalTipo", resident.legalGuardianType);
        if (resident.legalGuardianCep)
          setValue("responsavelLegalCep", resident.legalGuardianCep);
        if (resident.legalGuardianState)
          setValue("responsavelLegalUf", resident.legalGuardianState);
        if (resident.legalGuardianCity)
          setValue("responsavelLegalCidade", resident.legalGuardianCity);
        if (resident.legalGuardianStreet)
          setValue("responsavelLegalLogradouro", resident.legalGuardianStreet);
        if (resident.legalGuardianNumber)
          setValue("responsavelLegalNumero", resident.legalGuardianNumber);
        if (resident.legalGuardianComplement)
          setValue(
            "responsavelLegalComplemento",
            resident.legalGuardianComplement
          );
        if (resident.legalGuardianDistrict)
          setValue("responsavelLegalBairro", resident.legalGuardianDistrict);

        // ===== SAÚDE =====
        if (resident.bloodType)
          setValue(
            "tipoSanguineo",
            mapTipoSanguineoFromBackend(resident.bloodType)
          );
        // Converter altura de metros para centímetros ao carregar (ex: 1.70 → 170)
        if (resident.height)
          setValue("altura", Math.round(resident.height * 100).toString());
        if (resident.weight) setValue("peso", resident.weight.toString());
        if (resident.medicationsOnAdmission)
          setValue(
            "medicamentos",
            resident.medicationsOnAdmission
              .split(",")
              .map((nome) => ({ nome: nome.trim() }))
          );
        if (resident.dependencyLevel)
          setValue("grauDependencia", resident.dependencyLevel);

        // ===== MOBILIDADE =====
        if (resident.mobilityAid !== undefined) {
          setValue("necessitaAuxilioMobilidade", resident.mobilityAid);
        }

        // ===== PERTENCES =====
        // Campo removido - agora gerenciado via módulo ResidentBelongings
        // Acessível em: /dashboard/residentes/:id/pertences

        // ===== CONVÊNIOS =====
        // Processar convênios
        if (resident.healthPlans && Array.isArray(resident.healthPlans)) {
          const convenios = resident.healthPlans.map((plan) => ({
            nome: plan.name,
            numero: plan.cardNumber,
          }));
          setValue("convenios", convenios);
        }

        // ===== ADMISSÃO/DESLIGAMENTO =====
        if (resident.admissionDate)
          setValue(
            "dataAdmissao",
            timestamptzToDisplay(resident.admissionDate)
          );
        if (resident.admissionType)
          setValue("tipoAdmissao", resident.admissionType);
        if (resident.admissionReason)
          setValue("motivoAdmissao", resident.admissionReason);
        if (resident.admissionConditions)
          setValue("condicoesAdmissao", resident.admissionConditions);
        if (resident.dischargeDate)
          setValue(
            "dataDesligamento",
            timestamptzToDisplay(resident.dischargeDate)
          );
        if (resident.dischargeReason)
          setValue("motivoDesligamento", resident.dischargeReason);

        // ===== ACOMODAÇÃO =====
        if (resident.bedId) {
          setValue("leitoNumero", resident.bedId);
        }
        // Armazenar dados na ref para sincronização posterior
        residentDataRef.current = {
          roomId: resident.roomId,
          bedId: resident.bedId,
        };

      } catch (error: unknown) {
        // Ignora erros de abortamento
        if (error.name === "AbortError") {
          console.log("Requisição cancelada");
          return;
        }

        if (isMounted) {
          console.error("❌ Erro ao carregar residente:", error);
          // Apenas mostra o erro, mas NÃO navega automaticamente
          // (evita navegação indesejada quando o usuário volta de uma aba de visualização de documento)
          toast.error(
            `Erro ao carregar dados do residente: ${
              error.response?.data?.message || error.message
            }`
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadResident();

    // Cleanup function
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [id, navigate, setValue]);

  // Função genérica para buscar CEP (consolidada das 3 anteriores)
  const handleBuscarCep = useCallback(
    async (
      cep: string,
      prefix: "atual" | "procedencia" | "responsavelLegal"
    ) => {
      const cepLimpo = cep.replace(/\D/g, "");
      if (cepLimpo.length === 8) {
        const endereco = await buscarCEP(cepLimpo);
        if (endereco) {
          const fieldMapping = {
            atual: {
              estado: "estadoAtual",
              cidade: "cidadeAtual",
              logradouro: "logradouroAtual",
              bairro: "bairroAtual",
              complemento: "complementoAtual",
            },
            procedencia: {
              estado: "estadoProcedencia",
              cidade: "cidadeProcedencia",
              logradouro: "logradouroProcedencia",
              bairro: "bairroProcedencia",
              complemento: "complementoProcedencia",
            },
            responsavelLegal: {
              estado: "responsavelLegalUf",
              cidade: "responsavelLegalCidade",
              logradouro: "responsavelLegalLogradouro",
              bairro: "responsavelLegalBairro",
              complemento: "responsavelLegalComplemento",
            },
          };
          const fields = fieldMapping[prefix];
          setValue(fields.estado as keyof ResidentFormData, endereco.estado);
          setValue(fields.cidade as keyof ResidentFormData, endereco.cidade);
          setValue(
            fields.logradouro as keyof ResidentFormData,
            endereco.logradouro
          );
          setValue(fields.bairro as keyof ResidentFormData, endereco.bairro);
          if (endereco.complemento) {
            setValue(
              fields.complemento as keyof ResidentFormData,
              endereco.complemento
            );
          }
        }
      }
    },
    [setValue]
  );

  const onSubmit = async (data: ResidentFormData) => {
    console.log("🚀 onSubmit chamado. isEditMode:", isEditMode, "id:", id);
    console.log("📋 Dados do formulário:", data);
    console.log(
      "🔍 Estado atual - isLoading:",
      isLoading,
      "isUploading:",
      isUploading
    );
    console.log("🔍 Erros de validação:", errors);
    try {
      console.log("✓ Entrando no try block");
      setIsUploading(true);

      // ========================================
      // FASE 1: Upload de arquivos para MinIO
      // ========================================
      let fotoUrl = null;
      const documentosPessoaisUrls: string[] = [];
      const documentosEnderecoUrls: string[] = [];
      const documentosResponsavelUrls: string[] = [];
      let laudoMedicoUrl = null;
      let convenioArquivoUrl = null;
      let termoAdmissaoUrl = null;
      const consentimentosUrls: string[] = [];

      try {
        // Upload da foto
        if (data.foto && data.foto instanceof File) {
          setUploadProgress("Enviando foto...");
          fotoUrl = await uploadFile(data.foto, "photos");
          console.log("Foto enviada:", fotoUrl);
        }

        // Upload de documentos pessoais (array)
        if (
          data.documentosPessoaisUrls &&
          Array.isArray(data.documentosPessoaisUrls)
        ) {
          setUploadProgress("Enviando documentos pessoais...");
          for (const file of data.documentosPessoaisUrls) {
            if (file instanceof File) {
              const url = await uploadFile(file, "documents");
              documentosPessoaisUrls.push(url);
            }
          }
          console.log("Documentos pessoais enviados:", documentosPessoaisUrls);
        }

        // Upload de documentos de endereço (array)
        if (
          data.documentosEnderecoUrls &&
          Array.isArray(data.documentosEnderecoUrls)
        ) {
          setUploadProgress("Enviando documentos de endereço...");
          for (const file of data.documentosEnderecoUrls) {
            if (file instanceof File) {
              const url = await uploadFile(file, "documents");
              documentosEnderecoUrls.push(url);
            }
          }
          console.log(
            "Documentos de endereço enviados:",
            documentosEnderecoUrls
          );
        }

        // Upload de documentos do responsável (array)
        if (
          data.responsavelLegalDocumentosUrls &&
          Array.isArray(data.responsavelLegalDocumentosUrls)
        ) {
          setUploadProgress("Enviando documentos do responsável...");
          for (const file of data.responsavelLegalDocumentosUrls) {
            if (file instanceof File) {
              const url = await uploadFile(file, "documents");
              documentosResponsavelUrls.push(url);
            }
          }
          console.log(
            "Documentos do responsável enviados:",
            documentosResponsavelUrls
          );
        }

        // Upload de laudo médico
        if (data.laudoMedico && data.laudoMedico instanceof File) {
          setUploadProgress("Enviando laudo médico...");
          laudoMedicoUrl = await uploadFile(data.laudoMedico, "medical");
          console.log("Laudo médico enviado:", laudoMedicoUrl);
        }

        // Upload de arquivo do convênio
        if (
          data.convenios?.[0]?.arquivo &&
          data.convenios[0].arquivo instanceof File
        ) {
          setUploadProgress("Enviando arquivo do convênio...");
          convenioArquivoUrl = await uploadFile(
            data.convenios[0].arquivo,
            "documents"
          );
          console.log("Arquivo do convênio enviado:", convenioArquivoUrl);
        }

        // Upload de termo de admissão
        if (data.termoAdmissao && data.termoAdmissao instanceof File) {
          setUploadProgress("Enviando termo de admissão...");
          termoAdmissaoUrl = await uploadFile(data.termoAdmissao, "documents");
          console.log("Termo de admissão enviado:", termoAdmissaoUrl);
        }

        // Upload de consentimento LGPD
        if (data.consentimentoLgpd && data.consentimentoLgpd instanceof File) {
          setUploadProgress("Enviando consentimento LGPD...");
          const url = await uploadFile(data.consentimentoLgpd, "documents");
          consentimentosUrls.push(url);
          console.log("Consentimento LGPD enviado:", url);
        }

        // Upload de consentimento de imagem
        if (
          data.consentimentoImagem &&
          data.consentimentoImagem instanceof File
        ) {
          setUploadProgress("Enviando consentimento de imagem...");
          const url = await uploadFile(data.consentimentoImagem, "documents");
          consentimentosUrls.push(url);
          console.log("Consentimento de imagem enviado:", url);
        }

        setUploadProgress("Uploads concluídos! Salvando residente...");
      } catch (uploadError: unknown) {
        console.error("Erro ao fazer upload:", uploadError);
        const errorMessage = (uploadError as { message?: string }).message || 'Erro desconhecido';
        alert(`❌ Erro ao fazer upload dos arquivos: ${errorMessage}`);
        setIsUploading(false);
        setUploadProgress("");
        return;
      }

      // ========================================
      // FASE 2: Transformar dados para o backend
      // ========================================

      // NOTA: tenantId NÃO deve ser enviado - backend extrai do JWT automaticamente
      // Ver: docs/architecture/multi-tenancy.md

      const payload: Record<string, unknown> = {
        // 1. Dados Pessoais - NOMES EM INGLÊS (camelCase)
        fullName: data.nome,
        socialName: data.nomeSocial || null,
        email: data.email || null,
        cpf: data.cpf || null,
        rg: data.rg || null,
        rgIssuer: data.orgaoExpedidor || null,
        education: data.escolaridade || null,
        profession: data.profissao || null,
        cns: data.cns?.replace(/\s/g, "") || null,
        gender: data.genero || "NAO_INFORMADO",
        civilStatus: mapEstadoCivilToBackend(data.estadoCivil),
        religion: data.religiao || null,
        birthDate: displayToDate(data.dataNascimento),
        nationality: data.nacionalidade || "Brasileira",
        birthCity: data.naturalidade || null,
        birthState: data.ufNascimento || null,
        motherName: data.nomeMae || null,
        fatherName: data.nomePai || null,
        // Só inclui fotoUrl se houver nova foto (evita sobrescrever foto existente)
        ...(fotoUrl ? { fotoUrl } : {}),

        // 2. Endereço Atual - NOMES EM INGLÊS
        currentCep: data.cepAtual || null,
        currentState: data.estadoAtual || null,
        currentCity: data.cidadeAtual || null,
        currentStreet: data.logradouroAtual || null,
        currentNumber: data.numeroAtual || null,
        currentComplement: data.complementoAtual || null,
        currentDistrict: data.bairroAtual || null,
        currentPhone: data.telefoneAtual || null,

        // Procedência - Campo livre
        origin: data.procedencia || null,

        // 3. Contatos de Emergência - Array JSON
        emergencyContacts: (data.contatosEmergencia || [])
          .filter((c) => c.nome || c.telefone || c.parentesco)
          .map((c) => ({
            name: c.nome || "",
            phone: c.telefone || "",
            relationship: c.parentesco || "",
          })),

        // 4. Responsável Legal - NOMES EM INGLÊS
        legalGuardianName: data.responsavelLegalNome || null,
        legalGuardianEmail: data.responsavelLegalEmail || null,
        legalGuardianCpf: data.responsavelLegalCpf || null,
        legalGuardianRg: data.responsavelLegalRg || null,
        legalGuardianPhone: data.responsavelLegalTelefone || null,
        legalGuardianType:
          data.responsavelLegalTipo && data.responsavelLegalTipo.trim()
            ? data.responsavelLegalTipo
            : undefined,
        legalGuardianCep: data.responsavelLegalCep || null,
        legalGuardianState: data.responsavelLegalUf || null,
        legalGuardianCity: data.responsavelLegalCidade || null,
        legalGuardianStreet: data.responsavelLegalLogradouro || null,
        legalGuardianNumber: data.responsavelLegalNumero || null,
        legalGuardianComplement: data.responsavelLegalComplemento || null,
        legalGuardianDistrict: data.responsavelLegalBairro || null,

        // 5. Admissão - NOMES EM INGLÊS
        admissionDate: displayToDate(data.dataAdmissao),
        admissionType:
          data.tipoAdmissao && data.tipoAdmissao.trim()
            ? data.tipoAdmissao
            : undefined,
        admissionReason: data.motivoAdmissao || null,
        admissionConditions: data.condicoesAdmissao || null,
        dischargeDate: displayToDate(data.dataDesligamento) || null,
        dischargeReason: data.motivoDesligamento || null,

        // 6. Saúde - Apenas dados físicos/cadastrais (dados clínicos evolutivos gerenciados na aba Perfil Clínico)
        bloodType: mapTipoSanguineoToBackend(data.tipoSanguineo),
        // Converter altura de centímetros para metros antes de salvar (ex: 170 → 1.70)
        height: data.altura ? parseFloat(data.altura) / 100 : null,
        weight: data.peso ? parseFloat(data.peso.replace(",", ".")) : null,
        dependencyLevel: data.grauDependencia || null,
        mobilityAid: data.necessitaAuxilioMobilidade || false,
        medicationsOnAdmission:
          (data.medicamentos || [])
            .filter((m) => m.nome && m.nome.trim())
            .map((m) => m.nome.trim())
            .join(", ") || null,

        // 7. Convênios/Planos de Saúde - Array JSON
        healthPlans: (data.convenios || [])
          .filter((c) => c.nome || c.numero)
          .map((c, index) => ({
            name: c.nome || "",
            cardNumber: c.numero || null,
            cardUrl:
              index === 0 && convenioArquivoUrl ? convenioArquivoUrl : null,
          })),

        // 8. Pertences - Removido (agora gerenciado via módulo ResidentBelongings)
        // Acessível em: /dashboard/residentes/:id/pertences

        // 9. Acomodação - Apenas o bedId é necessário
        // O backend pode obter o roomId através do bedId
        bedId:
          data.leitoNumero &&
          data.leitoNumero.trim() &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            data.leitoNumero.trim()
          )
            ? data.leitoNumero.trim()
            : undefined,
        // roomId não é mais necessário pois pode ser obtido pelo bedId
      };

      // ========================================
      // Em modo edição, adicionar status e changeReason
      // ========================================
      if (isEditMode) {
        if (data.status) {
          payload.status = data.status;
        }
        // changeReason é OBRIGATÓRIO no modo edição (RDC 502/2021 Art. 39)
        payload.changeReason = data.changeReason;
      }

      console.log("✅ Payload para API:", payload);

      // ========================================
      // FASE 3: Enviar para backend (POST ou PATCH)
      // ========================================
      let response;

      if (isEditMode) {
        // MODO EDIÇÃO: PATCH /residents/:id
        console.log(`🌐 Enviando PATCH para /residents/${id}`);
        setUploadProgress("Atualizando residente...");
        response = await api.patch(`/residents/${id}`, payload);
        console.log("✅ Residente atualizado:", response.data);
      } else {
        // MODO CRIAÇÃO: POST /residents
        console.log("🌐 Enviando POST para /residents");
        setUploadProgress("Criando residente...");
        response = await api.post("/residents", payload);
        console.log("✅ Residente criado:", response.data);
      }

      setIsUploading(false);
      setUploadProgress("");

      // Invalidar cache do React Query para atualizar detalhes, listas e métricas
      if (isEditMode && id) {
        queryClient.invalidateQueries({ queryKey: tenantKey("residents", id) });
        queryClient.invalidateQueries({
          queryKey: tenantKey("residents", id, "history"),
        });
      }
      queryClient.invalidateQueries({ queryKey: tenantKey("residents", "list") });
      queryClient.invalidateQueries({ queryKey: tenantKey("residents", "stats") });
      queryClient.invalidateQueries({ queryKey: tenantKey("beds") });

      // Mostrar toast de sucesso
      toast.success(
        isEditMode
          ? "Residente atualizado com sucesso!"
          : "Residente criado com sucesso!"
      );

      // Redirecionar para lista
      if (isEditMode) {
        // Modo edição: apenas volta para lista
        navigate("/dashboard/residentes");
      } else {
        // Modo criação: redireciona para lista com state para abrir modal de documentos
        navigate("/dashboard/residentes", {
          state: {
            openDocumentsModal: true,
            residentId: response.data.id,
            residentName: response.data.fullName,
          },
        });
      }
    } catch (error: unknown) {
      console.error("❌ Erro ao salvar residente:", error);

      // Extrair mensagem de erro do backend ou fallback
      let mensagem = "Erro desconhecido";
      if (error.response?.data?.message) {
        mensagem = error.response.data.message;
      } else if (error.response?.data?.error) {
        mensagem = error.response.data.error;
      } else if (error.message) {
        mensagem = error.message;
      }

      // Log detalhado para debug
      console.log("Erro completo:", {
        statusCode: error.response?.status,
        message: mensagem,
        data: error.response?.data,
      });

      // Mostrar toast de erro
      toast.error(`Erro ao salvar residente: ${mensagem}`);
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleCancel = () => {
    // Cancelar e voltar para a lista
    navigate("/dashboard/residentes");
  };

  const handleClearForm = () => {
    // Limpar o formulário (recarrega a página)
    window.location.reload();
  };

  const handleVoltar = () => {
    window.location.href = "/dashboard/residentes";
  };

  return (
    <Page maxWidth="wide">
      {/* Plan Limit Warning Dialog */}
      {subscriptionData && !isEditMode && (
        <PlanLimitWarningDialog
          type="residents"
          open={showLimitDialog}
          onOpenChange={setShowLimitDialog}
          onProceed={() => {
            // Usuário decidiu prosseguir mesmo com o aviso
            // Dialog fecha automaticamente via onProceed
          }}
          usage={{
            current: subscriptionData.usage.activeResidents,
            max: subscriptionData.plan.maxResidents,
          }}
        />
      )}

      <PageHeader
        title={
          readOnly
            ? "Visualizar Residente"
            : isEditMode
            ? "Editar Residente"
            : "Novo Residente"
        }
        subtitle={
          readOnly
            ? "Visualização dos dados cadastrais do residente"
            : isEditMode
            ? "Atualize as informações do residente"
            : "Cadastre um novo residente na ILPI"
        }
        onBack={handleVoltar}
        actions={
          <div className="flex gap-2">
            {readOnly && (
              <>
                <Button
                  onClick={() => navigate(`/dashboard/residentes/${id}`)}
                  variant="default"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Prontuário
                </Button>
                <Button
                  onClick={() => setHistoryDrawerOpen(true)}
                  variant="outline"
                >
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </Button>
                <Button
                  onClick={() => navigate(`/dashboard/residentes/${id}/edit`)}
                  variant="default"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            )}
            {isEditMode && !readOnly && id && (
              <Button
                onClick={() => setHistoryDrawerOpen(true)}
                variant="outline"
                type="button"
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
            )}
          </div>
        }
      />

      {/* Loading State durante carregamento de dados */}
      {isLoading && (
        <div className="text-center p-8 bg-info/10 rounded-lg border border-info/30">
          <p className="text-info font-semibold">
            Carregando dados do residente...
          </p>
        </div>
      )}

      {/* Status (apenas em modo edição, não em visualização) */}
      {isEditMode && !readOnly && (
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-danger block mb-3">
                Status
              </Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "Ativo" ? "success" : "outline"}
                      onClick={() => field.onChange("Ativo")}
                    >
                      Ativo
                    </Button>
                    <Button
                      type="button"
                      variant={
                        field.value === "Inativo" ? "warning" : "outline"
                      }
                      onClick={() => field.onChange("Inativo")}
                    >
                      Inativo
                    </Button>
                    <Button
                      type="button"
                      variant={
                        field.value === "Falecido" ? "danger" : "outline"
                      }
                      onClick={() => field.onChange("Falecido")}
                    >
                      Falecido
                    </Button>
                  </div>
                )}
              />
              {errors.status && (
                <p className="text-sm text-danger mt-2">
                  {errors.status.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campo de Motivo da Alteração - Obrigatório no modo edição (RDC 502/2021) */}
      {isEditMode && !readOnly && (
        <Card className="shadow-lg mb-6 border-warning">
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="changeReason" className="text-base font-semibold">
                Motivo da Alteração <span className="text-danger">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Conforme RDC 502/2021 Art. 39, é obrigatório documentar o motivo
                de qualquer alteração no prontuário do residente.
              </p>
              <Textarea
                id="changeReason"
                placeholder="Ex: Atualização do endereço conforme solicitação da família em 12/12/2025..."
                {...register("changeReason")}
                className={cn(
                  "min-h-[100px]",
                  errors.changeReason && "border-danger focus:border-danger"
                )}
              />
              {errors.changeReason && (
                <p className="text-sm text-danger mt-2">
                  {errors.changeReason.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres. Este motivo ficará registrado
                permanentemente no histórico de alterações.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs/Abas */}
      <form
        onSubmit={handleSubmit(onSubmit, (errors) => {
          console.error("❌ Erros de validação detectados:", errors);
          // Mostrar o primeiro erro encontrado
          const firstError = Object.entries(errors)[0];
          if (firstError) {
            const [field, error] = firstError;
            toast.error(`Erro no campo "${field}": ${error.message}`);
          }
        })}
      >
        {/* ========== FORMULÁRIO TABULAR (4 ABAS) ========== */}
        <Tabs defaultValue="tab1" className="mb-8 space-y-6">
          {/* ========== NAVEGAÇÃO DE ABAS ========== */}
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-max">
              <TabsTrigger value="tab1" className="flex items-center gap-2 whitespace-nowrap">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Dados & Contatos</span>
              </TabsTrigger>
              <TabsTrigger value="tab2" className="flex items-center gap-2 whitespace-nowrap">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Endereços & Responsável</span>
              </TabsTrigger>
              <TabsTrigger value="tab3" className="flex items-center gap-2 whitespace-nowrap">
                <HeartPulse className="h-4 w-4" />
                <span className="hidden sm:inline">Saúde & Convênios</span>
              </TabsTrigger>
              <TabsTrigger value="tab4" className="flex items-center gap-2 whitespace-nowrap">
                <BedDouble className="h-4 w-4" />
                <span className="hidden sm:inline">Admissão & Acomodação</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <fieldset disabled={readOnly}>
            {/* ========== ABA 1: DADOS PESSOAIS + CONTATOS ========== */}
            {/* Aba 1 - Dados Pessoais */}
            <TabsContent
              value="tab1"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Collapsible title="Informações Básicas" defaultOpen={true}>
                    <div className="grid grid-cols-12 gap-4">
                      {/* Foto - Componente moderno */}
                      <div className="col-span-12 md:col-span-3">
                        <PhotoUploadNew
                          onPhotoSelect={(file) => {
                            setValue("foto", file);
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setCurrentPhotoUrl(
                                  event.target?.result as string
                                );
                              };
                              reader.readAsDataURL(file);
                            } else {
                              setCurrentPhotoUrl(undefined);
                            }
                          }}
                          currentPhotoUrl={currentPhotoUrl}
                          label="Foto do Residente"
                          description="Clique ou arraste a foto do residente"
                          maxSize={5}
                        />
                      </div>

                      {/* Campos à direita da foto */}
                      <div className="col-span-12 md:col-span-9">
                        <div className="grid gap-4">
                          <div>
                            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                              Nome completo
                            </Label>
                            <Input {...register("nome")} className="mt-2" />
                            {errors.nome && (
                              <p className="text-sm text-danger mt-1">
                                {errors.nome.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Nome social</Label>
                            <Input
                              {...register("nomeSocial")}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              {...register("email")}
                              type="email"
                              placeholder="email@exemplo.com"
                              className="mt-2"
                            />
                            {errors.email && (
                              <p className="text-sm text-danger mt-1">
                                {errors.email.message}
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>CNS</Label>
                              <Controller
                                name="cns"
                                control={control}
                                render={({ field }) => (
                                  <MaskedInput
                                    mask="999 9999 9999 9999"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    validation={cnsValidation}
                                    className="mt-2"
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Outros campos */}
                      <div className="col-span-12 md:col-span-4">
                        <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                          CPF
                        </Label>
                        <Controller
                          name="cpf"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="999.999.999-99"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              validation={cpfValidation}
                              className="mt-2"
                            />
                          )}
                        />
                        {errors.cpf && (
                          <p className="text-sm text-danger mt-1">
                            {errors.cpf.message}
                          </p>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>RG</Label>
                        <Controller
                          name="rg"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99.999.999-9"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Órgão Expedidor</Label>
                        <Input
                          {...register("orgaoExpedidor")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Escolaridade</Label>
                        <Input {...register("escolaridade")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Profissão</Label>
                        <Input {...register("profissao")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                          Gênero
                        </Label>
                        <Controller
                          name="genero"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MASCULINO">
                                  Masculino
                                </SelectItem>
                                <SelectItem value="FEMININO">
                                  Feminino
                                </SelectItem>
                                <SelectItem value="OUTRO">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.genero && (
                          <p className="text-sm text-danger mt-1">
                            {errors.genero.message}
                          </p>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Estado Civil</Label>
                        <Controller
                          name="estadoCivil"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Solteiro(a)">
                                  Solteiro(a)
                                </SelectItem>
                                <SelectItem value="Casado(a)">
                                  Casado(a)
                                </SelectItem>
                                <SelectItem value="Divorciado(a)">
                                  Divorciado(a)
                                </SelectItem>
                                <SelectItem value="Viúvo(a)">
                                  Viúvo(a)
                                </SelectItem>
                                <SelectItem value="União Estável">
                                  União Estável
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Religião</Label>
                        <Input {...register("religiao")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                          Data de Nascimento
                        </Label>
                        <Controller
                          name="dataNascimento"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99/99/9999"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="DD/MM/AAAA"
                              className="mt-2"
                            />
                          )}
                        />
                        {(() => {
                          const feedback = getBirthDateFeedback();
                          if (!feedback) return null;

                          // Define cor: verde (success) se válido e mostra idade, vermelho se inválido, cinza se informativo
                          const colorClass = feedback.message.startsWith('✓')
                            ? 'text-success'
                            : (feedback.isError ? 'text-danger' : 'text-muted-foreground');

                          return (
                            <p className={`text-xs mt-1 ${colorClass}`}>
                              {feedback.message}
                            </p>
                          );
                        })()}
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Nacionalidade</Label>
                        <Input
                          {...register("nacionalidade")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-5">
                        <Label>Local de Nascimento</Label>
                        <Input {...register("naturalidade")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>UF</Label>
                        <Controller
                          name="ufNascimento"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {BR_STATES.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Nome da Mãe</Label>
                        <Input {...register("nomeMae")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Nome do Pai</Label>
                        <Input {...register("nomePai")} className="mt-2" />
                      </div>
                    </div>
                  </Collapsible>

                  <Collapsible
                    title="Contatos de Emergência"
                    defaultOpen={false}
                  >
                    <div className="space-y-3 mb-4">
                      {contatosFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex gap-3 items-end p-4 bg-muted rounded-lg"
                        >
                          <div className="flex-1">
                            <Label className="text-xs">Nome completo</Label>
                            <Input
                              {...register(`contatosEmergencia.${index}.nome`)}
                              className="mt-1"
                            />
                          </div>
                          <div style={{ width: "180px" }}>
                            <Label className="text-xs">Telefone</Label>
                            <Controller
                              name={`contatosEmergencia.${index}.telefone`}
                              control={control}
                              render={({ field }) => (
                                <MaskedInput
                                  mask="(99) 99999-9999"
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  placeholder="(99) 99999-9999"
                                  className="mt-1"
                                />
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">Parentesco</Label>
                            <Input
                              {...register(
                                `contatosEmergencia.${index}.parentesco`
                              )}
                              className="mt-1"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeContato(index)}
                            className="text-danger hover:text-danger/80"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendContato({
                          nome: "",
                          telefone: "",
                          parentesco: "",
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </Collapsible>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========== ABA 2: ENDEREÇOS + RESPONSÁVEL ========== */}
            <TabsContent
              value="tab2"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Collapsible title="Endereço Atual" defaultOpen={true}>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 md:col-span-3">
                        <Label>CEP</Label>
                        <Controller
                          name="cepAtual"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99999-999"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                field.onChange(e);
                                handleBuscarCep(e.target.value, "atual");
                              }}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>UF</Label>
                        <Input
                          {...register("estadoAtual")}
                          maxLength={2}
                          className="mt-2 uppercase"
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            register("estadoAtual").onChange(e);
                          }}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-7">
                        <Label>Cidade</Label>
                        <Input {...register("cidadeAtual")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Logradouro</Label>
                        <Input
                          {...register("logradouroAtual")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>Número</Label>
                        <Input
                          {...register("numeroAtual")}
                          placeholder="S/N"
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Complemento</Label>
                        <Input
                          {...register("complementoAtual")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-5">
                        <Label>Bairro</Label>
                        <Input {...register("bairroAtual")} className="mt-2" />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Telefone</Label>
                        <Controller
                          name="telefoneAtual"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="(99) 99999-9999"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </Collapsible>

                  <Collapsible title="Procedência" defaultOpen={true}>
                    <div className="grid grid-cols-12 gap-4 mb-6">
                      <div className="col-span-12">
                        <Label>Procedência do Residente</Label>
                        <Input
                          {...register("procedencia")}
                          placeholder="Ex: Domicílio próprio, residência de familiar, hospital, outra ILPI..."
                          maxLength={255}
                          className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Origem do residente antes da admissão
                        </p>
                      </div>
                    </div>
                  </Collapsible>

                  <Collapsible title="Responsável Legal" defaultOpen={true}>
                    <div className="grid grid-cols-12 gap-4 mb-6">
                      <div className="col-span-12 md:col-span-6">
                        <Label>Nome Completo</Label>
                        <Input
                          {...register("responsavelLegalNome")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Email</Label>
                        <Input
                          {...register("responsavelLegalEmail")}
                          type="email"
                          placeholder="email@exemplo.com"
                          className="mt-2"
                        />
                        {errors.responsavelLegalEmail && (
                          <p className="text-sm text-danger mt-1">
                            {errors.responsavelLegalEmail.message}
                          </p>
                        )}
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>CPF</Label>
                        <Controller
                          name="responsavelLegalCpf"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="999.999.999-99"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>RG</Label>
                        <Controller
                          name="responsavelLegalRg"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99.999.999-9"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Label>Telefone</Label>
                        <Controller
                          name="responsavelLegalTelefone"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="(99) 99999-9999"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-9">
                        <Label>Tipo de Responsabilidade</Label>
                        <Controller
                          name="responsavelLegalTipo"
                          control={control}
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Curador">Curador</SelectItem>
                                <SelectItem value="Procurador">
                                  Procurador
                                </SelectItem>
                                <SelectItem value="Responsável Familiar (Convencional)">
                                  Responsável Familiar (Convencional)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-4 mt-6">
                      Endereço do Responsável
                    </h3>

                    <div className="grid grid-cols-12 gap-4 mb-6">
                      <div className="col-span-12 md:col-span-3">
                        <Label>CEP</Label>
                        <Controller
                          name="responsavelLegalCep"
                          control={control}
                          render={({ field }) => (
                            <MaskedInput
                              mask="99999-999"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                field.onChange(e);
                                handleBuscarCep(
                                  e.target.value,
                                  "responsavelLegal"
                                );
                              }}
                              className="mt-2"
                            />
                          )}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>UF</Label>
                        <Input
                          {...register("responsavelLegalUf")}
                          maxLength={2}
                          className="mt-2 uppercase"
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                            register("responsavelLegalUf").onChange(e);
                          }}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-7">
                        <Label>Cidade</Label>
                        <Input
                          {...register("responsavelLegalCidade")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <Label>Logradouro</Label>
                        <Input
                          {...register("responsavelLegalLogradouro")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <Label>Número</Label>
                        <Input
                          {...register("responsavelLegalNumero")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12 md:col-span-4">
                        <Label>Complemento</Label>
                        <Input
                          {...register("responsavelLegalComplemento")}
                          className="mt-2"
                        />
                      </div>

                      <div className="col-span-12">
                        <Label>Bairro</Label>
                        <Input
                          {...register("responsavelLegalBairro")}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </Collapsible>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========== ABA 3: SAÚDE + CONVÊNIOS ========== */}
            <TabsContent
              value="tab3"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Collapsible title="Dados de Saúde" defaultOpen={true}>
                    {/* Seção 1: Dados Antropométricos */}
                    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-bold text-foreground mb-4 pb-2 border-b border-border">
                        Dados Antropométricos
                      </h3>
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-3">
                          <Label>Tipo Sanguíneo</Label>
                          <Controller
                            name="tipoSanguineo"
                            control={control}
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? ""}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue placeholder="..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A+">A+</SelectItem>
                                  <SelectItem value="A-">A-</SelectItem>
                                  <SelectItem value="B+">B+</SelectItem>
                                  <SelectItem value="B-">B-</SelectItem>
                                  <SelectItem value="AB+">AB+</SelectItem>
                                  <SelectItem value="AB-">AB-</SelectItem>
                                  <SelectItem value="O+">O+</SelectItem>
                                  <SelectItem value="O-">O-</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        <div className="col-span-12 md:col-span-3">
                          <Label>Altura (cm)</Label>
                          <Input
                            {...register("altura")}
                            type="text"
                            inputMode="numeric"
                            placeholder="170"
                            className="mt-2"
                            onChange={(e) => {
                              // Remove tudo que não é dígito
                              const value = e.target.value.replace(/\D/g, "");
                              // Limita a 3 dígitos (máximo 300 cm)
                              const limited = value.slice(0, 3);
                              e.target.value = limited;
                              register("altura").onChange(e);
                            }}
                          />
                        </div>

                        <div className="col-span-12 md:col-span-3">
                          <Label>Peso (kg)</Label>
                          <Input
                            {...register("peso")}
                            placeholder="70,5"
                            className="mt-2"
                          />
                        </div>

                        <div className="col-span-12 md:col-span-3">
                          <Label>Grau de Dependência</Label>
                          <Controller
                            name="grauDependencia"
                            control={control}
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value ?? ""}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue placeholder="..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Grau I - Independente">
                                    Grau I - Independente
                                  </SelectItem>
                                  <SelectItem value="Grau II - Parcialmente Dependente">
                                    Grau II - Parcialmente Dependente
                                  </SelectItem>
                                  <SelectItem value="Grau III - Totalmente Dependente">
                                    Grau III - Totalmente Dependente
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção 2: Situação de Saúde */}
                    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-bold text-foreground mb-4 pb-2 border-b border-border">
                        Situação de Saúde
                      </h3>
                      <div className="grid grid-cols-12 gap-4">
                        {/* Medicamentos com Badges */}
                        <div className="col-span-12 md:col-span-4">
                          <Label className="text-sm font-semibold mb-2 block">
                            Medicamentos
                          </Label>
                          {medicamentosFields.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2 p-2 bg-info/10 border border-info/30 rounded min-h-[40px]">
                              {medicamentosFields.map((field, index) => {
                                const nome = watch(
                                  `medicamentos.${index}.nome`
                                );
                                return nome && nome.trim() ? (
                                  <div
                                    key={field.id}
                                    className="flex items-center gap-1 bg-info text-info-foreground px-2 py-0.5 rounded-full text-xs font-medium"
                                  >
                                    <span>{nome}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeMedicamento(index)}
                                      className="hover:opacity-80"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Input
                              ref={medicamentosInputRef}
                              placeholder="Adicionar..."
                              className="text-xs h-8"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  e.currentTarget.value.trim()
                                ) {
                                  e.preventDefault();
                                  appendMedicamento({
                                    nome: e.currentTarget.value,
                                  });
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                if (
                                  medicamentosInputRef.current?.value.trim()
                                ) {
                                  appendMedicamento({
                                    nome: medicamentosInputRef.current.value,
                                  });
                                  medicamentosInputRef.current.value = "";
                                }
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Dados clínicos evolutivos removidos - agora gerenciados na aba "Perfil Clínico" do prontuário */}

                        <div className="col-span-12">
                          <div className="flex items-center gap-2 p-3 bg-info/10 border border-info/30 rounded-lg">
                            <Controller
                              name="necessitaAuxilioMobilidade"
                              control={control}
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  id="necessitaAuxilioMobilidade"
                                />
                              )}
                            />
                            <Label
                              htmlFor="necessitaAuxilioMobilidade"
                              className="font-semibold cursor-pointer text-sm"
                            >
                              Necessita auxílio para mobilidade
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Collapsible>

                  <Collapsible title="Convênios" defaultOpen={false}>
                    <div className="space-y-3 mb-4">
                      {conveniosFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="border border-border rounded-lg p-4"
                        >
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs">
                                Nome do Convênio
                              </Label>
                              <Input
                                {...register(`convenios.${index}.nome`)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs">
                                Número da Carteirinha
                              </Label>
                              <Input
                                {...register(`convenios.${index}.numero`)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-12 md:col-span-1 flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeConvenio(index)}
                                className="text-danger hover:text-danger/80 w-full md:w-auto"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendConvenio({ nome: "", numero: "" })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Convênio
                    </Button>
                  </Collapsible>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========== ABA 4: ADMISSÃO + PERTENCES + ACOMODAÇÃO ========== */}
            <TabsContent
              value="tab4"
              forceMount
              className="data-[state=inactive]:hidden"
            >
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-3">
                      <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                        Data de Admissão
                      </Label>
                      <Controller
                        name="dataAdmissao"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="99/99/9999"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="DD/MM/AAAA"
                            className="mt-2"
                          />
                        )}
                      />
                      {errors.dataAdmissao && (
                        <p className="text-sm text-danger mt-1">
                          {errors.dataAdmissao.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <Label>Tipo de Admissão</Label>
                      <Controller
                        name="tipoAdmissao"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? ""}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Voluntária">
                                Voluntária
                              </SelectItem>
                              <SelectItem value="Involuntária">
                                Involuntária
                              </SelectItem>
                              <SelectItem value="Judicial">Judicial</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-5">
                      <Label>Motivo da Admissão</Label>
                      <Input {...register("motivoAdmissao")} className="mt-2" />
                    </div>

                    <div className="col-span-12">
                      <Label>Condições de Admissão</Label>
                      <Textarea
                        {...register("condicoesAdmissao")}
                        rows={2}
                        className="mt-2"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Label>Data de Desligamento</Label>
                      <Controller
                        name="dataDesligamento"
                        control={control}
                        render={({ field }) => (
                          <MaskedInput
                            mask="99/99/9999"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="DD/MM/AAAA"
                            className="mt-2"
                          />
                        )}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-9">
                      <Label>Motivo do Desligamento</Label>
                      <Input
                        {...register("motivoDesligamento")}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Seção: Pertences do Residente */}
                  {/* Seção: Pertences - Removida */}
                  {/* Pertences agora são gerenciados no módulo próprio, acessível via menu do residente */}
                  {/* Acesse: Menu do Residente (⋮) → Pertences */}

                  {/* Seção: Acomodação (Busca rápida de leito) */}
                  <h3 className="text-lg font-semibold mb-4">Acomodação</h3>
                  <Controller
                    name="leitoNumero"
                    control={control}
                    render={({ field }) => (
                      <BedSearchCombobox
                        value={field.value ?? ""}
                        onValueChange={(bedId) => {
                          field.onChange(bedId);
                        }}
                        disabled={readOnly}
                        placeholder="Digite o código do leito, prédio ou quarto..."
                      />
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </fieldset>
        </Tabs>

        {/* ========== FEEDBACK DE UPLOAD ========== */}
        {isUploading && (
          <div className="text-center mb-6 p-4 bg-info/10 rounded-lg border border-info/30">
            <p className="text-info font-semibold">{uploadProgress}</p>
          </div>
        )}

        {/* ========== CARD INFORMATIVO ========== */}
        {!readOnly ? (
          <Card className="bg-info/10 border-info/30 mb-6">
            <CardContent className="p-4">
              <p className="text-sm text-info">
                O preenchimento dos dados é exigido pelo{" "}
                <strong>Art. 33 da RDC 502/2021 (ANVISA)</strong> e pelo{" "}
                <strong>Art. 50, XV do Estatuto da Pessoa Idosa</strong>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-info/10 border-info/30 mb-6">
            <CardContent className="p-4">
              <p className="text-sm text-info">
                A instituição deve manter{" "}
                <strong>ficha individual completa e atualizada</strong>,
                incluindo identificação, histórico de saúde, contatos e
                responsável legal.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ========== BOTÕES DE AÇÃO ========== */}
        {!readOnly && (
          <div className="text-center space-x-4">
            <Button
              type="submit"
              disabled={isUploading || isLoading}
              variant="default"
              className="hover:shadow-lg hover:-translate-y-0.5 transition-all px-8 py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                console.log(
                  "🔘 Botão clicado! isLoading:",
                  isLoading,
                  "isUploading:",
                  isUploading
                );
                console.log("🔘 Botão disabled:", isUploading || isLoading);
              }}
            >
              {isUploading
                ? isEditMode
                  ? "Atualizando..."
                  : "Salvando..."
                : isEditMode
                ? "Atualizar Residente"
                : "Salvar Residente"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
              className="px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </Button>

            {/* Limpar Formulário: apenas no modo criação */}
            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearForm}
                disabled={isUploading}
                className="px-8 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Limpar Formulário
              </Button>
            )}
          </div>
        )}
      </form>

      {/* Drawer de Histórico de Alterações */}
      <ResidentHistoryDrawer
        residentId={id}
        residentName={residentFullName}
        open={historyDrawerOpen}
        onOpenChange={setHistoryDrawerOpen}
      />
    </Page>
  );
}

export default ResidentForm;
