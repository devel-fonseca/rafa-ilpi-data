import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsObject,
  Matches,
} from 'class-validator';

export class CreateDailyRecordDto {
  @ApiProperty({
    description: 'ID do residente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @ApiProperty({
    enum: [
      'HIGIENE',
      'ALIMENTACAO',
      'HIDRATACAO',
      'MONITORAMENTO',
      'ELIMINACAO',
      'COMPORTAMENTO',
      'HUMOR',
      'SONO',
      'PESO',
      'INTERCORRENCIA',
      'ATIVIDADES',
      'VISITA',
      'OUTROS',
    ],
    description: 'Tipo de registro diário',
    example: 'HIGIENE',
  })
  @IsEnum([
    'HIGIENE',
    'ALIMENTACAO',
    'HIDRATACAO',
    'MONITORAMENTO',
    'ELIMINACAO',
    'COMPORTAMENTO',
    'HUMOR',
    'SONO',
    'PESO',
    'INTERCORRENCIA',
    'ATIVIDADES',
    'VISITA',
    'OUTROS',
  ])
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Data do registro (ISO 8601)',
    example: '2025-11-15',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Horário do registro no formato HH:mm',
    example: '07:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Formato de hora inválido. Use HH:mm (ex: 07:00, 14:30)',
  })
  time: string;

  @ApiProperty({
    description:
      'Dados específicos do tipo de registro. A estrutura varia conforme o type.',
    example: {
      tipoBanho: 'Chuveiro',
      condicaoPele: 'Normal',
      hidratanteAplicado: true,
      higieneBucal: true,
      trocaFralda: false,
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiProperty({
    description: 'Nome do profissional responsável pelo registro',
    example: 'Ana Silva',
  })
  @IsString()
  @IsNotEmpty()
  recordedBy: string;

  @ApiProperty({
    required: false,
    description: 'Observações gerais (opcional)',
    example: 'Residente muito colaborativo durante o procedimento',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  // Campos opcionais para INTERCORRENCIA
  @ApiProperty({
    required: false,
    enum: ['CLINICA', 'ASSISTENCIAL', 'ADMINISTRATIVA'],
    description: 'Categoria da intercorrência',
  })
  @IsEnum(['CLINICA', 'ASSISTENCIAL', 'ADMINISTRATIVA'])
  @IsOptional()
  incidentCategory?: string;

  @ApiProperty({
    required: false,
    enum: ['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'],
    description: 'Severidade da intercorrência',
  })
  @IsEnum(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA'])
  @IsOptional()
  incidentSeverity?: string;

  @ApiProperty({
    required: false,
    description: 'Subtipo clínico',
  })
  @IsOptional()
  @IsString()
  incidentSubtypeClinical?: string;

  @ApiProperty({
    required: false,
    description: 'Subtipo assistencial',
  })
  @IsOptional()
  @IsString()
  incidentSubtypeAssist?: string;

  @ApiProperty({
    required: false,
    description: 'Subtipo administrativo',
  })
  @IsOptional()
  @IsString()
  incidentSubtypeAdmin?: string;

  @ApiProperty({
    required: false,
    description: 'Indica se é evento sentinela',
  })
  @IsOptional()
  isEventoSentinela?: boolean;

  @ApiProperty({
    required: false,
    description: 'Indica se é doença notificável',
  })
  @IsOptional()
  isDoencaNotificavel?: boolean;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Indicadores RDC relacionados',
  })
  @IsOptional()
  rdcIndicators?: string[];
}
