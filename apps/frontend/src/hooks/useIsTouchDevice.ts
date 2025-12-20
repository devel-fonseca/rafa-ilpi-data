import { useState, useEffect } from 'react';

/**
 * Hook para detectar se o dispositivo suporta touch (mobile/tablet)
 *
 * Retorna true se o dispositivo tem capacidade de touch, indicando
 * que provavelmente é um mobile ou tablet onde drag-and-drop pode
 * não funcionar adequadamente.
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Verificar se o dispositivo suporta eventos de touch
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    setIsTouchDevice(hasTouchScreen);
  }, []);

  return isTouchDevice;
}
