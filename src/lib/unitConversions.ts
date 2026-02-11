/**
 * Gastro unit dictionary and conversion utilities for 3-level unit system.
 * 
 * Level 1: Purchase Unit (e.g., Caixa, Fardo, KG)
 * Level 2: Consumption Sub-unit (e.g., 1 Caixa = 10 Queijos)
 * Level 3: Recipe Unit (optional, e.g., 1 Queijo = 20 Fatias)
 * 
 * Total conversion: 1 purchase unit = units_per_package × recipe_units_per_consumption recipe units
 */

export interface UnitGroup {
  label: string;
  units: { value: string; label: string }[];
}

export const GASTRO_UNIT_GROUPS: UnitGroup[] = [
  {
    label: 'Peso',
    units: [
      { value: 'kg', label: 'Quilograma (kg)' },
      { value: 'g', label: 'Grama (g)' },
      { value: 'mg', label: 'Miligrama (mg)' },
    ],
  },
  {
    label: 'Volume',
    units: [
      { value: 'L', label: 'Litro (L)' },
      { value: 'ml', label: 'Mililitro (ml)' },
      { value: 'gotas', label: 'Gotas' },
    ],
  },
  {
    label: 'Culinárias',
    units: [
      { value: 'colher_cha', label: 'Colher de chá (~5ml)' },
      { value: 'colher_sopa', label: 'Colher de sopa (~15ml)' },
      { value: 'xicara', label: 'Xícara (~240ml)' },
      { value: 'copo', label: 'Copo (~200ml)' },
      { value: 'dose', label: 'Dose (~50ml)' },
    ],
  },
  {
    label: 'Operacionais',
    units: [
      { value: 'un', label: 'Unidade (un)' },
      { value: 'fatia', label: 'Fatia' },
      { value: 'pedaco', label: 'Pedaço' },
      { value: 'ramo', label: 'Ramo (ervas)' },
      { value: 'pitada', label: 'Pitada' },
    ],
  },
  {
    label: 'Embalagem',
    units: [
      { value: 'cx', label: 'Caixa (cx)' },
      { value: 'pct', label: 'Pacote (pct)' },
      { value: 'fardo', label: 'Fardo' },
      { value: 'dz', label: 'Dúzia (dz)' },
      { value: 'lata', label: 'Lata' },
      { value: 'garrafa', label: 'Garrafa' },
      { value: 'saco', label: 'Saco' },
    ],
  },
];

/** Flat list of all units for quick lookup */
export const ALL_UNITS = GASTRO_UNIT_GROUPS.flatMap((g) => g.units);

/** Get display label for a unit value */
export function getUnitLabel(value: string): string {
  return ALL_UNITS.find((u) => u.value === value)?.label || value;
}

/** Get short label for a unit (just the abbreviation) */
export function getUnitShort(value: string): string {
  return value;
}

/**
 * Calculate how many purchase units to deduct from stock
 * given a recipe quantity.
 * 
 * @param recipeQty - quantity in recipe units (from technical_sheets.quantity_per_sale)
 * @param unitsPerPackage - consumption units per purchase unit (Level 1→2)
 * @param recipeUnitsPerConsumption - recipe units per consumption unit (Level 2→3), null if no 3rd level
 * @returns quantity to deduct from current_stock (in purchase units)
 * 
 * Example: Recipe needs 2 fatias. 1 Caixa = 10 Queijos, 1 Queijo = 20 Fatias.
 * Total fatias per caixa = 10 × 20 = 200.
 * Deduction = 2 / 200 = 0.01 caixas.
 */
export function calculateStockDeduction(
  recipeQty: number,
  unitsPerPackage: number,
  recipeUnitsPerConsumption: number | null
): number {
  const effectiveUnitsPerPackage = unitsPerPackage || 1;

  if (recipeUnitsPerConsumption && recipeUnitsPerConsumption > 0) {
    // 3-level: recipe_qty is in recipe units
    // total recipe units per purchase = unitsPerPackage × recipeUnitsPerConsumption
    const totalRecipeUnitsPerPurchase = effectiveUnitsPerPackage * recipeUnitsPerConsumption;
    return recipeQty / totalRecipeUnitsPerPurchase;
  }

  // 2-level: recipe_qty is in consumption units
  return recipeQty / effectiveUnitsPerPackage;
}
