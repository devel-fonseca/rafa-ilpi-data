import { IsNotEmpty, IsObject } from 'class-validator';

export class PreviewEmailTemplateDto {
  @IsNotEmpty()
  jsonContent: Record<string, unknown>; // Easy Email JSON structure

  @IsObject()
  variables: Record<string, unknown>; // Dados mockados para preview
}
