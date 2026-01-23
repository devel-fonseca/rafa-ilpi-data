import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { startOfDay } from 'date-fns';
import { isValidDateOnly, isValidTime } from '../../utils/date.helpers';

/**
 * Validator para campos de data civil (YYYY-MM-DD)
 */
@ValidatorConstraint({ async: false })
export class IsDateOnlyConstraint implements ValidatorConstraintInterface {
  validate(dateStr: unknown) {
    return typeof dateStr === 'string' && isValidDateOnly(dateStr);
  }

  defaultMessage() {
    return 'Data deve estar no formato YYYY-MM-DD';
  }
}

/**
 * Decorator @IsDateOnly()
 * Valida que a string está no formato YYYY-MM-DD
 *
 * @example
 * export class CreateResidentDto {
 *   @IsDateOnly()
 *   birthDate: string; // "1950-01-01"
 * }
 */
export function IsDateOnly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDateOnlyConstraint,
    });
  };
}

/**
 * Validator para campos de hora (HH:mm)
 */
@ValidatorConstraint({ async: false })
export class IsTimeStringConstraint implements ValidatorConstraintInterface {
  validate(timeStr: unknown) {
    return typeof timeStr === 'string' && isValidTime(timeStr);
  }

  defaultMessage() {
    return 'Horário deve estar no formato HH:mm (ex: 10:00)';
  }
}

/**
 * Decorator @IsTimeString()
 * Valida que a string está no formato HH:mm
 *
 * @example
 * export class CreateDailyRecordDto {
 *   @IsTimeString()
 *   time: string; // "10:30"
 * }
 */
export function IsTimeString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimeStringConstraint,
    });
  };
}

/**
 * Validator para idade mínima (RDC 502/2021 Art. 2º)
 * Valida que o residente tem idade igual ou superior a 60 anos
 */
@ValidatorConstraint({ async: false })
export class MinimumAgeConstraint implements ValidatorConstraintInterface {
  validate(birthDateStr: unknown) {
    if (!birthDateStr || typeof birthDateStr !== 'string') return false;

    // Valida formato YYYY-MM-DD
    if (!isValidDateOnly(birthDateStr)) return false;

    // Calcula idade (new Date() é seguro aqui pois birthDateStr já foi validado como YYYY-MM-DD)
    // eslint-disable-next-line no-restricted-syntax
    const birthDate = new Date(birthDateStr);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // Ajusta se ainda não fez aniversário este ano
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 60;
  }

  defaultMessage() {
    return 'Residente deve ter idade igual ou superior a 60 anos (RDC 502/2021 Art. 2º)';
  }
}

/**
 * Decorator @IsMinimumAge()
 * Valida que a data de nascimento resulta em idade >= 60 anos
 *
 * @example
 * export class CreateResidentDto {
 *   @IsDateOnly()
 *   @IsMinimumAge()
 *   birthDate: string; // "1950-01-01"
 * }
 */
export function IsMinimumAge(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: MinimumAgeConstraint,
    });
  };
}

/**
 * Validator para datas futuras ou atuais (não permite datas passadas)
 */
@ValidatorConstraint({ async: false })
export class IsNotPastDateConstraint implements ValidatorConstraintInterface {
  validate(dateStr: unknown) {
    if (!dateStr || typeof dateStr !== 'string') return false;

    // Valida formato YYYY-MM-DD
    if (!isValidDateOnly(dateStr)) return false;

    // Compara data fornecida com hoje (apenas dia, sem horas)
    const inputDate = new Date(dateStr + 'T12:00:00');
    const today = startOfDay(new Date());

    return inputDate >= today;
  }

  defaultMessage() {
    return 'Data não pode estar no passado';
  }
}

/**
 * Decorator @IsNotPastDate()
 * Valida que a data não é anterior ao dia atual
 *
 * @example
 * export class CreateShiftDto {
 *   @IsDateOnly()
 *   @IsNotPastDate()
 *   date: string; // "2026-01-23"
 * }
 */
export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotPastDateConstraint,
    });
  };
}
