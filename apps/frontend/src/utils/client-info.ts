/**
 * Captura o endereço IP público do cliente
 * Usa o serviço ipify.org (gratuito, sem autenticação)
 */
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.warn('Erro ao capturar IP do cliente:', error)
    return 'unknown'
  }
}
