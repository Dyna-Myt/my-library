import { ImageResponse } from "next/og";

export const alt = "My Library — a dark bookshelf of colourful spines";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const spines = [
  { color: "#3B4BC8", ink: "#F7F4EC", height: 250, width: 74, title: "MED—ITATIONS" },
  { color: "#E5487A", ink: "#F7F4EC", height: 292, width: 62, title: "ATOMIC HABITS" },
  { color: "#14B8A6", ink: "#10131C", height: 266, width: 68, title: "IKIGAI" },
  { color: "#E8D9B5", ink: "#10131C", height: 234, width: 56, title: "THE BOOK OF FIVE RINGS" },
  { color: "#8B5CF6", ink: "#F7F4EC", height: 280, width: 70, title: "NAVAL" },
  { color: "#FF6A4D", ink: "#1C0F0B", height: 258, width: 58, title: "PHILOSOPHY" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#090B12",
          backgroundImage:
            "radial-gradient(circle at 72% 4%, rgba(95,72,190,0.38), transparent 42%), radial-gradient(circle at 10% 90%, rgba(255,106,77,0.13), transparent 40%)",
          color: "#EDEFF7",
          padding: "62px 72px 0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 34 }}>
            <div style={{ width: 9, height: 24, background: "#3B4BC8", borderRadius: 2 }} />
            <div style={{ width: 9, height: 32, background: "#E5487A", borderRadius: 2 }} />
            <div style={{ width: 9, height: 27, background: "#14B8A6", borderRadius: 2 }} />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 17,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "#FF6A4D",
              fontWeight: 700,
            }}
          >
            A private shelf
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 104,
              lineHeight: 0.96,
              letterSpacing: -4,
              fontWeight: 700,
            }}
          >
            My Library
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 25,
              lineHeight: 1.35,
              color: "#8A93AB",
              maxWidth: 660,
            }}
          >
            Books, essays, PDFs, videos and notes — browsed on a long, dark shelf and kept in one
            quiet place.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: "auto" }}>
          {spines.map((spine, index) => (
            <div
              key={spine.title}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                width: spine.width,
                height: spine.height,
                borderRadius: "5px 5px 0 0",
                background: spine.color,
                color: spine.ink,
                position: "relative",
                overflow: "hidden",
                boxShadow: "inset -7px 0 12px rgba(0,0,0,0.34)",
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 4,
                  right: 4,
                  height: 5,
                  background: "#F5EEDA",
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: -18,
                  right: -18,
                  bottom: -34,
                  height: 108,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.34)",
                  filter: "blur(14px)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  marginTop: 22,
                  fontSize: index === 4 ? 15 : 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {spine.title}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: 22, background: "transparent" }} />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 24,
            background: "linear-gradient(180deg, #232B3F, #161B28)",
            boxShadow: "0 -1px 0 rgba(255,255,255,0.14)",
          }}
        />
      </div>
    ),
    size,
  );
}
