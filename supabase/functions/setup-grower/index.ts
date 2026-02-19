import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    // Check admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", {
      _user_id: callerId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, email, growerName, growerCode, businessId, tempPassword } =
      body;

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: "email and action required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "invite") {
      // Send magic link / invite email
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            display_name: growerName || "",
            role: "supplier",
          },
        }
      );

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create role + profile + link business if user was created
      if (data?.user) {
        await setupGrowerRecords(
          adminClient,
          data.user.id,
          growerName,
          growerCode,
          businessId,
          email
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invite sent", userId: data?.user?.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "create_with_password") {
      if (!tempPassword || tempPassword.length < 6) {
        return new Response(
          JSON.stringify({
            error: "Password must be at least 6 characters",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: growerName || "",
          role: "supplier",
        },
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data?.user) {
        await setupGrowerRecords(
          adminClient,
          data.user.id,
          growerName,
          growerCode,
          businessId,
          email
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created",
          userId: data?.user?.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'invite' or 'create_with_password'" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function setupGrowerRecords(
  client: any,
  userId: string,
  growerName: string | undefined,
  growerCode: string | undefined,
  businessId: string | undefined,
  email: string
) {
  // Assign supplier role
  await client
    .from("user_roles")
    .upsert({ user_id: userId, role: "supplier" }, { onConflict: "user_id,role" });

  // Update profile
  await client
    .from("profiles")
    .update({
      company_name: growerName || "",
      grower_code: growerCode || null,
      business_id: businessId || null,
    })
    .eq("user_id", userId);

  // Link business to the new user (transfer ownership from admin)
  if (businessId) {
    await client
      .from("businesses")
      .update({ owner_id: userId, email })
      .eq("id", businessId);
  }
}
