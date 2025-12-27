import { IsEmail, IsObject } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  to: string;

  @IsObject()
  variables: Record<string, any>; // Dados de teste para substituir variáveis
}
