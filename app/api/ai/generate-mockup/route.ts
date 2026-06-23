import { NextResponse } from "next/server";
import * as fal from "@fal-ai/serverless-client";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

fal.config({
  credentials: process.env.FAL_KEY,
});

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|avif|bmp)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  if (url.startsWith("https://") || url.startsWith("http://")) {
    try {
      return IMAGE_EXTENSIONS.test(new URL(url).pathname) || url.includes("fal.media") || url.includes("fal.run");
    } catch {
      return IMAGE_EXTENSIONS.test(url);
    }
  }
  return false;
}

// Map human-readable aspect ratios to fal.ai image_size dimensions
const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
  "21:9": { width: 1024, height: 440 },
  landscape_16_9: { width: 1024, height: 576 },
  square_hd: { width: 1024, height: 1024 },
};

// Use Claude Haiku to intelligently split a suite prompt into N distinct scene prompts.
async function buildScenePromptsWithAI(
  masterPrompt: string,
  count: number
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `You are building image generation prompts for a ${count}-image mockup suite.

Master prompt from the user: "${masterPrompt}"

Generate exactly ${count} distinct, specific image generation prompts based on this master prompt.

Rules:
- If the master prompt mentions specific locations/cities/scenes, assign one to each image
- If fewer locations are mentioned than ${count}, create logical variations (different times of day, angles, weather, etc.)
- Each prompt must be self-contained and complete — do NOT reference "variation N" or numbering
- Preserve all stylistic details from the master prompt (lighting style, composition, mood, etc.)
- Keep prompts focused and concise (1-3 sentences each)

Return ONLY a JSON array of exactly ${count} strings. No other text, no explanation, no markdown.

Example output format: ["prompt 1", "prompt 2", "prompt 3"]`,
    });

    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed) && parsed.length === count) {
      return parsed as string[];
    }
    throw new Error("Unexpected response shape");
  } catch (err) {
    console.error("Scene prompt AI error:", err);
    // Fallback: return master prompt repeated
    return Array.from({ length: count }, () => masterPrompt);
  }
}

export async function POST(request: Request) {
  try {
    const {
      prompt,
      sourceImageUrl,
      count = 1,
      aspectRatio = "landscape_16_9",
      scenes, // optional pre-parsed client-side scenes
    } = await request.json();

    const imageCount = Math.min(Math.max(Number(count), 1), 4);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Upload data URLs to fal.ai storage so Kontext gets a real HTTP URL
    let resolvedSourceUrl: string | undefined = sourceImageUrl;
    if (typeof sourceImageUrl === "string" && sourceImageUrl.startsWith("data:")) {
      try {
        const [meta, base64] = sourceImageUrl.split(",");
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/png";
        const buffer = Buffer.from(base64, "base64");
        const blob = new Blob([buffer], { type: mimeType });
        resolvedSourceUrl = await fal.storage.upload(blob);
      } catch (uploadErr) {
        console.error("Failed to upload source image to fal storage:", uploadErr);
        resolvedSourceUrl = undefined;
      }
    }

    const useImageEditing = !!resolvedSourceUrl && isImageUrl(resolvedSourceUrl);

    // Determine the scene-specific prompts for each image.
    // Priority: client-provided scenes > AI-generated > master prompt repeated
    let imagePrompts: string[];
    if (scenes && Array.isArray(scenes) && scenes.length >= imageCount) {
      imagePrompts = scenes.slice(0, imageCount);
    } else if (imageCount > 1) {
      imagePrompts = await buildScenePromptsWithAI(prompt, imageCount);
    } else {
      imagePrompts = [prompt];
    }

    const generationPromises = imagePrompts.map(async (scenePrompt) => {
      try {
        if (useImageEditing) {
          const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
            input: {
              image_url: resolvedSourceUrl,
              prompt: `${scenePrompt}. Keep the source graphic clearly visible and legible. High quality, photorealistic.`,
              num_images: 1,
            },
          }) as { images?: Array<{ url: string }> };

          return result.images?.[0]?.url ?? null;
        } else {
          const imageDimensions = ASPECT_RATIO_SIZES[aspectRatio] ?? { width: 1024, height: 576 };
          const result = await fal.subscribe("fal-ai/flux/schnell", {
            input: {
              prompt: `Create a professional mockup: ${scenePrompt}. High quality, photorealistic rendering.`,
              image_size: imageDimensions,
              num_inference_steps: 4,
              num_images: 1,
            },
          }) as { images?: Array<{ url: string }> };

          return result.images?.[0]?.url ?? null;
        }
      } catch (err) {
        const errObj = err as { status?: number; body?: unknown; message?: string };
        console.error("Image generation error:", JSON.stringify({ status: errObj.status, body: errObj.body, message: errObj.message }, null, 2));
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
