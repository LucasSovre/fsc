import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const tile = (filled: boolean) => <div style={{ width: 42, height: 42, borderRadius: 10, border: "5px solid #f6f6f6", background: filled ? "#aaa0d0" : "transparent" }} />;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#272725" }}>
      <div style={{ display: "flex", flexWrap: "wrap", width: 98, gap: 14, transform: "rotate(-8deg)" }}>{tile(false)}{tile(false)}{tile(false)}{tile(true)}</div>
    </div>,
    size,
  );
}
