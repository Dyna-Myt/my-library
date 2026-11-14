import type { ItemType } from "./types";

/**
 * Midnight Indigo + Ember.
 * To change the palette, edit these tokens and the matching ones in app/globals.css.
 */
export const SPINE_COLORS = [
  "#3B4BC8", // indigo
  "#14B8A6", // teal
  "#8B5CF6", // violet
  "#E5487A", // rose
  "#E8D9B5", // sand
] as const;

export const INK_LIGHT = "#F7F4EC";
export const INK_DARK = "#10131C";

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? "#3B4BC8";
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function inkFor(background: string): string {
  return luminance(background) > 0.42 ? INK_DARK : INK_LIGHT;
}

export interface BlobSpec {
  path: string;
  fill: string;
  opacity: number;
  blur: number;
}

export interface SpineProfile {
  seed: number;
  color: string;
  ink: string;
  width: number;
  heightPct: number;
  blobs: BlobSpec[];
  wash: string;
  shadow: string;
}

function wavePath(random: () => number, baseY: number, amplitude: number): string {
  const start = -12;
  const end = 112;
  const steps = 5;
  let y = baseY + (random() - 0.5) * amplitude * 0.7;
  let d = `M ${start} ${y.toFixed(1)}`;
  for (let i = 1; i <= steps; i += 1) {
    const x = start + ((end - start) / steps) * i;
    const nextY = baseY + (random() - 0.5) * amplitude;
    const cx = x - (end - start) / steps / 1.8;
    const cy = y + (random() - 0.5) * amplitude * 1.2;
    d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${nextY.toFixed(1)}`;
    y = nextY;
  }
  d += ` L ${end} 130 L ${start} 130 Z`;
  return d;
}

const TYPE_WIDTH: Record<ItemType, [number, number]> = {
  book: [50, 70],
  article: [44, 52],
  pdf: [50, 66],
  video: [46, 62],
  note: [46, 58],
};

const TYPE_HEIGHT: Record<ItemType, [number, number]> = {
  book: [0.86, 1],
  article: [0.9, 1],
  pdf: [0.86, 1],
  video: [0.85, 0.97],
  note: [0.55, 0.68],
};

export function spineProfile(
  title: string,
  type: ItemType,
  coverColor?: string | null,
): SpineProfile {
  const key = `${title.trim().toLowerCase()}::${type}`;
  const seed = hashString(key);
  const random = mulberry32(seed);
  const override = normalizeHex(coverColor);
  const color = override ?? SPINE_COLORS[seed % SPINE_COLORS.length];
  const ink = inkFor(color);

  const [minWidth, maxWidth] = TYPE_WIDTH[type] ?? TYPE_WIDTH.book;
  const [minHeight, maxHeight] = TYPE_HEIGHT[type] ?? TYPE_HEIGHT.book;

  const width = Math.round(minWidth + random() * (maxWidth - minWidth));
  const heightPct = Number((minHeight + random() * (maxHeight - minHeight)).toFixed(3));

  const blobs: BlobSpec[] = [
    {
      path: wavePath(random, 78, 20),
      fill: mix(color, "#FFFFFF", 0.34),
      opacity: 0.5 + random() * 0.16,
      blur: 6,
    },
    {
      path: wavePath(random, 90, 16),
      fill: mix(color, "#05060B", 0.28),
      opacity: 0.4 + random() * 0.16,
      blur: 8,
    },
    {
      path: wavePath(random, 99, 12),
      fill: mix(color, "#FFFFFF", 0.62),
      opacity: 0.24 + random() * 0.12,
      blur: 9,
    },
  ];

  return {
    seed,
    color,
    ink,
    width,
    heightPct,
    blobs,
    wash: mix(color, "#0A0C16", 0.22),
    shadow: mix(color, "#03040A", 0.55),
  };
}

/** Deterministic category numbering based on the categories actually on the shelf. */
export function numberCategories(categories: string[]): Map<string, string> {
  const unique = Array.from(new Set(categories));
  return new Map(unique.map((category, index) => [category, String(index + 1).padStart(2, "0")]));
}
