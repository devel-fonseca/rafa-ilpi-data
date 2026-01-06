import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidDateOnly, isValidTime } from '../../utils/date.helpers';

/**
 * Validator para campos de data civil (YYYY-MM-DD)
 */
@ValidatorConstraint({ async: false })
export class IsDateOnlyConstraint implements ValidatorConstraintInterface {
  validate(dateStr: any) {
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
  return function (object: Object, propertyName: string) {
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
  validate(timeStr: any) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimeStringConstraint,
    });
  };
}
