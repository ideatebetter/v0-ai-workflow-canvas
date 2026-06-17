import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET - Get all workspaces the user is a member of (creates a default one if none exist)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: memberships } = await admin
      .from("workspace_members")
      .select("workspace_id, role, joined_at, workspaces(id, name, description, settings, owner_id, created_at, updated_at, workspace_members(id, user_id, role, joined_at))")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });

    let workspaces = (memberships ?? []).map(m => {
      const ws = m.workspaces as any;
      return {
        id: ws.id,
        name: ws.name,
        description: ws.description ?? null,
        settings: ws.settings ?? null,
        owner_id: ws.owner_id,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
        userRole: m.role,
        memberCount: ws.workspace_members?.length ?? 0,
      };
    });

    // Create a default workspace if the user has none
    if (workspaces.length === 0) {
      const { data: newWorkspace, error: createError } = await admin
        .from("workspaces")
        .insert({ name: "My Workspace", owner_id: user.id })
        .select()
        .single();

      if (createError) {
        console.error("Error creating workspace:", createError);
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
      }

      await admin
        .from("workspace_members")
        .insert({ workspace_id: newWorkspace.id, user_id: user.id, role: "owner" });

      workspaces = [{
        id: newWorkspace.id,
        name: newWorkspace.name,
        owner_id: newWorkspace.owner_id,
        created_at: newWorkspace.created_at,
        updated_at: newWorkspace.updated_at,
        userRole: "owner",
        memberCount: 1,
      }];
    }

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Workspace GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Workspace name required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: newWorkspace, error: createError } = await admin
      .from("workspaces")
      .insert({ name: name.trim(), owner_id: user.id })
      .select()
      .single();

    if (createError) {
      console.error("Error creating workspace:", createError);
      return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
    }

    await admin
      .from("workspace_members")
      .insert({ workspace_id: newWorkspace.id, user_id: user.id, role: "owner" });

    return NextResponse.json({
      workspace: {
        id: newWorkspace.id,
        name: newWorkspace.name,
        owner_id: newWorkspace.owner_id,
        created_at: newWorkspace.created_at,
        updated_at: newWorkspace.updated_at,
        userRole: "owner",
        memberCount: 1,
      },
    });
  } catch (error) {
    console.error("Workspace POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update workspace settings (owner only)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, name, description, settings } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the requester is the owner
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data: workspace, error } = await admin
      .from("workspaces")
      .update(updateData)
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating workspace:", error);
      return NextResponse.json({ error: "Failed to update workspace", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Workspace PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a workspace (owner only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the requester is the owner
    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);

    if (error) {
      console.error("Error deleting workspace:", error);
      return NextResponse.json({ error: "Failed to delete workspace", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workspace DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
