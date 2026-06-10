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
    const { prompt, sourceImageUrl, count = 1, variations } = await request.json();
    const imageCount = Math.min(variations || count, 4);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Only use image editing when sourceImageUrl is a renderable image format.
    // PSD, AI, PDF, etc. are stored as raw files and can't be ingested by the model.
    const useImageEditing = !!sourceImageUrl && isImageUrl(sourceImageUrl);

    const generationPromises = Array.from({ length: imageCount }, async (_, index) => {
      const variedPrompt = imageCount > 1
        ? `${prompt}. Variation ${index + 1}, unique perspective and composition.`
        : prompt;

      if (useImageEditing) {
        // Composite the source graphic into the described scene
        const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
          input: {
            image_url: sourceImageUrl,
            prompt: `${variedPrompt}. Keep the design clearly visible and legible. High quality, photorealistic.`,
            num_images: 1,
          },
        }) as { images?: Array<{ url: string }> };

        return result.images?.[0]?.url;
      } else {
        // Text-only: no image source, or source is a non-image file
        const result = await fal.subscribe("fal-ai/flux/schnell", {
          input: {
            prompt: `Create a professional mockup: ${variedPrompt}. High quality, photorealistic rendering.`,
            image_size: "landscape_16_9",
            num_inference_steps: 4,
            num_images: 1,
          },
        }) as { images?: Array<{ url: string }> };

        return result.images?.[0]?.url;
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
