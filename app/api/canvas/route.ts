import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch user's canvases or a specific canvas
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get("id");

    if (canvasId) {
      // Fetch specific canvas
      const { data: canvas, error } = await supabase
        .from("canvases")
        .select("*")
        .eq("id", canvasId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
      }

      return NextResponse.json({ canvas });
    } else {
      // Fetch all user's canvases with full data (nodes, edges, etc.)
      const { data: canvases, error } = await supabase
        .from("canvases")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: "Failed to fetch canvases" }, { status: 500 });
      }

      return NextResponse.json({ canvases });
    }
  } catch (error) {
    console.error("Canvas fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch canvas" }, { status: 500 });
  }
}

// POST - Create a new canvas
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, nodes, edges, settings } = body;

    const { data: canvas, error } = await supabase
      .from("canvases")
      .insert({
        user_id: user.id,
        name: name || "Untitled Canvas",
        description,
        nodes: nodes || [],
        edges: edges || [],
        settings: settings || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Canvas create error:", error);
      return NextResponse.json({ error: "Failed to create canvas" }, { status: 500 });
    }

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error("Canvas create error:", error);
    return NextResponse.json({ error: "Failed to create canvas" }, { status: 500 });
  }
}

// PUT - Update a canvas
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, nodes, edges, settings } = body;

    if (!id) {
      return NextResponse.json({ error: "Canvas ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (edges !== undefined) updateData.edges = edges;
    if (settings !== undefined) updateData.settings = settings;

    const { data: canvas, error } = await supabase
      .from("canvases")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Canvas update error:", error);
      return NextResponse.json({ error: "Failed to update canvas" }, { status: 500 });
    }

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error("Canvas update error:", error);
    return NextResponse.json({ error: "Failed to update canvas" }, { status: 500 });
  }
}

// DELETE - Delete a canvas
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get("id");

    if (!canvasId) {
      return NextResponse.json({ error: "Canvas ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("canvases")
      .delete()
      .eq("id", canvasId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Canvas delete error:", error);
      return NextResponse.json({ error: "Failed to delete canvas" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Canvas delete error:", error);
    return NextResponse.json({ error: "Failed to delete canvas" }, { status: 500 });
  }
}
