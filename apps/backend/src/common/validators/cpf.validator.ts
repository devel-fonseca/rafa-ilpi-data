import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Valida CPF (Cadastro de Pessoa Física)
 * Aceita formatos: xxx.xxx.xxx-xx ou xxxxxxxxxxx
 * Valida dígitos verificadores conforme algoritmo oficial
 */
export function IsCPF(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCPF',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // Remove formatação (pontos e traços)
          const cpf = value.replace(/[^\d]/g, '');

          // Validações básicas
          if (cpf.length !== 11) return false;
          if (/^(\d)\1{10}$/.test(cpf)) return false; // Rejeita sequências iguais (000.000.000-00, 111.111.111-11, etc)

          // Validação dos dígitos verificadores
          return validateCPFCheckDigits(cpf);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'CPF inválido. Formato esperado: xxx.xxx.xxx-xx ou apenas 11 dígitos numéricos';
        },
      },
    });
  };
}

/**
 * Valida os dígitos verificadores do CPF usando o algoritmo de módulo 11
 */
function validateCPFCheckDigits(cpf: string): boolean {
  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;

  if (firstDigit !== parseInt(cpf.charAt(9))) return false;

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;

  return secondDigit === parseInt(cpf.charAt(10));
}
