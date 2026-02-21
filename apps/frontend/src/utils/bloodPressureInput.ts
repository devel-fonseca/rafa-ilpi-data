const BLOOD_PRESSURE_REGEX = /^\d{2,3}\/\d{2,3}$/;

export function sanitizeBloodPressureInput(value: string): string {
  const cleaned = value.replace(/[^\d/]/g, '');
  const firstSlashIndex = cleaned.indexOf('/');

  if (firstSlashIndex === -1) {
    return cleaned.replace(/\D/g, '').slice(0, 3);
  }

  const systolic = cleaned
    .slice(0, firstSlashIndex)
    .replace(/\D/g, '')
    .slice(0, 3);
  const diastolic = cleaned
    .slice(firstSlashIndex + 1)
    .replace(/\D/g, '')
    .slice(0, 3);

  return `${systolic}/${diastolic}`;
}

export function isValidBloodPressureFormat(value?: string | null): boolean {
  if (!value) {
    return true;
  }

  return BLOOD_PRESSURE_REGEX.test(value.trim());
}
