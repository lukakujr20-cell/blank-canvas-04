import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { setupNewRestaurant } from "../_shared/restaurant-setup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  whatsapp?: string;
  role: "super_admin" | "host" | "admin" | "staff" | "cozinha";
  restaurant_name?: string;
  locale?: string;
  currency?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check requester role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Access denied. Role not found." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requesterRole = roleData.role;
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, whatsapp, role, restaurant_name, locale, currency } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, full_name, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["super_admin", "host", "admin", "staff", "cozinha"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HIERARCHY CHECK
    if (requesterRole === 'super_admin') {
      if (role === 'super_admin') {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Cannot create super_admin users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (requesterRole === 'host') {
      if (role === 'host' || role === 'super_admin') {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Hosts can only create admin or staff users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (requesterRole === 'admin') {
      if (role !== 'staff' && role !== 'cozinha') {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Admins can only create staff users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "permission_denied", message: "Staff cannot create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get requester's restaurant_id
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("restaurant_id")
      .eq("id", currentUser.id)
      .single();

    const requesterRestaurantId = requesterProfile?.restaurant_id;

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("User creation failed:", authError.code || "unknown_error");
      if (authError.message?.includes("already") || authError.message?.includes("duplicate")) {
        return new Response(
          JSON.stringify({ error: "email_exists", message: "A user with this email already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "create_failed", message: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "User creation failed - no user returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;
    let assignedRestaurantId = requesterRestaurantId;

    // If creating a HOST, auto-create a new restaurant for them
    if (role === 'host') {
      const restName = restaurant_name || `Restaurante de ${full_name}`;
      const { data: restaurant, error: restaurantError } = await supabaseAdmin
        .from("restaurants")
        .insert({
          name: restName,
          owner_id: newUserId,
          status: "active",
        })
        .select()
        .single();

      if (restaurantError || !restaurant) {
        console.error("Error creating restaurant for host:", restaurantError);
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return new Response(
          JSON.stringify({ error: "create_restaurant_failed", message: "Failed to create restaurant for host" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      assignedRestaurantId = restaurant.id;

      // Setup defaults (tables, categories, settings)
      await setupNewRestaurant(supabaseAdmin, restaurant.id, {
        locale: locale || 'es',
        currency: currency || 'EUR',
        restaurantName: restName,
      });

      console.log(`Auto-created restaurant "${restName}" for new host ${email}`);
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      full_name,
      email,
      whatsapp: whatsapp || null,
      restaurant_id: assignedRestaurantId,
    });

    if (profileError) {
      console.error("Profile creation failed:", profileError.code);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "profile_failed", message: "Failed to create user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role,
    });

    if (roleInsertError) {
      console.error("Role assignment failed:", roleInsertError.code);
      await supabaseAdmin.from("profiles").delete().eq("id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "role_failed", message: "Failed to assign user role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User created successfully with role: ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email: authData.user.email,
          full_name,
          role,
          restaurant_id: assignedRestaurantId,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected server error occurred");
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: "server_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
