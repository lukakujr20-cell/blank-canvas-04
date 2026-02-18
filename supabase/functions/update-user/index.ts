import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify token using anon client (supports ES256 used by Lovable Cloud)
    const token = authHeader.replace("Bearer ", "");
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: requester }, error: userError } = await supabaseAnon.auth.getUser(token);

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (userError || !requester) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = requester.id;

    // Get requesting user's role
    const { data: requestingUserRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single();

    if (roleError || !requestingUserRole) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "User role not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requesterRole = requestingUserRole.role;

    const { user_id, full_name, email, password, whatsapp, role } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "invalid_request", message: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user's role
    const { data: targetUserRole, error: targetRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .single();

    if (targetRoleError || !targetUserRole) {
      return new Response(
        JSON.stringify({ error: "not_found", message: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetRole = targetUserRole.role;

    // HIERARCHY CHECK - super_admin bypasses all checks
    if (requesterRole !== 'super_admin') {
      const roleLevel = (r: string): number => {
        switch (r) {
          case 'host': return 3;
          case 'admin': return 2;
          case 'staff': return 1;
          case 'cozinha': return 1;
          default: return 0;
        }
      };

      const requesterLevel = roleLevel(requesterRole);
      const targetLevel = roleLevel(targetRole);

      if (requesterLevel <= targetLevel && requestingUserId !== user_id) {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Cannot manage users at same or higher level" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (requesterRole === 'admin' && role && (role === 'admin' || role === 'host')) {
        return new Response(
          JSON.stringify({ error: "permission_denied", message: "Admin cannot assign admin or host roles" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update profile if full_name or whatsapp provided
    if (full_name || whatsapp !== undefined) {
      const updateData: Record<string, string> = {};
      if (full_name) updateData.full_name = full_name;
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp;

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user_id);

      if (profileError) {
        console.error("Profile update failed:", profileError.code || "unknown_error");
        return new Response(
          JSON.stringify({ error: "update_failed", message: "Failed to update profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update email if provided
    if (email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { email }
      );

      if (emailError) {
        console.error("Email update failed:", emailError.code || "unknown_error");
        if (emailError.message?.includes("already") || emailError.message?.includes("duplicate")) {
          return new Response(
            JSON.stringify({ error: "email_exists", message: "Email already in use" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "update_failed", message: "Failed to update email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also update email in profiles table
      await supabaseAdmin
        .from("profiles")
        .update({ email })
        .eq("id", user_id);
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password }
      );

      if (passwordError) {
        console.error("Password update failed:", passwordError.code || "unknown_error");
        return new Response(
          JSON.stringify({ error: "update_failed", message: "Failed to update password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update role if provided and different
    if (role && role !== targetRole) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", user_id);

      if (roleUpdateError) {
        console.error("Role update failed:", roleUpdateError.code || "unknown_error");
        return new Response(
          JSON.stringify({ error: "update_failed", message: "Failed to update role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("User updated successfully");

    return new Response(
      JSON.stringify({ success: true, message: "User updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
