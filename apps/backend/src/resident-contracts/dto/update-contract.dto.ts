import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateResidentContractDto } from './create-contract.dto';

/**
 * DTO para atualização de metadados do contrato
 * Permite atualizar todos os campos exceto os assinantes (que são imutáveis)
 */
export class UpdateResidentContractDto extends PartialType(
  OmitType(CreateResidentContractDto, ['signatories']),
) {}
