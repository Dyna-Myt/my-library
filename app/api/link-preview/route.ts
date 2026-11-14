import { NextResponse } from "next/server";
import type { ItemType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /\.local$/i,
  /\.internal$/i,
];

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function cleanText(value: string | undefined | null): string {
  if (!value) return "";
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
  return "";
}

function titleFromHtml(html: string): string {
  const og = metaContent(html, "og:title") || metaContent(html, "twitter:title");
  if (og) return og;
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? cleanText(match[1]) : "";
}

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }

  const rawUrl = typeof body === "object" && body !== null && "url" in body ? String((body as { url: unknown }).url) : "";
  if (!rawUrl.trim()) {
    return NextResponse.json({ error: "Paste a link first." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https links are supported." }, { status: 400 });
  }
  if (isPrivateHost(url.hostname)) {
    return NextResponse.json({ error: "That host can't be read from here." }, { status: 400 });
  }

  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  let suggestedType: ItemType = url.pathname.toLowerCase().endsWith(".pdf") ? "pdf" : "article";
  const isSubstack = host === "substack.com" || host.endsWith(".substack.com");
  let suggestedCategory = isSubstack ? "Substack" : undefined;

  try {
    // YouTube and Vimeo expose a friendly oEmbed response.
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      suggestedType = "video";
      const oembed = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.toString())}`,
        { signal: AbortSignal.timeout(7000), headers: { "user-agent": "MyLibrary/1.0" } },
      );
      if (oembed.ok) {
        const data = (await oembed.json()) as { title?: string; author_name?: string };
        return NextResponse.json({
          url: url.toString(),
          title: cleanText(data.title),
          author: cleanText(data.author_name),
          siteName: "YouTube",
          suggestedType,
        });
      }
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      suggestedType = "video";
      const oembed = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}`,
        { signal: AbortSignal.timeout(7000), headers: { "user-agent": "MyLibrary/1.0" } },
      );
      if (oembed.ok) {
        const data = (await oembed.json()) as { title?: string; author_name?: string };
        return NextResponse.json({
          url: url.toString(),
          title: cleanText(data.title),
          author: cleanText(data.author_name),
          siteName: "Vimeo",
          suggestedType,
        });
      }
    }

    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MyLibraryBot/1.0; +https://example.com) AppleWebKit/537.36",
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
        "accept-language": "en",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `That page answered with ${response.status}. Add the details by hand.` },
        { status: 422 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/pdf")) {
      const filename = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
      return NextResponse.json({
        url: url.toString(),
        title: filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "),
        author: new URL(url.origin).hostname.replace(/^www\./, ""),
        siteName: url.hostname.replace(/^www\./, ""),
        suggestedType: "pdf",
      });
    }

    if (!contentType.includes("html") && !contentType.includes("xml") && contentType !== "") {
      return NextResponse.json(
        { error: "That link is not a web page or PDF. Add the details by hand." },
        { status: 422 },
      );
    }

    const raw = await response.text();
    const html = raw.slice(0, 900_000);

    // Substacks on custom domains still serve their assets from substackcdn.com.
    if (!suggestedCategory && /substackcdn\.com|substack\.com\/api/i.test(html)) {
      suggestedCategory = "Substack";
    }

    const title = titleFromHtml(html);
    if (!title) {
      return NextResponse.json(
        { error: "No title found on that page. Add one by hand." },
        { status: 422 },
      );
    }

    const author =
      metaContent(html, "author") ||
      metaContent(html, "article:author") ||
      metaContent(html, "twitter:creator") ||
      "";
    const siteName = metaContent(html, "og:site_name") || url.hostname.replace(/^www\./, "");
    const ogType = metaContent(html, "og:type");
    if (ogType.includes("video")) suggestedType = "video";

    return NextResponse.json({
      url: url.toString(),
      title,
      author,
      siteName,
      suggestedType,
      suggestedCategory,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "That site took too long to answer. Add the details by hand."
        : "Could not read that link. Add the details by hand.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
