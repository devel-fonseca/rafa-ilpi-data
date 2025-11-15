import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SelectTenantDto {
  @ApiProperty({
    example: 'usuario@email.com',
    description: 'Email do usuário',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SenhaSegura123!',
    description: 'Senha do usuário',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'uuid-do-tenant',
    description: 'ID do tenant selecionado',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}