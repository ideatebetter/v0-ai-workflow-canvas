import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET - Get user's workspace (or create default one)
export async function GET() {
  try {
    // Verify auth with regular client, then use admin client to bypass RLS for queries
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Try to get user's owned workspace
    const { data: ownedWorkspaces } = await admin
      .from("workspaces")
      .select(`*, workspace_members(id, user_id, role, joined_at)`)
      .eq("owner_id", user.id)
      .limit(1);
    let workspace = ownedWorkspaces?.[0] ?? null;

    // If no owned workspace, check if user is a member of any workspace
    if (!workspace) {
      const { data: memberships } = await admin
        .from("workspace_members")
        .select("workspace_id, workspaces(*)")
        .eq("user_id", user.id)
        .limit(1);

      const membership = memberships?.[0];
      if (membership?.workspaces) {
        workspace = membership.workspaces as any;
      }
    }

    // If still no workspace, create a default one
    if (!workspace) {
      const { data: newWorkspace, error: createError } = await admin
        .from("workspaces")
        .insert({ name: "My Workspace", owner_id: user.id })
        .select()
        .single();

      if (createError) {
        console.error("Error creating workspace:", createError, JSON.stringify(createError));
        return NextResponse.json({ error: "Failed to create workspace", detail: createError.message }, { status: 500 });
      }

      await admin
        .from("workspace_members")
        .insert({ workspace_id: newWorkspace.id, user_id: user.id, role: "owner" });

      workspace = {
        ...newWorkspace,
        workspace_members: [{ id: user.id, user_id: user.id, role: "owner", joined_at: new Date().toISOString() }]
      };
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Workspace GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update workspace settings
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

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .update(updateData)
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating workspace:", error);
      return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Workspace PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
