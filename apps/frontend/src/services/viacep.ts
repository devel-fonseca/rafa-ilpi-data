/**
 * Serviço de integração com ViaCEP
 */
import axios from 'axios'

export interface ViaCEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia: string
  ddd: string
  siafi: string
  erro?: boolean
}

export interface EnderecoFormatado {
  cep: string
  estado: string
  cidade: string
  logradouro: string
  bairro: string
  complemento?: string
}

/**
 * Busca endereço pelo CEP usando ViaCEP
 * @param cep - CEP com ou sem máscara
 * @returns Dados do endereço ou null se não encontrado
 */
export async function buscarCEP(cep: string): Promise<EnderecoFormatado | null> {
  try {
    // Remove caracteres não numéricos
    const cepLimpo = cep.replace(/\D/g, '')

    // Valida formato do CEP
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos')
    }

    // Chama API do ViaCEP
    const response = await axios.get<ViaCEPResponse>(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const data = response.data

    // Verifica se o CEP foi encontrado
    if (data.erro) {
      return null
    }

    // Formata resposta
    return {
      cep: data.cep,
      estado: data.uf,
      cidade: data.localidade,
      logradouro: data.logradouro,
      bairro: data.bairro,
      complemento: data.complemento
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    return null
  }
}

/**
 * Hook para buscar CEP automaticamente quando o usuário digitar 8 dígitos
 * @param cep - CEP com ou sem máscara
 * @param onSuccess - Callback chamado quando o CEP é encontrado
 * @param onError - Callback chamado quando ocorre erro
 */
export function useBuscarCEP(
  onSuccess: (endereco: EnderecoFormatado) => void,
  onError?: (mensagem: string) => void
) {
  return async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')

    if (cepLimpo.length === 8) {
      const endereco = await buscarCEP(cepLimpo)

      if (endereco) {
        onSuccess(endereco)
      } else {
        onError?.('CEP não encontrado')
      }
    }
  }
}
