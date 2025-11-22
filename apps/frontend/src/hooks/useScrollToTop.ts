import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Hook que faz scroll para o topo da página quando a rota muda
 */
export function useScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}
