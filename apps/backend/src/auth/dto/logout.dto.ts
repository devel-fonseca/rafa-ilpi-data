import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString({ message: 'Refresh token deve ser uma string' })
  @IsOptional()
  refreshToken?: string;
}
