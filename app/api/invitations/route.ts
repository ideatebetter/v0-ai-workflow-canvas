import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET - List invitations for a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const { data: invitations, error } = await supabase
      .from("workspace_invitations")
      .select("id, email, role, status, created_at, expires_at, invited_by")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Invitations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Send a new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, email, role = "viewer" } = await request.json();

    if (!workspaceId || !email) {
      return NextResponse.json({ error: "Workspace ID and email required" }, { status: 400 });
    }

    // Check if user already has a pending invitation
    const { data: existing } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existing) {
      return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 400 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId);

    if (existingMember && existingMember.length > 0) {
      // Check if any member has the same email via profiles
      const memberIds = existingMember.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", memberIds)
        .eq("email", email.toLowerCase());

      if (profiles && profiles.length > 0) {
        return NextResponse.json({ error: "User is already a member of this workspace" }, { status: 400 });
      }
    }

    // Create the invitation using the admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const token = crypto.randomUUID();
    const { data: invitation, error } = await adminSupabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        expires_at: expiresAt,
        status: "pending",
        token,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation:", error, JSON.stringify(error));
      return NextResponse.json({ error: "Failed to create invitation", detail: error.message }, { status: 500 });
    }

    // Get workspace name for the response
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    // Generate invitation link
    const inviteLink = `${request.nextUrl.origin}/invite/${invitation.token}`;

    return NextResponse.json({ 
      invitation,
      inviteLink,
      workspaceName: workspace?.name || "Workspace"
    });
  } catch (error) {
    console.error("Invitations POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Revoke an invitation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = request.nextUrl.searchParams.get("id");
    
    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("workspace_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);

    if (error) {
      console.error("Error revoking invitation:", error);
      return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invitations DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
