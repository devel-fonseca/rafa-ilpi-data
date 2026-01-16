import { IsEmail, IsObject } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  to: string;

  @IsObject()
  variables: Record<string, unknown>; // Dados de teste para substituir variáveis
}
