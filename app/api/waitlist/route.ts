import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { name, email, company } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if email already exists in waitlist
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id, status")
      .eq("email", email)
      .single();

    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "This email has already been approved. Please sign in." },
          { status: 400 }
        );
      } else if (existing.status === "pending") {
        return NextResponse.json(
          { error: "This email is already on the waitlist." },
          { status: 400 }
        );
      } else {
        // Re-submit if previously rejected
        const { error: updateError } = await supabase
          .from("waitlist")
          .update({ 
            name, 
            company, 
            status: "pending",
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Failed to update waitlist entry:", updateError);
          return NextResponse.json(
            { error: "Failed to submit request" },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, message: "Request resubmitted" });
      }
    }

    // Insert new waitlist entry
    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({
        name,
        email,
        company: company || null,
      });

    if (insertError) {
      console.error("Failed to insert waitlist entry:", insertError);
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Request submitted" });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("[v0] Waitlist GET - user:", user?.email, "authError:", authError?.message);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admin can view waitlist
    if (user.email !== "rahmi@ideatebetter.com") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    console.log("[v0] Waitlist GET - data count:", data?.length, "error:", error?.message);

    if (error) {
      console.error("Failed to fetch waitlist:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ waitlist: data });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admin can update waitlist
    if (user.email !== "rahmi@ideatebetter.com") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Create admin client for database operations (bypasses RLS)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (status === "approved") {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = user.id;

      // Get the waitlist entry to get user details
      const { data: waitlistEntry } = await supabase
        .from("waitlist")
        .select("name, email")
        .eq("id", id)
        .single();

      if (waitlistEntry) {
        // Invite the user - Supabase will send them an email with a link to set their password
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          waitlistEntry.email,
          {
            data: {
              name: waitlistEntry.name,
            },
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-prototype.com'}/auth/callback`,
          }
        );

        if (inviteError) {
          console.error("Failed to invite user:", inviteError);
          return NextResponse.json(
            { error: `Failed to send invitation: ${inviteError.message}` },
            { status: 500 }
          );
        }

        // Update waitlist with the created user ID (use admin client to bypass RLS)
        updateData.user_id = inviteData.user?.id;

        const { data, error } = await supabaseAdmin
          .from("waitlist")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Failed to update waitlist entry:", error);
          return NextResponse.json(
            { error: "Invitation sent but failed to update waitlist" },
            { status: 500 }
          );
        }

        return NextResponse.json({ 
          success: true, 
          entry: data,
          message: `Invitation email sent to ${waitlistEntry.email}`
        });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("waitlist")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update waitlist entry:", error);
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (error) {
    console.error("Waitlist PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
