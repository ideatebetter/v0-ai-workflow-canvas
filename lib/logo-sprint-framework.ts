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
  pgMockups: "ls-pg-mockups",
  pgCreativeConcept: "ls-pg-creative-concept",
  pgFinal: "ls-pg-final",
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
    {
      id: "moodboard_content",
      label: "Moodboard Content",
      type: "file",
      required: false,
      multiple: true,
    },
    {
      id: "collateral",
      label: "Collateral",
      type: "file",
      required: false,
      multiple: true,
      tooltip: "Drop in examples of the logo being applied in graphics and we'll build them out into high-fidelity mockups.",
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
      type: "briefInput",
      position: { x: 60, y: 360 },
      selected: false,
      data: { label: "Brand Discovery", cardKey: "brand-discovery", mode: "idle", fields: {} },
    },
    {
      id: IDS.s2,
      type: "briefInput",
      position: { x: 60, y: 570 },
      selected: false,
      data: { label: "Target Audience", cardKey: "target-audience", mode: "idle", fields: {} },
    },
    {
      id: IDS.s3,
      type: "briefInput",
      position: { x: 60, y: 780 },
      selected: false,
      data: { label: "Brand Values & Personality", cardKey: "brand-values", mode: "idle", fields: {} },
    },
    {
      id: IDS.s4,
      type: "briefInput",
      position: { x: 60, y: 990 },
      selected: false,
      data: { label: "Competitive Landscape", cardKey: "competitive-landscape", mode: "idle", fields: {} },
    },
    {
      id: IDS.s5,
      type: "briefInput",
      position: { x: 60, y: 1200 },
      selected: false,
      data: { label: "Positioning Statement", cardKey: "positioning-statement", mode: "idle", fields: {} },
    },
    {
      id: IDS.s6,
      type: "briefInput",
      position: { x: 60, y: 1410 },
      selected: false,
      data: { label: "Visual Direction", cardKey: "visual-direction", mode: "idle", fields: {} },
    },

    // ── Creative Brief nodes ──────────────────────────────────────────────
    {
      id: IDS.b1,
      type: "briefInput",
      position: { x: 460, y: 360 },
      selected: false,
      data: { label: "Project Overview", cardKey: "project-overview", mode: "idle", fields: {} },
    },
    {
      id: IDS.b2,
      type: "briefInput",
      position: { x: 460, y: 570 },
      selected: false,
      data: { label: "Design Objectives", cardKey: "design-objectives", mode: "idle", fields: {} },
    },
    {
      id: IDS.b3,
      type: "briefInput",
      position: { x: 460, y: 780 },
      selected: false,
      data: { label: "Creative Constraints", cardKey: "creative-constraints", mode: "idle", fields: {} },
    },
    {
      id: IDS.b4,
      type: "briefInput",
      position: { x: 460, y: 990 },
      selected: false,
      data: { label: "Deliverables & Timeline", cardKey: "deliverables-timeline", mode: "idle", fields: {} },
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

    // ── Presentation slide-group helpers (used inside Final Presentation flow) ─
    // Groups all brief cards into a single combined slide
    {
      id: IDS.pgBrief,
      type: "presentationGroup",
      position: { x: 460, y: 1260 },
      selected: false,
      data: {
        label: "Creative Brief — All Cards",
        nodeIds: [IDS.b1, IDS.b2, IDS.b3, IDS.b4],
        thumbnails: [],
        originalNodes: [],
      },
    },
    // Groups all mockup images into a single combined slide
    {
      id: IDS.pgMockups,
      type: "presentationGroup",
      position: { x: 1740, y: 1240 },
      selected: false,
      data: {
        label: "Mockups — All Environments",
        nodeIds: [IDS.m1, IDS.m2, IDS.m3, IDS.m4, IDS.m5, IDS.m6],
        thumbnails: MOCKUP_IMAGES.slice(0, 4).map((i) => i.url),
        originalNodes: [],
      },
    },

    // ── Presentation flow cards (visible on canvas) ───────────────────────
    // 1. Strategy Presentation card
    {
      id: IDS.pgStrategy,
      type: "presentationGroup",
      position: { x: 60, y: 1800 },
      selected: false,
      data: {
        label: "Strategy Presentation",
        nodeIds: [IDS.s1, IDS.s2, IDS.s3, IDS.s4, IDS.s5, IDS.s6],
        thumbnails: [],
        originalNodes: [],
      },
    },
    // 2. Creative Concept card (brief cards → moodboard)
    {
      id: IDS.pgCreativeConcept,
      type: "presentationGroup",
      position: { x: 620, y: 1800 },
      selected: false,
      data: {
        label: "Creative Concept",
        nodeIds: [IDS.b1, IDS.b2, IDS.b3, IDS.b4, IDS.mood],
        thumbnails: MOOD_IMAGES.slice(0, 4).map((i) => i.thumbnail),
        originalNodes: [],
      },
    },
    // 3. Final Presentation card (brief group → logo → mockups group)
    {
      id: IDS.pgFinal,
      type: "presentationGroup",
      position: { x: 1180, y: 1800 },
      selected: false,
      data: {
        label: "Final Presentation",
        nodeIds: [IDS.pgBrief, IDS.logoFile, IDS.pgMockups],
        thumbnails: [
          MOCKUP_IMAGES[0].url,
          MOCKUP_IMAGES[1].url,
          MOCKUP_IMAGES[2].url,
          MOCKUP_IMAGES[3].url,
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

  // ─── Presentation Flows ───────────────────────────────────────────────────
  presentationFlows: [
    // 1. Strategy Presentation — each strategy card as its own slide
    {
      id: "flow-ls-strategy",
      name: "Strategy Presentation",
      edges: [
        { id: "pfe-s1-s2", source: IDS.s1, target: IDS.s2, type: "default" },
        { id: "pfe-s2-s3", source: IDS.s2, target: IDS.s3, type: "default" },
        { id: "pfe-s3-s4", source: IDS.s3, target: IDS.s4, type: "default" },
        { id: "pfe-s4-s5", source: IDS.s4, target: IDS.s5, type: "default" },
        { id: "pfe-s5-s6", source: IDS.s5, target: IDS.s6, type: "default" },
      ],
      groups: [],
    },
    // 2. Creative Concept — each brief card individually, then moodboard
    {
      id: "flow-ls-creative",
      name: "Creative Concept",
      edges: [
        { id: "pfe-b1-b2", source: IDS.b1, target: IDS.b2, type: "default" },
        { id: "pfe-b2-b3", source: IDS.b2, target: IDS.b3, type: "default" },
        { id: "pfe-b3-b4", source: IDS.b3, target: IDS.b4, type: "default" },
        { id: "pfe-b4-mood", source: IDS.b4, target: IDS.mood, type: "default" },
      ],
      groups: [],
    },
    // 3. Final Presentation — brief on one slide, logo, then all mockups on one slide
    //    pgBrief and pgMockups are presentationGroup nodes; the viewer expands them
    //    into combined slides showing all their nodeIds simultaneously.
    {
      id: "flow-ls-final",
      name: "Final Presentation",
      edges: [
        { id: "pfe-pgbrief-logo", source: IDS.pgBrief, target: IDS.logoFile, type: "default" },
        { id: "pfe-logo-pgmockups", source: IDS.logoFile, target: IDS.pgMockups, type: "default" },
      ],
      groups: [],
    },
  ],
};
