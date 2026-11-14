import type { SpineProfile } from "@/lib/palette";

interface SpineArtProps {
  profile: SpineProfile;
  className?: string;
}

/** Deterministic wavy blobs, keyed off the title hash. */
export function SpineArt({ profile, className }: SpineArtProps) {
  const glowX = 22 + (profile.seed % 55);
  const glowY = 72 + ((profile.seed >> 8) % 22);

  return (
    <span className={`spine-art ${className ?? ""}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <rect x="-4" y="-4" width="108" height="108" fill={profile.wash} />
        <circle
          cx={glowX}
          cy={glowY}
          r={48}
          fill={profile.blobs[0]?.fill ?? profile.color}
          opacity="0.16"
        />
        {profile.blobs.map((blob, index) => (
          <path
            key={index}
            d={blob.path}
            fill={blob.fill}
            opacity={blob.opacity}
            style={{ filter: `blur(${blob.blur}px)` }}
          />
        ))}
        <path
          d="M -10 96 Q 18 90 36 94 T 70 92 T 110 95 L 110 110 L -10 110 Z"
          fill={profile.shadow}
          opacity="0.22"
          style={{ filter: "blur(4px)" }}
        />
      </svg>
    </span>
  );
}
