import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'PIX' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ example: 'pix' })
  @IsString()
  @Length(2, 50)
  code!: string;

  @ApiPropertyOptional({ example: 'Pagamento instantâneo via PIX' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresManualConfirmation?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowsInstallments?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  maxInstallments?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

