/**
 * Constantes para os tipos de refeição obrigatórias
 * Baseado no padrão existente nos modais de alimentação
 */

export interface MealType {
  value: string; // Nome da refeição (usado no metadata.mealType e no data.refeicao do DailyRecord)
  label: string; // Label em português
  defaultTime: string; // Horário sugerido padrão (HH:mm)
  icon: string; // Emoji representativo
}

export const MEAL_TYPES: MealType[] = [
  {
    value: 'Café da Manhã',
    label: 'Café da Manhã',
    defaultTime: '07:00',
    icon: '☀️',
  },
  {
    value: 'Colação',
    label: 'Colação',
    defaultTime: '09:30',
    icon: '🥐',
  },
  {
    value: 'Almoço',
    label: 'Almoço',
    defaultTime: '12:00',
    icon: '🍽️',
  },
  {
    value: 'Lanche',
    label: 'Lanche',
    defaultTime: '15:00',
    icon: '☕',
  },
  {
    value: 'Jantar',
    label: 'Jantar',
    defaultTime: '18:00',
    icon: '🌙',
  },
  {
    value: 'Ceia',
    label: 'Ceia',
    defaultTime: '20:00',
    icon: '🌜',
  },
];

/**
 * Helper para obter MealType pelo valor
 */
export function getMealTypeByValue(value: string): MealType | undefined {
  return MEAL_TYPES.find((meal) => meal.value === value);
}

/**
 * Helper para validar se é uma refeição válida
 */
export function isValidMealType(value: string): boolean {
  return MEAL_TYPES.some((meal) => meal.value === value);
}
