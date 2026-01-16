import axios from 'axios'

/**
 * Captura o endereço IP público do cliente
 * Usa o serviço ipify.org (gratuito, sem autenticação)
 */
export async function getClientIP(): Promise<string> {
  try {
    const response = await axios.get<{ ip: string }>('https://api.ipify.org?format=json')
    return response.data.ip
  } catch (error) {
    console.warn('Erro ao capturar IP do cliente:', error)
    return 'unknown'
  }
}
