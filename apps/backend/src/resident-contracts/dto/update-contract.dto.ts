import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateContractDto } from './create-contract.dto';

/**
 * DTO para atualização de metadados do contrato
 * Permite atualizar todos os campos exceto os assinantes (que são imutáveis)
 */
export class UpdateContractDto extends PartialType(
  OmitType(CreateContractDto, ['signatories']),
) {}
