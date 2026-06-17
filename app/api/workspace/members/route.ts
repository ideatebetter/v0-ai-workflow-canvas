import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET - List members of a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    const admin = createAdminClient();

    const [membersRes, workspaceRes, usersRes] = await Promise.all([
      admin.from("workspace_members").select("id, user_id, role, joined_at").eq("workspace_id", workspaceId),
      admin.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (membersRes.error) {
      console.error("Error fetching members:", membersRes.error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    const userMap = new Map((usersRes.data?.users ?? []).map(u => [u.id, u]));
    const ownerId = workspaceRes.data?.owner_id;

    const members = (membersRes.data ?? []).map(m => {
      const authUser = userMap.get(m.user_id);
      const displayName = (authUser?.user_metadata?.display_name as string | undefined)
        || authUser?.email?.split("@")[0]
        || "Unknown";
      return {
        id: m.id,
        userId: m.user_id,
        role: m.user_id === ownerId ? "owner" : m.role,
        joinedAt: m.joined_at,
        email: authUser?.email ?? "",
        name: displayName,
        initials: displayName.slice(0, 2).toUpperCase(),
        isOwner: m.user_id === ownerId,
      };
    });

    return NextResponse.json({ members, ownerId });
  } catch (error) {
    console.error("Members GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update a member's role, or transfer ownership
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId, userId, role, action } = await request.json();
    if (!workspaceId || !userId) return NextResponse.json({ error: "workspaceId and userId required" }, { status: 400 });

    const admin = createAdminClient();

    // Verify the requesting user is owner or admin
    const { data: requestingMember } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const isOwner = workspace?.owner_id === user.id;
    const isAdmin = requestingMember?.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Only owners and admins can change roles" }, { status: 403 });
    }

    if (action === "transfer-ownership") {
      if (!isOwner) return NextResponse.json({ error: "Only the owner can transfer ownership" }, { status: 403 });

      // Transfer: new owner gets owner role, old owner becomes admin
      const [transferRes, demoteRes, workspaceRes] = await Promise.all([
        admin.from("workspace_members").update({ role: "owner" }).eq("workspace_id", workspaceId).eq("user_id", userId),
        admin.from("workspace_members").update({ role: "admin" }).eq("workspace_id", workspaceId).eq("user_id", user.id),
        admin.from("workspaces").update({ owner_id: userId }).eq("id", workspaceId),
      ]);

      if (transferRes.error || demoteRes.error || workspaceRes.error) {
        console.error("Transfer ownership error:", transferRes.error, demoteRes.error, workspaceRes.error);
        return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Regular role change — owners can't be changed (only via transfer)
    if (workspace?.owner_id === userId) {
      return NextResponse.json({ error: "Cannot change the owner's role directly — use transfer ownership" }, { status: 400 });
    }

    if (!role) return NextResponse.json({ error: "role required" }, { status: 400 });

    const { error } = await admin
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) {
      console.error("Role update error:", error);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Members PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove a member from the workspace
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const userId = request.nextUrl.searchParams.get("userId");
    if (!workspaceId || !userId) return NextResponse.json({ error: "workspaceId and userId required" }, { status: 400 });

    const admin = createAdminClient();

    // Verify requester is owner or admin
    const { data: requestingMember } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const isOwner = workspace?.owner_id === user.id;
    const isAdmin = requestingMember?.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Only owners and admins can remove members" }, { status: 403 });
    }

    // Can't remove the workspace owner
    if (workspace?.owner_id === userId) {
      return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 400 });
    }

    const { error } = await admin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) {
      console.error("Remove member error:", error);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Members DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
