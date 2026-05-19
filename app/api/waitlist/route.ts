import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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
    const { data: { user } } = await supabase.auth.getUser();

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
        // Create admin client with service role to create users
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Generate temporary password
        const tempPassword = generateTempPassword();

        // Create the user account
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: waitlistEntry.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email since admin approved
          user_metadata: {
            name: waitlistEntry.name,
            must_change_password: true,
          },
        });

        if (createUserError) {
          console.error("Failed to create user account:", createUserError);
          return NextResponse.json(
            { error: `Failed to create user account: ${createUserError.message}` },
            { status: 500 }
          );
        }

        // Update waitlist with the created user ID
        updateData.user_id = newUser.user?.id;

        // Return temp password so admin can share it
        const { data, error } = await supabase
          .from("waitlist")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Failed to update waitlist entry:", error);
          return NextResponse.json(
            { error: "User created but failed to update waitlist" },
            { status: 500 }
          );
        }

        return NextResponse.json({ 
          success: true, 
          entry: data,
          tempPassword,
          message: `Account created for ${waitlistEntry.email}. Temporary password: ${tempPassword}`
        });
      }
    }

    const { data, error } = await supabase
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
