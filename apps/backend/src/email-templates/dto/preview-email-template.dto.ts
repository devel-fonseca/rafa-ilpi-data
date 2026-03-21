import { IsNotEmpty, IsObject } from 'class-validator';

export class PreviewEmailTemplateDto {
  @IsNotEmpty()
  jsonContent: Record<string, unknown>; // { content: htmlString }

  @IsObject()
  variables: Record<string, unknown>; // Dados mockados para preview
}
