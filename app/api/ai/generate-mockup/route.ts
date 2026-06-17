import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_KEY,
});

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|avif|bmp)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return IMAGE_EXTENSIONS.test(pathname);
  } catch {
    return IMAGE_EXTENSIONS.test(url);
  }
}

export async function POST(request: Request) {
  try {
    const {
      prompt,
      sourceImageUrl,
      count = 1,
      aspectRatio = "landscape_16_9",
      scenes,  // optional pre-built scene prompts from the client
    } = await request.json();

    const imageCount = Math.min(Math.max(Number(count), 1), 4);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const useImageEditing = !!sourceImageUrl && isImageUrl(sourceImageUrl);

    // Build one prompt per output image.
    // Client can pass `scenes` (array of pre-parsed prompts) for explicit control;
    // otherwise fall back to the master prompt for every image.
    const imagePrompts: string[] = Array.from({ length: imageCount }, (_, i) => {
      if (scenes && scenes.length > 0) {
        return scenes[i % scenes.length] as string;
      }
      return prompt;
    });

    const generationPromises = imagePrompts.map(async (scenePrompt) => {
      try {
        if (useImageEditing) {
          // Composite the source graphic into the described scene
          const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
            input: {
              image_url: sourceImageUrl,
              prompt: `${scenePrompt}. Keep the source graphic clearly visible and legible. High quality, photorealistic.`,
              num_images: 1,
            },
          }) as { images?: Array<{ url: string }> };

          return result.images?.[0]?.url ?? null;
        } else {
          // Text-only: no renderable source image
          const result = await fal.subscribe("fal-ai/flux/schnell", {
            input: {
              prompt: `Create a professional mockup: ${scenePrompt}. High quality, photorealistic rendering.`,
              image_size: aspectRatio,
              num_inference_steps: 4,
              num_images: 1,
            },
          }) as { images?: Array<{ url: string }> };

          return result.images?.[0]?.url ?? null;
        }
      } catch (err) {
        console.error("Image generation error for scene:", scenePrompt, err);
        return null;
      }
    });

    const imageUrls = await Promise.all(generationPromises);
    const images = imageUrls
      .filter((url): url is string => !!url)
      .map(url => ({ url }));

    if (images.length === 0) {
      return NextResponse.json({ error: "Failed to generate any images" }, { status: 500 });
    }

    return NextResponse.json({ images, usedImageEditing: useImageEditing });
  } catch (error) {
    console.error("Mockup generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate mockups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
