import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is authenticated
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { category } = await req.json();

    let responseData: { data?: Record<string, unknown>[]; info?: Record<string, unknown>; message: string } = {
      message: "No data available",
    };

    switch (category) {
      case "users": {
        // Get all auth users using admin API
        const { data: { users }, error } = await supabaseClient.auth.admin.listUsers();
        if (error) throw error;

        responseData = {
          data: users.map((u) => ({
            id: u.id,
            email: u.email || "",
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at || "",
            email_confirmed_at: u.email_confirmed_at || "",
            role: u.role || "",
            app_metadata: JSON.stringify(u.app_metadata || {}),
            user_metadata: JSON.stringify(u.user_metadata || {}),
          })),
          message: `${users.length} users exported`,
        };
        break;
      }

      case "storage": {
        // List all storage buckets and their files
        const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
        if (bucketsError) throw bucketsError;

        const allFiles: Record<string, unknown>[] = [];

        for (const bucket of buckets || []) {
          const { data: files, error: filesError } = await supabaseClient.storage
            .from(bucket.id)
            .list("", { limit: 1000 });

          if (!filesError && files) {
            for (const file of files) {
              allFiles.push({
                bucket_id: bucket.id,
                bucket_name: bucket.name,
                bucket_public: bucket.public,
                file_name: file.name,
                file_id: file.id,
                created_at: file.created_at,
                updated_at: file.updated_at,
                size: file.metadata?.size || "",
                mime_type: file.metadata?.mimetype || "",
              });
            }
          }
        }

        if (allFiles.length === 0) {
          // Return bucket info even if no files
          responseData = {
            data: (buckets || []).map((b) => ({
              bucket_id: b.id,
              bucket_name: b.name,
              bucket_public: b.public,
              created_at: b.created_at,
              file_count: "0",
            })),
            message: `${(buckets || []).length} buckets exported (no files found)`,
          };
        } else {
          responseData = {
            data: allFiles,
            message: `${allFiles.length} files from ${(buckets || []).length} buckets exported`,
          };
        }
        break;
      }

      case "edge_functions": {
        // Edge functions info - we can list what we know
        responseData = {
          data: [
            { function_name: "create-restaurant", status: "deployed", description: "Creates a new restaurant" },
            { function_name: "create-user", status: "deployed", description: "Creates a new user" },
            { function_name: "delete-user", status: "deployed", description: "Deletes a user" },
            { function_name: "sync-profile-emails", status: "deployed", description: "Syncs profile emails" },
            { function_name: "update-user", status: "deployed", description: "Updates a user" },
            { function_name: "export-data", status: "deployed", description: "Exports project data as CSV" },
          ],
          message: "Edge functions list exported",
        };
        break;
      }

      case "secrets": {
        // For security, we only export secret names, never values
        const secretNames = [
          "SUPABASE_DB_URL",
          "LOVABLE_API_KEY",
          "SUPABASE_URL",
          "SUPABASE_PUBLISHABLE_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
        ];

        responseData = {
          data: secretNames.map((name) => ({
            secret_name: name,
            status: "configured",
            note: "Values are not exported for security reasons",
          })),
          message: `${secretNames.length} secrets exported (names only)`,
        };
        break;
      }

      case "logs": {
        // Export recent auth logs from profiles activity
        const { data: profiles, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        responseData = {
          data: (profiles || []).map((p) => ({
            user_id: p.id,
            email: p.email || "",
            full_name: p.full_name || "",
            created_at: p.created_at,
            type: "profile_activity",
          })),
          message: `${(profiles || []).length} log entries exported`,
        };
        break;
      }

      case "appointments": {
        // Check if appointments/schedule-related data exists
        // For now, export workout schedules as appointments
        const { data: workouts, error } = await supabaseClient
          .from("workouts")
          .select("*, students(name, email)")
          .order("created_at", { ascending: false });

        if (error) throw error;

        responseData = {
          data: (workouts || []).map((w) => ({
            id: w.id,
            workout_name: w.name,
            description: w.description || "",
            student_name: (w.students as any)?.name || "",
            student_email: (w.students as any)?.email || "",
            coach_id: w.coach_id,
            created_at: w.created_at,
          })),
          message: `${(workouts || []).length} appointments/workouts exported`,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown category: ${category}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
