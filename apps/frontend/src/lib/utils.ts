import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInYears } from "date-fns"
import { extractDateOnly } from "@/utils/dateHelpers"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(birthDate: string): number {
  // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
  const dayKey = extractDateOnly(birthDate)
  const birth = new Date(dayKey + 'T12:00:00')
  return differenceInYears(new Date(), birth)
}
