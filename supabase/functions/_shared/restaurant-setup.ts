import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCategoriesForLocale } from "./default-categories.ts";

/**
 * Creates default setup for a new restaurant:
 * - 5 default tables
 * - Default categories based on locale
 * - Restaurant settings (IVA, currency, locale)
 */
export async function setupNewRestaurant(
  supabaseAdmin: ReturnType<typeof createClient>,
  restaurantId: string,
  options: {
    locale?: string;
    currency?: string;
    ivaRate?: number;
    restaurantName?: string;
  } = {}
) {
  const locale = options.locale || 'es';
  const currency = options.currency || 'EUR';
  const ivaRate = options.ivaRate ?? 0;

  // 1. Create 5 default tables
  const defaultTables = Array.from({ length: 5 }, (_, i) => ({
    table_number: i + 1,
    capacity: 4,
    status: "free",
    restaurant_id: restaurantId,
  }));

  const { error: tablesError } = await supabaseAdmin
    .from("restaurant_tables")
    .insert(defaultTables);

  if (tablesError) {
    console.error("Error creating default tables:", tablesError);
  }

  // 2. Create default categories
  const categoryNames = getCategoriesForLocale(locale);
  const defaultCategories = categoryNames.map((name) => ({
    name,
    restaurant_id: restaurantId,
  }));

  const { error: categoriesError } = await supabaseAdmin
    .from("categories")
    .insert(defaultCategories);

  if (categoriesError) {
    console.error("Error creating default categories:", categoriesError);
  }

  // 3. Create restaurant settings
  const { error: settingsError } = await supabaseAdmin
    .from("restaurant_settings")
    .insert({
      restaurant_id: restaurantId,
      iva_rate: ivaRate,
      currency,
      locale,
      restaurant_display_name: options.restaurantName || null,
    });

  if (settingsError) {
    console.error("Error creating restaurant settings:", settingsError);
  }

  console.log(`Restaurant setup complete: ${categoryNames.length} categories, 5 tables, settings created`);
}
