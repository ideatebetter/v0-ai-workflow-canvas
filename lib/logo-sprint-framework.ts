import type { CanvasFramework } from "./atlas-types";

const NOW = "2026-01-15T10:00:00.000Z";

const CREATOR = {
  id: "system",
  name: "Atlas Templates",
  email: "templates@atlas.so",
  role: "admin" as const,
  initials: "AT",
  avatar: "",
};

// ─── Moodboard images ───────────────────────────────────────────────────────
const MOOD_IMAGES = [
  {
    id: "mood-1",
    url: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=600&fit=crop",
    fileName: "brand-color-inspiration.jpg",
    thumbnail: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200&h=200&fit=crop",
    fileType: "image" as const,
  },
  {
    id: "mood-2",
    url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=600&fit=crop",
    fileName: "typography-reference.jpg",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop",
    fileType: "image" as const,
  },
  {
    id: "mood-3",
    url: "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=600&h=600&fit=crop",
    fileName: "abstract-mark-ref.jpg",
    thumbnail: "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=200&h=200&fit=crop",
    fileType: "image" as const,
  },
  {
    id: "mood-4",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
    fileName: "minimal-logo-inspo.jpg",
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop",
    fileType: "image" as const,
  },
  {
    id: "mood-5",
    url: "https://images.unsplash.com/photo-1523800503107-5bc3ba2a6f81?w=600&h=600&fit=crop",
    fileName: "geometric-forms.jpg",
    thumbnail: "https://images.unsplash.com/photo-1523800503107-5bc3ba2a6f81?w=200&h=200&fit=crop",
    fileType: "image" as const,
  },
  {
    id: "mood-6",
    url: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&h=600&fit=crop",
    fileName: "texture-palette.jpg",
    thumbnail: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=200&h=200&fit=crop",
    fileType: "image" as const,
  },
];

// ─── Mockup images ──────────────────────────────────────────────────────────
const MOCKUP_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&h=500&fit=crop",
    label: "Business Card Mockup",
    prompt: "Logo on business cards, professional photography, clean background",
  },
  {
    url: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&h=500&fit=crop",
    label: "Storefront Signage Mockup",
    prompt: "Logo on storefront window signage, urban street scene",
  },
  {
    url: "https://images.unsplash.com/photo-1489875347897-49f64b51c1f8?w=800&h=500&fit=crop",
    label: "Apparel Mockup",
    prompt: "Logo embroidered on premium t-shirt, flat lay photography",
  },
  {
    url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=500&fit=crop",
    label: "Mobile App Icon Mockup",
    prompt: "Logo as mobile app icon on iPhone home screen",
  },
  {
    url: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800&h=500&fit=crop",
    label: "Brand Stationery Set",
    prompt: "Logo on branded stationery set — letterhead, envelope, folder",
  },
  {
    url: "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?w=800&h=500&fit=crop",
    label: "Outdoor Billboard",
    prompt: "Logo on large outdoor billboard at golden hour",
  },
];

// ─── Node IDs ────────────────────────────────────────────────────────────────
const IDS = {
  onboarding: "ls-onboarding",
  s1: "ls-strategy-1",
  s2: "ls-strategy-2",
  s3: "ls-strategy-3",
  s4: "ls-strategy-4",
  s5: "ls-strategy-5",
  s6: "ls-strategy-6",
  b1: "ls-brief-1",
  b2: "ls-brief-2",
  b3: "ls-brief-3",
  b4: "ls-brief-4",
  mood: "ls-moodboard",
  logoFile: "ls-logo-file",
  m1: "ls-mockup-1",
  m2: "ls-mockup-2",
  m3: "ls-mockup-3",
  m4: "ls-mockup-4",
  m5: "ls-mockup-5",
  m6: "ls-mockup-6",
  pgStrategy: "ls-pg-strategy",
  pgBrief: "ls-pg-brief",
  pgBriefMood: "ls-pg-brief-mood",
  pgMaster: "ls-pg-master",
};

export const LOGO_SPRINT_FRAMEWORK: CanvasFramework = {
  id: "framework-logo-sprint",
  name: "Logo Sprint",
  description:
    "A structured end-to-end logo design sprint covering brand strategy, creative brief, moodboard curation, and mockup delivery — with presentation flows for every review stage.",
  category: "branding",
  visibility: "workspace",
  createdAt: NOW,
  createdBy: CREATOR,
  upvotes: 0,
  upvotedBy: [],
  downloads: 0,
  tags: ["logo", "branding", "sprint", "identity", "strategy"],
  isPublished: true,
  parameters: [
    {
      id: "brand_name",
      label: "Brand Name",
      type: "text",
      required: true,
      placeholder: "e.g. Meridian Studio",
    },
    {
      id: "industry",
      label: "Industry / Sector",
      type: "text",
      required: false,
      placeholder: "e.g. Creative Agency",
    },
    {
      id: "brand_adjectives",
      label: "3–5 Brand Adjectives",
      type: "textarea",
      required: false,
      placeholder: "e.g. Bold, Minimal, Timeless, Human, Curious",
    },
    {
      id: "logo_file",
      label: "Logo File (PNG, SVG, AI)",
      type: "file",
      required: false,
    },
    {
      id: "strategy_pdf",
      label: "Strategy PDF → auto-populates strategy nodes",
      type: "file",
      required: false,
    },
    {
      id: "brief_pdf",
      label: "Creative Brief PDF → auto-populates brief nodes",
      type: "file",
      required: false,
    },
  ],

  // ─── Nodes ───────────────────────────────────────────────────────────────
  nodes: [
    // ── Onboarding ──────────────────────────────────────────────────────
    {
      id: IDS.onboarding,
      type: "text",
      position: { x: 60, y: 60 },
      selected: false,
      data: {
        label: "Logo Sprint — Onboarding",
        content: `# Welcome to the {{brand_name}} Logo Sprint

This canvas walks your team through a structured logo design process in four phases:

**Phase 1 — Brand Strategy**
Six strategy pillars that define who {{brand_name}} is and what it stands for in the {{industry}} space. Each card links forward to the next — read them in sequence before briefing the creative team.

**Phase 2 — Creative Brief**
Four brief cards distilling the strategy into concrete design direction. These feed directly into the moodboard.

**Phase 3 — Moodboard**
Visual reference curated to match the brand direction. Use the Presentation view to walk stakeholders through rationale.

**Phase 4 — Logo & Mockups**
The final Figma logo file plus six environment mockups showing the mark in the real world.

---

🔁 **Three presentation flows** are set up — click any Presentation Group to launch a slide walkthrough.

📎 **To customise:** replace the filler text in each strategy/brief card with your actual content, then swap the moodboard images and logo file.`,
        textType: "description",
        lastModified: NOW,
      },
    },

    // ── Strategy nodes ────────────────────────────────────────────────────
    {
      id: IDS.s1,
      type: "text",
      position: { x: 60, y: 360 },
      selected: false,
      data: {
        label: "Brand Discovery",
        content: `# Brand Discovery

**What is {{brand_name}}?**
{{brand_name}} operates in the {{industry}} space, solving [core problem] for [target customer]. Founded in [year], the brand has grown from [origin story] to [current state].

**Mission**
To [mission statement — what the company does and for whom].

**Vision**
To become [aspirational future state] within [timeframe].

**Why does {{brand_name}} exist?**
[The deeper "why" — the belief that drives the business beyond profit.]

---

*Replace this filler with discovery workshop outputs or strategy doc content.*`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.s2,
      type: "text",
      position: { x: 60, y: 640 },
      selected: false,
      data: {
        label: "Target Audience",
        content: `# Target Audience

**Primary Persona — [Name]**
Age: [range] · Location: [region] · Role: [job title / life stage]

Motivations: [what drives this person]
Frustrations: [what they struggle with]
How they find us: [channel / context]

**Secondary Persona — [Name]**
[Brief description of secondary audience segment]

**Audience Insight**
"[Verbatim quote or synthesised insight from research that captures the audience truth]"

---

*Upload a strategy PDF above to auto-populate this card with your actual audience research.*`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.s3,
      type: "text",
      position: { x: 60, y: 920 },
      selected: false,
      data: {
        label: "Brand Values & Personality",
        content: `# Brand Values & Personality

**Core Values**
1. [Value 1] — [one-line definition]
2. [Value 2] — [one-line definition]
3. [Value 3] — [one-line definition]
4. [Value 4] — [one-line definition]

**Brand Personality Spectrum**

{{brand_adjectives}}

**Voice & Tone**
[Describe how the brand speaks — formal/informal, warm/authoritative, technical/accessible]

**What {{brand_name}} is NOT**
[List 3 things the brand explicitly rejects — these are as important as what it is]`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.s4,
      type: "text",
      position: { x: 60, y: 1200 },
      selected: false,
      data: {
        label: "Competitive Landscape",
        content: `# Competitive Landscape

**Direct Competitors**

| Brand | Strength | Weakness | Visual Territory |
|-------|----------|----------|-----------------|
| [Comp 1] | [key strength] | [key gap] | [color/style] |
| [Comp 2] | [key strength] | [key gap] | [color/style] |
| [Comp 3] | [key strength] | [key gap] | [color/style] |

**Market White Space**
The {{industry}} category is dominated by [dominant aesthetic tendency]. {{brand_name}} has an opportunity to [differentiated positioning].

**Benchmark Brands (outside category)**
Brands we admire for specific reasons:
- [Brand] — [what we admire about their identity]
- [Brand] — [what we admire about their identity]`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.s5,
      type: "text",
      position: { x: 60, y: 1480 },
      selected: false,
      data: {
        label: "Positioning Statement",
        content: `# Positioning Statement

**The One-Liner**
> For [target audience], {{brand_name}} is the [category] that [key benefit] because [reason to believe].

**Expanded Positioning**
{{brand_name}} is uniquely positioned at the intersection of [dimension 1] and [dimension 2]. While competitors emphasise [competitor tendency], we lead with [our differentiator].

**Proof Points**
1. [Concrete evidence that supports our positioning]
2. [Concrete evidence that supports our positioning]
3. [Concrete evidence that supports our positioning]

**The Brand Promise**
"[Single sentence that captures the promise {{brand_name}} makes to every customer]"`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.s6,
      type: "text",
      position: { x: 60, y: 1760 },
      selected: false,
      data: {
        label: "Visual Direction",
        content: `# Visual Direction

**Design Principles**
1. [Principle] — [brief rationale]
2. [Principle] — [brief rationale]
3. [Principle] — [brief rationale]

**Color Direction**
Primary palette feel: [warm/cool, saturated/muted, light/dark]
Avoid: [colors used by competitors or that clash with values]

**Typography Direction**
Heading character: [geometric/humanist/slab/script] — [rationale]
Body character: [readability priority]

**Logo Form Language**
Wordmark / Lettermark / Emblem / Abstract mark / Combination
Key formal qualities: [e.g. sharp corners, optical balance, weight]

**Reference Directions**
See moodboard → for curated visual references`,
        textType: "brief",
        lastModified: NOW,
      },
    },

    // ── Creative Brief nodes ──────────────────────────────────────────────
    {
      id: IDS.b1,
      type: "text",
      position: { x: 620, y: 360 },
      selected: false,
      data: {
        label: "Project Overview",
        content: `# Creative Brief — Project Overview

**Project**
Logo design for {{brand_name}}, a {{industry}} company.

**Background**
{{brand_name}} is [brief company background]. The current identity [does not exist / needs modernisation / was created for a different era]. This sprint will produce a logo system that [core purpose of the new identity].

**Scope of Work**
- Primary logo (horizontal + stacked)
- Logo mark / icon variant
- Colour palette (primary + secondary)
- Typography pairing recommendation
- Brand guidelines (1-pager)

**Key Stakeholders**
- Creative Director: [name]
- Brand Lead: [name]
- Final Approver: [name]`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.b2,
      type: "text",
      position: { x: 620, y: 640 },
      selected: false,
      data: {
        label: "Design Objectives",
        content: `# Design Objectives

**Primary Goal**
Create a logo system that [specific outcome — e.g. "positions {{brand_name}} as the premium choice in {{industry}}"].

**Success Criteria**
The final logo must:
☐ Be instantly recognisable at 16px (favicon) and 3m wide (billboard)
☐ Work in single colour (black AND white)
☐ Feel [adjective] without resorting to [cliché]
☐ Differentiate {{brand_name}} from [top 2–3 competitors]
☐ Resonate with [primary persona]

**Design Tension to Navigate**
[The core creative challenge — e.g. "Feeling approachable but authoritative" or "Modern but with heritage depth"]

**Non-Negotiables**
[Anything that cannot change — e.g. must retain a specific symbol, colour, or name treatment]`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.b3,
      type: "text",
      position: { x: 620, y: 920 },
      selected: false,
      data: {
        label: "Creative Constraints",
        content: `# Creative Constraints

**Technical Constraints**
- Must render clearly at sizes from 16px to 3000px
- Must work on: white, black, brand primary, photography backgrounds
- File formats required: SVG, PNG (transparent), PDF, EPS
- Max colours in logo: [2 / 3]

**Brand Constraints**
- [Any existing brand elements to retain or avoid]
- [Trademark considerations — letters, shapes to avoid]
- [Cultural/regional sensitivities]

**Timeline Constraints**
- Concept presentation: [date]
- Refinement round 1: [date]
- Refinement round 2: [date]
- Final delivery: [date]

**Budget**
[Number of concepts, rounds of revisions included]`,
        textType: "brief",
        lastModified: NOW,
      },
    },
    {
      id: IDS.b4,
      type: "text",
      position: { x: 620, y: 1200 },
      selected: false,
      data: {
        label: "Deliverables & Timeline",
        content: `# Deliverables & Timeline

**Deliverables Checklist**

**Round 1 — Concepts**
☐ 3 distinct logo directions
☐ Each shown on white, black, and colour background
☐ Brief rationale for each direction (1 slide per concept)

**Round 2 — Refinement**
☐ 2 refined directions based on feedback
☐ Colour palette options for each
☐ Typography pairing for each

**Final Delivery**
☐ Master logo files (AI, EPS, SVG, PDF)
☐ Export kit (all sizes and colour variants as PNG)
☐ Brand guidelines PDF (usage, spacing, don'ts)
☐ Figma file (editable components)

---

**Sprint Timeline**
| Week | Milestone |
|------|-----------|
| Week 1 | Brief sign-off, moodboard review |
| Week 2 | Concept presentation |
| Week 3 | Refinement |
| Week 4 | Final delivery |`,
        textType: "brief",
        lastModified: NOW,
      },
    },

    // ── Moodboard ─────────────────────────────────────────────────────────
    {
      id: IDS.mood,
      type: "moodboard",
      position: { x: 1180, y: 360 },
      selected: false,
      data: {
        label: "Brand Visual Inspiration",
        images: MOOD_IMAGES,
        isExpanded: false,
        createdAt: NOW,
      },
    },

    // ── Logo file placeholder ─────────────────────────────────────────────
    {
      id: IDS.logoFile,
      type: "file",
      position: { x: 1740, y: 60 },
      selected: false,
      data: {
        label: "{{brand_name}} Logo",
        fileName: "brand-logo",
        product: "atlas",
        status: "draft",
        fileExtension: ".ai",
        lastModified: NOW,
        previewImages: [
          "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop",
        ],
      },
    },

    // ── Mockup nodes ──────────────────────────────────────────────────────
    {
      id: IDS.m1,
      type: "mockupImage",
      position: { x: 1740, y: 380 },
      selected: false,
      data: {
        label: MOCKUP_IMAGES[0].label,
        imageUrl: MOCKUP_IMAGES[0].url,
        prompt: MOCKUP_IMAGES[0].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m2,
      type: "mockupImage",
      position: { x: 2020, y: 380 },
      selected: false,
      data: {
        label: MOCKUP_IMAGES[1].label,
        imageUrl: MOCKUP_IMAGES[1].url,
        prompt: MOCKUP_IMAGES[1].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m3,
      type: "mockupImage",
      position: { x: 1740, y: 660 },
      selected: false,
      data: {
        label: MOCKUP_IMAGES[2].label,
        imageUrl: MOCKUP_IMAGES[2].url,
        prompt: MOCKUP_IMAGES[2].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m4,
      type: "mockupImage",
      position: { x: 2020, y: 660 },
      selected: false,
      data: {
        label: MOCKUP_IMAGES[3].label,
        imageUrl: MOCKUP_IMAGES[3].url,
        prompt: MOCKUP_IMAGES[3].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m5,
      type: "mockupImage",
      position: { x: 1740, y: 940 },
      selected: false,
      data: {
        label: MOCKUP_IMAGES[4].label,
        imageUrl: MOCKUP_IMAGES[4].url,
        prompt: MOCKUP_IMAGES[4].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m6,
      type: "mockupImage",
      position: { x: 2020, y: 940 },
      selected: false,
      data: {
        label: MOCKUP_IMAGES[5].label,
        imageUrl: MOCKUP_IMAGES[5].url,
        prompt: MOCKUP_IMAGES[5].prompt,
        generatedAt: NOW,
      },
    },

    // ── Presentation Groups ───────────────────────────────────────────────
    // 1. Strategy deck
    {
      id: IDS.pgStrategy,
      type: "presentationGroup",
      position: { x: 60, y: 2080 },
      selected: false,
      data: {
        label: "Strategy Deck",
        nodeIds: [IDS.s1, IDS.s2, IDS.s3, IDS.s4, IDS.s5, IDS.s6],
        thumbnails: [],
        originalNodes: [],
      },
    },
    // 2. Creative Brief → Moodboard
    {
      id: IDS.pgBriefMood,
      type: "presentationGroup",
      position: { x: 620, y: 1620 },
      selected: false,
      data: {
        label: "Brief + Moodboard",
        nodeIds: [IDS.b1, IDS.b2, IDS.b3, IDS.b4, IDS.mood],
        thumbnails: MOOD_IMAGES.slice(0, 4).map((i) => i.thumbnail),
        originalNodes: [],
      },
    },
    // 3. Full sprint walkthrough
    {
      id: IDS.pgMaster,
      type: "presentationGroup",
      position: { x: 1180, y: 2080 },
      selected: false,
      data: {
        label: "Full Sprint Walkthrough",
        nodeIds: [
          IDS.s1, IDS.s2, IDS.s3, IDS.s4, IDS.s5, IDS.s6,
          IDS.b1, IDS.b2, IDS.b3, IDS.b4,
          IDS.mood,
          IDS.logoFile,
          IDS.m1, IDS.m2, IDS.m3, IDS.m4, IDS.m5, IDS.m6,
        ],
        thumbnails: [
          ...MOOD_IMAGES.slice(0, 2).map((i) => i.thumbnail),
          MOCKUP_IMAGES[0].url,
          MOCKUP_IMAGES[1].url,
        ],
        originalNodes: [],
      },
    },
  ] as CanvasFramework["nodes"],

  // ─── Edges ───────────────────────────────────────────────────────────────
  edges: [
    // Onboarding → first strategy node
    { id: "e-onb-s1", source: IDS.onboarding, target: IDS.s1, type: "default" },

    // Strategy chain
    { id: "e-s1-s2", source: IDS.s1, target: IDS.s2, type: "default" },
    { id: "e-s2-s3", source: IDS.s2, target: IDS.s3, type: "default" },
    { id: "e-s3-s4", source: IDS.s3, target: IDS.s4, type: "default" },
    { id: "e-s4-s5", source: IDS.s4, target: IDS.s5, type: "default" },
    { id: "e-s5-s6", source: IDS.s5, target: IDS.s6, type: "default" },

    // Strategy → Brief
    { id: "e-s6-b1", source: IDS.s6, target: IDS.b1, type: "default" },

    // Brief chain
    { id: "e-b1-b2", source: IDS.b1, target: IDS.b2, type: "default" },
    { id: "e-b2-b3", source: IDS.b2, target: IDS.b3, type: "default" },
    { id: "e-b3-b4", source: IDS.b3, target: IDS.b4, type: "default" },

    // Brief → Moodboard
    { id: "e-b4-mood", source: IDS.b4, target: IDS.mood, type: "default" },

    // Moodboard → Logo file
    { id: "e-mood-logo", source: IDS.mood, target: IDS.logoFile, type: "default" },

    // Logo → Mockups (fan-out)
    { id: "e-logo-m1", source: IDS.logoFile, target: IDS.m1, type: "default" },
    { id: "e-logo-m2", source: IDS.logoFile, target: IDS.m2, type: "default" },
    { id: "e-logo-m3", source: IDS.logoFile, target: IDS.m3, type: "default" },
    { id: "e-logo-m4", source: IDS.logoFile, target: IDS.m4, type: "default" },
    { id: "e-logo-m5", source: IDS.logoFile, target: IDS.m5, type: "default" },
    { id: "e-logo-m6", source: IDS.logoFile, target: IDS.m6, type: "default" },
  ] as CanvasFramework["edges"],
};
