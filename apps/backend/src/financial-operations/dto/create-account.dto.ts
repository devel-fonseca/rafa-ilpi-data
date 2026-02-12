import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialAccountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: '001' })
  @IsString()
  @Length(1, 10)
  bankCode!: string;

  @ApiProperty({ example: 'Banco do Brasil' })
  @IsString()
  @Length(2, 100)
  bankName!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(1, 20)
  branch!: string;

  @ApiProperty({ example: '12345-6' })
  @IsString()
  @Length(1, 50)
  accountNumber!: string;

  @ApiProperty({ enum: FinancialAccountType })
  @IsEnum(FinancialAccountType)
  accountType!: FinancialAccountType;

  @ApiProperty({ example: 'Conta principal operacional' })
  @IsString()
  @Length(2, 100)
  accountName!: string;

  @ApiPropertyOptional({ example: 'chave-pix@ilpi.com.br' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  pixKey?: string;

  @ApiPropertyOptional({ example: 'EMAIL' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  pixKeyType?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: '0.00',
    description: 'Saldo inicial em formato decimal com ponto',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'currentBalance deve ser decimal positivo com até 2 casas',
  })
  currentBalance?: string;
}

