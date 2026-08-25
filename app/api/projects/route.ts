import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      name,
      clientName,
      projectType,
      billingType,
      startDate,
      endDate,
      phases,       // string[]
      members,      // { userId: string; role: string }[]
      estimate,     // { totalFee?: number; estimatedHours?: Record<string, number> } | null
      workspaceId,
    } = body;

    if (!name || !clientName || !projectType || !billingType || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Insert project
    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({
        name,
        client_name: clientName,
        project_type: projectType,
        billing_type: billingType,
        start_date: startDate,
        end_date: endDate,
        status: "active",
        owner_id: user.id,
        workspace_id: workspaceId ?? null,
      })
      .select()
      .single();

    if (projectError || !project) {
      console.error("Project insert error:", projectError);
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }

    // 2. Insert phases (modal sends { name, dueDate } objects)
    if (phases && phases.length > 0) {
      const phaseRows = (phases as ({ name: string; dueDate?: string | null } | string)[]).map((p, index) => ({
        project_id: project.id,
        name: typeof p === "string" ? p : p.name,
        order: index,
        status: "pending",
      }));
      const { error: phaseError } = await admin.from("project_phases").insert(phaseRows);
      if (phaseError) console.error("Phase insert error:", phaseError);
    }

    // 3. Insert members (always includes the creator)
    const memberRows = (members as { userId: string; role: string }[]).map(m => ({
      project_id: project.id,
      user_id: m.userId,
      role: m.role,
    }));
    // Deduplicate — creator is always first
    const seen = new Set<string>();
    const dedupedMembers = memberRows.filter(m => {
      if (seen.has(m.user_id)) return false;
      seen.add(m.user_id);
      return true;
    });
    if (dedupedMembers.length > 0) {
      const { error: membersError } = await admin.from("project_members").insert(dedupedMembers);
      if (membersError) console.error("Members insert error:", membersError);
    }

    // 4. Insert estimate (optional)
    if (estimate) {
      const estimateRow: Record<string, unknown> = {
        project_id: project.id,
        billing_type: billingType,
      };
      if (billingType === "flat_fee" && estimate.totalFee != null) {
        estimateRow.total_fee = estimate.totalFee;
      }
      if (billingType === "hourly" && estimate.estimatedHours) {
        estimateRow.estimated_hours = estimate.estimatedHours;
      }
      const { error: estimateError } = await admin.from("project_estimates").insert(estimateRow);
      if (estimateError) console.error("Estimate insert error:", estimateError);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("Project creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const admin = createAdminClient();

    let query = admin
      .from("projects")
      .select("*, project_phases(*), project_members(*), project_estimates(*)")
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.eq("owner_id", user.id);
    }

    const { data: projects, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Projects GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
