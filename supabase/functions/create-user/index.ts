import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify they're admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if current user is admin using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, whatsapp, role } = body;

    // Validate input
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
        JSON.stringify({ error: "Role must be 'super_admin', 'host', 'admin', 'staff' or 'cozinha'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get requester's restaurant_id
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("restaurant_id")
      .eq("user_id", currentUser.id)
      .single();

    const requesterRestaurantId = requesterProfile?.restaurant_id;

    // HIERARCHY CHECK
    // super_admin can create any role except other super_admins
    // Host can create host, admin, staff within their restaurant
    // Admin can only create staff within their restaurant
    if (requesterRole === 'super_admin') {
      // super_admin can create hosts and below, but not other super_admins
      if (role === 'super_admin') {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Cannot create super_admin users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (requesterRole === 'host') {
      // Host can create admin and staff, but not host or super_admin
      if (role === 'host' || role === 'super_admin') {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Hosts can only create admin or staff users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (requesterRole === 'admin') {
      if (role !== 'staff') {
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

    // Create user using admin API (doesn't affect current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("User creation failed:", authError.code || "unknown_error");
      
      // Check for duplicate email
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

    // Create profile with email, restaurant_id and whatsapp
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      full_name,
      email,
      whatsapp: whatsapp || null,
      restaurant_id: requesterRestaurantId,
    });

    if (profileError) {
      console.error("Profile creation failed:", profileError.code || "unknown_error");
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "profile_failed", message: "Failed to create user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user role
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role,
    });

    if (roleInsertError) {
      console.error("Role assignment failed:", roleInsertError.code || "unknown_error");
      // Try to clean up
      await supabaseAdmin.from("profiles").delete().eq("user_id", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
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
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          role,
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
