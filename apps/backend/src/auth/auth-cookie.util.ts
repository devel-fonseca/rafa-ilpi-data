import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

const DEFAULT_REFRESH_COOKIE_NAME = 'rafa_ilpi_refresh_token';
const DEFAULT_REFRESH_COOKIE_PATH = '/api/auth';
const DEFAULT_REFRESH_COOKIE_SAME_SITE: CookieOptions['sameSite'] = 'lax';

function parseTimeToMs(time: string): number {
  const unit = time.slice(-1);
  const value = Number.parseInt(time.slice(0, -1), 10);

  if (Number.isNaN(value)) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function getRefreshCookieSameSite(
  configService: ConfigService,
): CookieOptions['sameSite'] {
  const configuredValue = configService
    .get<string>('AUTH_REFRESH_COOKIE_SAMESITE')
    ?.toLowerCase();

  if (
    configuredValue === 'lax' ||
    configuredValue === 'strict' ||
    configuredValue === 'none'
  ) {
    return configuredValue;
  }

  return DEFAULT_REFRESH_COOKIE_SAME_SITE;
}

function getRefreshCookieSecure(configService: ConfigService): boolean {
  const configuredValue = configService.get<string>('AUTH_REFRESH_COOKIE_SECURE');

  if (configuredValue === 'true') {
    return true;
  }

  if (configuredValue === 'false') {
    return false;
  }

  return configService.get<string>('NODE_ENV') === 'production';
}

function getRefreshCookieDomain(
  configService: ConfigService,
): string | undefined {
  return configService.get<string>('AUTH_REFRESH_COOKIE_DOMAIN') || undefined;
}

export function getRefreshCookieName(configService: ConfigService): string {
  return (
    configService.get<string>('AUTH_REFRESH_COOKIE_NAME') ||
    DEFAULT_REFRESH_COOKIE_NAME
  );
}

export function getRefreshCookieMaxAge(configService: ConfigService): number {
  const refreshTtl = configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  return parseTimeToMs(refreshTtl);
}

export function buildRefreshCookieOptions(
  configService: ConfigService,
): CookieOptions {
  const sameSite = getRefreshCookieSameSite(configService);
  const secure = sameSite === 'none' ? true : getRefreshCookieSecure(configService);

  return {
    httpOnly: true,
    secure,
    sameSite,
    path:
      configService.get<string>('AUTH_REFRESH_COOKIE_PATH') ||
      DEFAULT_REFRESH_COOKIE_PATH,
    domain: getRefreshCookieDomain(configService),
    maxAge: getRefreshCookieMaxAge(configService),
  };
}

export function setRefreshTokenCookie(
  response: Response,
  configService: ConfigService,
  refreshToken: string,
): void {
  response.cookie(
    getRefreshCookieName(configService),
    refreshToken,
    buildRefreshCookieOptions(configService),
  );
}

export function clearRefreshTokenCookie(
  response: Response,
  configService: ConfigService,
): void {
  const { maxAge: _maxAge, ...clearOptions } =
    buildRefreshCookieOptions(configService);

  response.clearCookie(
    getRefreshCookieName(configService),
    clearOptions,
  );
}

export function resolveRefreshTokenFromRequest(
  request: Request,
  configService: ConfigService,
  bodyRefreshToken?: string,
): string | undefined {
  const cookieToken = request.cookies?.[getRefreshCookieName(configService)];
  return cookieToken || bodyRefreshToken;
}
