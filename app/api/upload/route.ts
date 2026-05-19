import { put, del } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { SUPPORTED_EXTENSIONS } from "@/lib/atlas-types";
import { createClient } from "@/lib/supabase/server";

// Increase timeout for large file uploads
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Map file extensions to MIME types for proper Vercel Blob handling
const EXTENSION_TO_MIME: Record<string, string> = {
  // Design files
  ".ai": "application/postscript",
  ".psd": "image/vnd.adobe.photoshop",
  ".fig": "application/octet-stream",
  ".xd": "application/octet-stream",
  ".sketch": "application/octet-stream",
  // Images
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  // Documents
  ".pdf": "application/pdf",
  // Video
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wma": "audio/x-ms-wma",
  ".aiff": "audio/aiff",
};

export async function POST(request: NextRequest) {
  console.log("[v0] Upload POST request received");
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[v0] User:", user?.id || "anonymous");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const canvasId = formData.get("canvasId") as string | null;
    console.log("[v0] File:", file?.name, "Size:", file?.size, "CanvasId:", canvasId);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get file extension
    const fileName = file.name;
    const lastDotIndex = fileName.lastIndexOf(".");
    const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex).toLowerCase() : "";

    // Validate file extension
    if (!SUPPORTED_EXTENSIONS.includes(extension as any)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${extension}. Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob (public store)
    const userPrefix = user?.id || "anonymous";
    // For audio files, use application/octet-stream to bypass content type restrictions
    // The file will still play correctly in browsers based on the file extension
    const isAudioFile = [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma", ".aiff"].includes(extension);
    const contentType = isAudioFile 
      ? "application/octet-stream" 
      : (EXTENSION_TO_MIME[extension] || file.type || "application/octet-stream");
    
    console.log("[v0] Starting blob upload. Path:", `atlas/${userPrefix}/${Date.now()}-${fileName}`, "ContentType:", contentType);
    console.log("[v0] BLOB_READ_WRITE_TOKEN exists:", !!process.env.BLOB_READ_WRITE_TOKEN);
    
    const blob = await put(`atlas/${userPrefix}/${Date.now()}-${fileName}`, file, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    
    console.log("[v0] Blob upload successful:", blob.url);

    // Save file metadata to Supabase if user is authenticated
    let fileRecord = null;
    if (user) {
      const { data, error: dbError } = await supabase
        .from("files")
        .insert({
          user_id: user.id,
          canvas_id: canvasId || null,
          file_name: fileName,
          file_type: file.type,
          file_size: file.size,
          blob_url: blob.url,
          metadata: {
            contentType: blob.contentType,
            pathname: blob.pathname,
            extension: extension,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
      } else {
        fileRecord = data;
      }
    }

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      fileName: fileName,
      extension: extension,
      fileId: fileRecord?.id || null,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
