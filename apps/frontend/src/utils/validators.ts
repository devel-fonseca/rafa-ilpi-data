/**
 * Utilitários de validação de documentos brasileiros
 */

/**
 * Valida CPF
 * @param cpf - CPF com ou sem máscara
 * @returns true se válido, false caso contrário
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, '')

  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false

  // Valida os dígitos verificadores
  let soma = 0
  let resto

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo.substring(9, 10))) return false

  soma = 0
  // Segundo dígito verificador
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo.substring(10, 11))) return false

  return true
}

/**
 * Valida CNS (Cartão Nacional de Saúde)
 * @param cns - CNS com ou sem máscara
 * @returns true se válido, false caso contrário
 */
export function validarCNS(cns: string): boolean {
  // Remove caracteres não numéricos
  const cnsLimpo = cns.replace(/\D/g, '')

  // Verifica se tem 15 dígitos
  if (cnsLimpo.length !== 15) return false

  // CNS começa com 1 ou 2 (provisório) ou 7, 8, 9 (definitivo)
  const primeiroDigito = cnsLimpo.charAt(0)
  if (!['1', '2', '7', '8', '9'].includes(primeiroDigito)) return false

  // Validação para CNS definitivo (começa com 7, 8 ou 9)
  if (['7', '8', '9'].includes(primeiroDigito)) {
    let soma = 0
    for (let i = 0; i < 15; i++) {
      soma += parseInt(cnsLimpo.charAt(i)) * (15 - i)
    }
    return soma % 11 === 0
  }

  // Validação para CNS provisório (começa com 1 ou 2)
  if (['1', '2'].includes(primeiroDigito)) {
    let soma = 0
    for (let i = 0; i < 11; i++) {
      soma += parseInt(cnsLimpo.charAt(i)) * (15 - i)
    }

    const resto = soma % 11
    let dv = 11 - resto
    dv = dv === 11 ? 0 : dv

    if (dv === 10) {
      soma = 0
      for (let i = 0; i < 11; i++) {
        soma += parseInt(cnsLimpo.charAt(i)) * (15 - i)
      }
      soma += 2
      const resto2 = soma % 11
      dv = 11 - resto2
      dv = dv === 11 ? 0 : dv
      return dv.toString().padStart(4, '0') === cnsLimpo.substring(11)
    }

    return dv.toString().padStart(4, '0') === cnsLimpo.substring(11)
  }

  return false
}

/**
 * Valida CEP
 * @param cep - CEP com ou sem máscara
 * @returns true se válido, false caso contrário
 */
export function validarCEP(cep: string): boolean {
  const cepLimpo = cep.replace(/\D/g, '')
  return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo)
}

/**
 * Retorna mensagem de validação para CPF
 */
export function getMensagemValidacaoCPF(cpf: string): { valido: boolean; mensagem: string } {
  if (!cpf || cpf.replace(/\D/g, '').length === 0) {
    return { valido: true, mensagem: '' }
  }

  const valido = validarCPF(cpf)
  return {
    valido,
    mensagem: valido ? '✓ CPF válido' : '✗ CPF inválido'
  }
}

/**
 * Retorna mensagem de validação para CNS
 */
export function getMensagemValidacaoCNS(cns: string): { valido: boolean; mensagem: string } {
  if (!cns || cns.replace(/\D/g, '').length === 0) {
    return { valido: true, mensagem: '' }
  }

  const valido = validarCNS(cns)
  return {
    valido,
    mensagem: valido ? '✓ CNS válido' : '✗ CNS inválido'
  }
}
