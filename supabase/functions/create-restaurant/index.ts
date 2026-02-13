import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { setupNewRestaurant } from "../_shared/restaurant-setup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requester) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requester is super_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "permission_denied", message: "Only super_admin can create restaurants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { restaurant_name, owner_email, owner_password, owner_name, locale, currency } = await req.json();

    if (!restaurant_name || !owner_email || !owner_password || !owner_name) {
      return new Response(
        JSON.stringify({ error: "bad_request", message: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === owner_email);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "email_exists", message: "Email already registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create the owner user in auth
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
    });

    if (createUserError || !newUser.user) {
      console.error("Error creating user:", createUserError);
      return new Response(
        JSON.stringify({ error: "create_user_failed", message: "Failed to create owner user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerId = newUser.user.id;

    // 2. Create the restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .insert({
        name: restaurant_name,
        owner_id: ownerId,
        status: "active",
      })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      console.error("Error creating restaurant:", restaurantError);
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      return new Response(
        JSON.stringify({ error: "create_restaurant_failed", message: "Failed to create restaurant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create the owner's profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: ownerId,
        full_name: owner_name,
        email: owner_email,
        restaurant_id: restaurant.id,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }

    // 4. Assign 'host' role
    const { error: assignRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: ownerId, role: "host" });

    if (assignRoleError) {
      console.error("Error assigning role:", assignRoleError);
    }

    // 5. Setup restaurant defaults (tables, categories, settings)
    await setupNewRestaurant(supabaseAdmin, restaurant.id, {
      locale: locale || 'es',
      currency: currency || 'EUR',
      restaurantName: restaurant_name,
    });

    console.log(`Restaurant "${restaurant_name}" created successfully with full setup`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        restaurant_id: restaurant.id,
        owner_id: ownerId,
        message: "Restaurant and owner created successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "internal_error", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
