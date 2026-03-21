import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token deve ser uma string' })
  @IsOptional()
  refreshToken?: string;
}
