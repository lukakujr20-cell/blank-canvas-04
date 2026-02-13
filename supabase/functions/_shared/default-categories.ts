// Default categories by locale for new restaurant setup
export const DEFAULT_CATEGORIES: Record<string, string[]> = {
  'pt-BR': ['Geral', 'Bebidas', 'Vegetais', 'Proteínas', 'Laticínios'],
  'es': ['General', 'Bebidas', 'Vegetales', 'Proteínas', 'Lácteos'],
  'en': ['General', 'Beverages', 'Vegetables', 'Proteins', 'Dairy'],
};

export function getCategoriesForLocale(locale: string): string[] {
  return DEFAULT_CATEGORIES[locale] || DEFAULT_CATEGORIES['es'];
}
