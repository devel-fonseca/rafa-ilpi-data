import { z } from 'zod'

export function requiredString(
  label: string,
  minLength = 1,
  minMessage?: string,
) {
  return z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z
      .string()
      .trim()
      .min(minLength, minMessage || `${label} é obrigatório`),
  )
}
