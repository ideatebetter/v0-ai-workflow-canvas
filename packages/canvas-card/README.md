# canvas-card

A drop-in card component for displaying a canvas preview + metadata (title, updated date, collaborators, actions). Self-contained — copy the folder into another project and go.

## Files

- `canvas-card.tsx` — the card wrapper (title, hover actions, collaborator avatars, collection chip)
- `canvas-preview.tsx` — the preview thumbnail (real image nodes rendered as images, text nodes rendered as text, data nodes rendered as mini SVG mockups)
- `types.ts` — the minimal `Canvas`, `AtlasNode`, `CanvasCardEdge`, `Collaborator` shapes
- `tokens.css` — the CSS variables the card uses (light + dark values)
- `index.ts` — barrel export

## Install

Copy the whole `canvas-card/` folder to your target project (e.g., `src/components/canvas-card/`).

Peer deps in your target project:
- `react` ≥ 18
- `lucide-react` ≥ 0.400 (for icons)
- Tailwind CSS (used for utility classes on the card wrapper)

Then import the CSS variables. Either:

```css
/* In your globals.css */
@import "./components/canvas-card/tokens.css";
```

…or paste the contents of `tokens.css` into your existing `:root { … }` and `.dark { … }` blocks.

The card assumes your app toggles dark mode by putting a `.dark` class on `<html>` (that's what `next-themes` does by default). If you use a different mechanism (`data-theme`, media query), edit `tokens.css` accordingly.

## Usage

```tsx
import { CanvasCard } from "@/components/canvas-card";
import type { Canvas } from "@/components/canvas-card";

function Grid({ canvases }: { canvases: Canvas[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {canvases.map((c) => (
        <CanvasCard
          key={c.id}
          canvas={c}
          onOpen={(id) => router.push(`/canvas/${id}`)}
          onToggleFavorite={(id) => toggleFavorite(id)}
          onDelete={(id) => confirmDelete(id)}
        />
      ))}
    </div>
  );
}
```

Minimal canvas shape:

```ts
const canvas: Canvas = {
  id: "abc",
  name: "My Canvas",
  nodes: [
    {
      id: "n1",
      type: "file",
      position: { x: 100, y: 100 },
      width: 220,
      height: 160,
      data: {
        previewImages: ["https://…/thumb.jpg"],
        fileExtension: "png",
      },
    },
  ],
  updatedAt: "2026-07-20T18:00:00Z",
  isFavorite: false,
  collaborators: [
    { id: "u1", name: "Rahmi", initials: "R", avatar: "https://…" },
  ],
};
```

## Node type vocabulary

The preview knows how to render:
- **Images** — `mockupImage`, `moodboard`, and `file`/`file-node`/`atlas-file-node` with an image `fileExtension` — rendered as real `<img>` via `<foreignObject>`.
- **Text** — `text`/`text-note` (uses `data.content`) and `briefInput` (uses `data.label`).
- **Data nodes** — `capacity` / `teamHealth` (bars + avatars), `financial` (line chart), `projectHealth` (pills + stacked bar), `pipeline` (stage dots), `sageChatbot` (chat bubbles), `stakeholder` (avatar grid), `presentationGroup` (slide grid), `aiPrompt` (text lines + sparkle), `docFrame` (doc lines), `statusPill` (single pill).
- **Everything else** — dark card with a corner icon based on type.

Unknown node types fall back to a generic file-doc placeholder. To handle new node types, add a case in `renderNodeMock()` inside `canvas-preview.tsx`.

## Notes

- The **preview thumbnail is hard-pinned to a light aesthetic** regardless of the surrounding app theme (white cards, light gray dot grid) — this makes previews look like little windows into the canvas. If you'd rather have the preview flip with your app theme, swap the hardcoded `#F5F5F5` / `#ffffff` / `#e0e0e0` values in `canvas-preview.tsx` for the corresponding CSS vars from `tokens.css`.
- The **card wrapper** (title area, chips, hover actions) fully respects your theme via the CSS vars.
- Uses `lucide-react` for icons — `Star`, `Trash2`, `FolderOpen`.
