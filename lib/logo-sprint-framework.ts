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

// ─── Collateral mockup images ─────────────────────────────────────────────────
const COLLATERAL_MOCKUPS = [
  {
    url: "https://images.unsplash.com/photo-1497366754035-f200581a7bee?w=800&h=500&fit=crop",
    label: "Brand Stationery",
    prompt: "Recreate this brand collateral applied to premium letterhead and stationery, professional product photography on clean white surface",
  },
  {
    url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=500&fit=crop",
    label: "Social Media Post",
    prompt: "Adapt this brand collateral into a polished Instagram-ready social media post, maintaining brand identity and colours",
  },
  {
    url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=500&fit=crop",
    label: "Print Material",
    prompt: "Scale this brand collateral to a premium large-format print piece — A2 poster, studio photography on neutral background",
  },
];

// ─── Logo mockup images ───────────────────────────────────────────────────────
const LOGO_MOCKUPS = [
  {
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=500&fit=crop",
    label: "macOS Dock Icon",
    prompt: "Logo as a macOS app icon sitting in the dock on a MacBook desktop, photorealistic",
  },
  {
    url: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&h=500&fit=crop",
    label: "Business Card",
    prompt: "Logo on business cards, professional photography, clean background",
  },
  {
    url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=500&fit=crop",
    label: "T-Shirt Breast Logo",
    prompt: "Small logo embroidered on the breast pocket area of a premium white t-shirt, flat lay photography",
  },
  {
    url: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&h=500&fit=crop",
    label: "Logo on Black",
    prompt: "Logo centred on a pure black background, clean brand identity shot",
  },
  {
    url: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800&h=500&fit=crop",
    label: "Logo on White",
    prompt: "Logo centred on a pure white background, clean brand identity shot",
  },
];

// ─── Node IDs ─────────────────────────────────────────────────────────────────
const IDS = {
  onboarding: "ls-onboarding",
  strategy: "ls-strategy",
  collateral: "ls-collateral",
  cm1: "ls-collateral-mockup-1",
  cm2: "ls-collateral-mockup-2",
  cm3: "ls-collateral-mockup-3",
  logoFile: "ls-logo-file",
  m1: "ls-mockup-1",
  m2: "ls-mockup-2",
  m3: "ls-mockup-3",
  m4: "ls-mockup-4",
  m5: "ls-mockup-5",
};

export const LOGO_SPRINT_FRAMEWORK: CanvasFramework = {
  id: "framework-logo-sprint",
  name: "Logo Sprint",
  description:
    "A structured end-to-end logo design sprint covering brand strategy, creative brief, moodboard curation, and mockup delivery — with a presentation flow for final review.",
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
      id: "onboarding_docs",
      label: "Onboarding Documents",
      type: "file",
      required: false,
      multiple: true,
    },
    {
      id: "strategy_pdf",
      label: "Strategy Documents",
      type: "file",
      required: false,
      multiple: true,
    },
    {
      id: "logo_file",
      label: "Logo Files",
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
    {
      id: "concept_1_brief",
      label: "Creative Concept 1 Brief + Moodboard",
      type: "file",
      required: false,
      multiple: true,
    },
    {
      id: "concept_2_brief",
      label: "Creative Concept 2 Brief + Moodboard",
      type: "file",
      required: false,
      multiple: true,
    },
    {
      id: "concept_3_brief",
      label: "Creative Concept 3 Brief + Moodboard",
      type: "file",
      required: false,
      multiple: true,
    },
  ],

  // ─── Nodes ───────────────────────────────────────────────────────────────
  nodes: [
    // ── Onboarding Documents (standalone) ─────────────────────────────────
    {
      id: IDS.onboarding,
      type: "file",
      position: { x: 60, y: 60 },
      selected: false,
      data: {
        label: "Onboarding Documents",
        fileName: "onboarding-documents",
        product: "atlas",
        status: "draft",
        fileExtension: ".pdf",
        lastModified: NOW,
        previewImages: [
          "https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=300&fit=crop",
        ],
      },
    },

    // ── Strategy Documents (standalone) ───────────────────────────────────
    {
      id: IDS.strategy,
      type: "file",
      position: { x: 60, y: 380 },
      selected: false,
      data: {
        label: "Strategy Documents",
        fileName: "strategy-documents",
        product: "atlas",
        status: "draft",
        fileExtension: ".pdf",
        lastModified: NOW,
        previewImages: [
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
        ],
      },
    },

    // ── Collateral ────────────────────────────────────────────────────────
    {
      id: IDS.collateral,
      type: "file",
      position: { x: 600, y: 220 },
      selected: false,
      data: {
        label: "Collateral",
        fileName: "brand-collateral",
        product: "atlas",
        status: "draft",
        fileExtension: ".pdf",
        lastModified: NOW,
        previewImages: [
          "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop",
        ],
      },
    },

    // ── Collateral Mockup Nodes ───────────────────────────────────────────
    {
      id: IDS.cm1,
      type: "mockupImage",
      position: { x: 1040, y: 60 },
      selected: false,
      data: {
        label: COLLATERAL_MOCKUPS[0].label,
        imageUrl: COLLATERAL_MOCKUPS[0].url,
        prompt: COLLATERAL_MOCKUPS[0].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.cm2,
      type: "mockupImage",
      position: { x: 1040, y: 340 },
      selected: false,
      data: {
        label: COLLATERAL_MOCKUPS[1].label,
        imageUrl: COLLATERAL_MOCKUPS[1].url,
        prompt: COLLATERAL_MOCKUPS[1].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.cm3,
      type: "mockupImage",
      position: { x: 1040, y: 620 },
      selected: false,
      data: {
        label: COLLATERAL_MOCKUPS[2].label,
        imageUrl: COLLATERAL_MOCKUPS[2].url,
        prompt: COLLATERAL_MOCKUPS[2].prompt,
        generatedAt: NOW,
      },
    },

    // ── Logo File ─────────────────────────────────────────────────────────
    {
      id: IDS.logoFile,
      type: "file",
      position: { x: 1600, y: 220 },
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

    // ── Logo Mockup Nodes ─────────────────────────────────────────────────
    {
      id: IDS.m1,
      type: "mockupImage",
      position: { x: 2040, y: 60 },
      selected: false,
      data: {
        label: LOGO_MOCKUPS[0].label,
        imageUrl: LOGO_MOCKUPS[0].url,
        prompt: LOGO_MOCKUPS[0].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m2,
      type: "mockupImage",
      position: { x: 2320, y: 60 },
      selected: false,
      data: {
        label: LOGO_MOCKUPS[1].label,
        imageUrl: LOGO_MOCKUPS[1].url,
        prompt: LOGO_MOCKUPS[1].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m3,
      type: "mockupImage",
      position: { x: 2040, y: 340 },
      selected: false,
      data: {
        label: LOGO_MOCKUPS[2].label,
        imageUrl: LOGO_MOCKUPS[2].url,
        prompt: LOGO_MOCKUPS[2].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m4,
      type: "mockupImage",
      position: { x: 2320, y: 340 },
      selected: false,
      data: {
        label: LOGO_MOCKUPS[3].label,
        imageUrl: LOGO_MOCKUPS[3].url,
        prompt: LOGO_MOCKUPS[3].prompt,
        generatedAt: NOW,
      },
    },
    {
      id: IDS.m5,
      type: "mockupImage",
      position: { x: 2180, y: 620 },
      selected: false,
      data: {
        label: LOGO_MOCKUPS[4].label,
        imageUrl: LOGO_MOCKUPS[4].url,
        prompt: LOGO_MOCKUPS[4].prompt,
        generatedAt: NOW,
      },
    },

  ] as CanvasFramework["nodes"],

  // ─── Edges ───────────────────────────────────────────────────────────────
  edges: [
    // Collateral → collateral mockups (fan-out)
    { id: "e-coll-cm1", source: IDS.collateral, target: IDS.cm1, type: "default" },
    { id: "e-coll-cm2", source: IDS.collateral, target: IDS.cm2, type: "default" },
    { id: "e-coll-cm3", source: IDS.collateral, target: IDS.cm3, type: "default" },

    // Logo → logo mockups (fan-out)
    { id: "e-logo-m1", source: IDS.logoFile, target: IDS.m1, type: "default" },
    { id: "e-logo-m2", source: IDS.logoFile, target: IDS.m2, type: "default" },
    { id: "e-logo-m3", source: IDS.logoFile, target: IDS.m3, type: "default" },
    { id: "e-logo-m4", source: IDS.logoFile, target: IDS.m4, type: "default" },
    { id: "e-logo-m5", source: IDS.logoFile, target: IDS.m5, type: "default" },
  ] as CanvasFramework["edges"],

  // ─── Presentation Flows ───────────────────────────────────────────────────
  presentationFlows: [
    {
      id: "flow-ls-final",
      name: "Final Presentation",
      edges: [
        { id: "pfe-logo-m1", source: IDS.logoFile, target: IDS.m1, type: "default" },
        { id: "pfe-m1-m2", source: IDS.m1, target: IDS.m2, type: "default" },
        { id: "pfe-m2-m3", source: IDS.m2, target: IDS.m3, type: "default" },
        { id: "pfe-m3-m4", source: IDS.m3, target: IDS.m4, type: "default" },
        { id: "pfe-m4-m5", source: IDS.m4, target: IDS.m5, type: "default" },
      ],
      groups: [],
    },
  ],
};
