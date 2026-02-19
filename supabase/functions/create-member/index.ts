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

    const { email, password, fullName, phone, role } = await req.json();

    const validRoles = ["admin", "elder", "member", "driver"];
    const assignRole = validRoles.includes(role) ? role : "member";

    // For elder role, auto-generate email if not provided
    let userEmail = email;
    if (!userEmail && assignRole === "elder") {
      const cleanPhone = (phone || "").replace(/\D/g, "");
      userEmail = `elder_${cleanPhone || crypto.randomUUID().slice(0, 8)}@elder.local`;
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Email is required for non-elder roles" }), { status: 400, headers: corsHeaders });
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        tenant_id: callerProfile.tenant_id,
        role: assignRole,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
    }

    // If role is driver, also insert into drivers table
    if (assignRole === "driver") {
      await supabaseAdmin.from("drivers").insert({
        user_id: newUser.user.id,
        tenant_id: callerProfile.tenant_id,
        whatsapp_number: phone || null,
      });
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
