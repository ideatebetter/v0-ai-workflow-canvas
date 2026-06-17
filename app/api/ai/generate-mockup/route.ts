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

// Build a distinct scene prompt for each index in a suite.
// If the master prompt already contains variation cues (cities, locations, etc.)
// we honour them; otherwise we inject generic scene differentiation.
function buildVariationPrompt(masterPrompt: string, index: number, total: number): string {
  if (total === 1) return masterPrompt;

  const lower = masterPrompt.toLowerCase();

  // Detect location-based suite intent
  const isCityTheme = /\b(cit(y|ies)|location|town|downtown|urban|street)\b/.test(lower);
  const isUSTheme = /\b(u\.?s\.?a?|united states|america[n]?)\b/.test(lower);

  if (isCityTheme && isUSTheme) {
    const cities = [
      "New York City — Times Square at night",
      "Los Angeles — Sunset Boulevard at golden hour",
      "Chicago — Michigan Avenue in winter",
      "Miami — South Beach at dusk",
      "San Francisco — Market Street in fog",
      "Seattle — Capitol Hill in rain",
      "Austin — 6th Street at night",
      "Nashville — Broadway neon lights",
    ];
    return `${masterPrompt}. Scene ${index + 1} of ${total}: ${cities[index % cities.length]}. Make this scene distinctly different from the others in the series.`;
  }

  if (isCityTheme) {
    return `${masterPrompt}. Scene ${index + 1} of ${total}: a unique location and setting, distinctly different from the other scenes in the series.`;
  }

  // Generic suite variation
  const perspectives = [
    "wide establishing shot",
    "close-up detail view",
    "medium shot at eye level",
    "elevated bird's eye perspective",
  ];
  return `${masterPrompt}. Scene ${index + 1} of ${total}: ${perspectives[index % perspectives.length]}. Make this image distinctly different in composition and atmosphere from the others.`;
}

export async function POST(request: Request) {
  try {
    const { prompt, sourceImageUrl, count = 1, aspectRatio = "landscape_16_9" } = await request.json();
    const imageCount = Math.min(Math.max(Number(count), 1), 4);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const useImageEditing = !!sourceImageUrl && isImageUrl(sourceImageUrl);

    const generationPromises = Array.from({ length: imageCount }, async (_, index) => {
      const variedPrompt = buildVariationPrompt(prompt, index, imageCount);

      if (useImageEditing) {
        const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
          input: {
            image_url: sourceImageUrl,
            prompt: `${variedPrompt}. Keep the source design clearly visible and legible. High quality, photorealistic.`,
            num_images: 1,
          },
        }) as { images?: Array<{ url: string }> };

        return result.images?.[0]?.url;
      } else {
        const result = await fal.subscribe("fal-ai/flux/schnell", {
          input: {
            prompt: `Create a professional mockup: ${variedPrompt}. High quality, photorealistic rendering.`,
            image_size: aspectRatio,
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
