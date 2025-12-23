import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

/**
 * DTO para preparar o token de aceite do contrato
 * (usado no step 4 do registro, antes de criar o tenant)
 */
export class PrepareAcceptanceDto {
  @ApiProperty({
    example: 'uuid-do-contrato',
    description: 'ID do contrato sendo aceito',
  })
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({
    example: '192.168.1.1',
    description: 'Endereço IP do cliente',
  })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    description: 'User Agent do navegador',
  })
  @IsString()
  @IsNotEmpty()
  userAgent: string;
}

/**
 * DTO para renderizar contrato com variáveis
 */
export class RenderContractDto {
  @ApiProperty({
    example: 'uuid-do-contrato',
    description: 'ID do contrato a renderizar',
  })
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({
    example: { tenant: { name: 'ILPI Exemplo' }, plan: { price: 299 } },
    description: 'Variáveis para substituição no template',
    required: false,
  })
  @IsOptional()
  variables?: Record<string, any>;
}
