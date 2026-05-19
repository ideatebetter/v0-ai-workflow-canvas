import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  console.log("[v0] Client upload request body type:", body.type);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userPrefix = user?.id || "anonymous";

    console.log("[v0] User for upload:", user?.id || "anonymous");

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Generate a client token for the browser to upload the file
        return {
          allowedContentTypes: [
            // Images
            "image/jpeg",
            "image/png", 
            "image/gif",
            "image/webp",
            "image/avif",
            "image/svg+xml",
            // Documents
            "application/pdf",
            // Design files
            "application/vnd.figma",
            "application/postscript", // .ai files
            "image/vnd.adobe.photoshop", // .psd files
            "application/x-photoshop", // .psd alternate
            "application/illustrator", // .ai alternate
            "application/octet-stream", // generic binary (for .sketch, .xd, etc.)
            // Video
            "video/mp4",
            "video/quicktime",
            "video/webm",
            // Audio
            "audio/mpeg", // .mp3
            "audio/mp3", // .mp3 alternate
            "audio/wav",
            "audio/wave",
            "audio/x-wav",
            "audio/aac",
            "audio/flac",
            "audio/ogg",
            "audio/mp4", // .m4a
            "audio/x-m4a", // .m4a alternate
            "audio/x-ms-wma", // .wma
            "audio/aiff",
            "audio/x-aiff",
            // Archives
            "application/zip",
            "application/x-zip-compressed",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          addRandomSuffix: true, // Allow duplicate filenames by adding random suffix
          tokenPayload: JSON.stringify({
            userId: user?.id || "anonymous",
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after the file is uploaded to Blob storage
        console.log("Upload completed:", blob.pathname);
        
        try {
          const payload = JSON.parse(tokenPayload || "{}");
          
          // Optionally save to database
          if (payload.userId && payload.userId !== "anonymous") {
            const supabase = await createClient();
            await supabase.from("files").insert({
              user_id: payload.userId,
              file_name: blob.pathname.split("/").pop() || "unknown",
              file_type: blob.contentType,
              file_size: 0, // Size not available in this callback
              blob_url: blob.url,
              metadata: {
                pathname: blob.pathname,
                contentType: blob.contentType,
              },
            });
          }
        } catch (error) {
          console.error("Error in onUploadCompleted:", error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[v0] Client upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
