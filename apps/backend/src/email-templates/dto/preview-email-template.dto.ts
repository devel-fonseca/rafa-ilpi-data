import { IsNotEmpty, IsObject } from 'class-validator';

export class PreviewEmailTemplateDto {
  @IsNotEmpty()
  jsonContent: any; // Easy Email JSON structure

  @IsObject()
  variables: Record<string, any>; // Dados mockados para preview
}
