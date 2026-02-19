import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: adminCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "No tenant" }), { status: 400, headers: corsHeaders });
    }

    const { action, userId, fullName, phone, role, newPassword } = await req.json();

    // Verify target user belongs to same tenant
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
      return new Response(JSON.stringify({ error: "User not in your tenant" }), { status: 403, headers: corsHeaders });
    }

    if (action === "update_profile") {
      // Update profile
      const updates: Record<string, string> = {};
      if (fullName) updates.full_name = fullName;
      if (phone !== undefined) updates.phone = phone;

      if (Object.keys(updates).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("user_id", userId);
        if (profileError) {
          return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: corsHeaders });
        }
      }

      // Update role if provided
      if (role) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId)
          .eq("tenant_id", callerProfile.tenant_id);
        if (roleError) {
          return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      if (!newPassword || newPassword.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (pwError) {
        return new Response(JSON.stringify({ error: pwError.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
