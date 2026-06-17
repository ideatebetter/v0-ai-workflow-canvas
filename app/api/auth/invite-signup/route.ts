import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST - Create an account for an invited user, bypassing email confirmation
export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, inviteToken } = await request.json();

    if (!email || !password || !inviteToken) {
      return NextResponse.json({ error: "email, password, and inviteToken required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the invite token is still valid before creating the account
    const { data: invitation, error: inviteError } = await admin
      .from("workspace_invitations")
      .select("id, email, status, expires_at")
      .eq("token", inviteToken)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation is no longer active" }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match invitation" }, { status: 400 });
    }

    // Create the user with email already confirmed (no verification email needed)
    const { data, error } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || email.split("@")[0] },
    });

    if (error) {
      if (error.message.includes("already been registered") || error.message.includes("already exists")) {
        // User exists but may be unconfirmed — find and confirm them
        const { data: listData } = await admin.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser && !existingUser.email_confirmed_at) {
          await admin.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
        }
        return NextResponse.json({ success: true, existed: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch (error) {
    console.error("invite-signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
