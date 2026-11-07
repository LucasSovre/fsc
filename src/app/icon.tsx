import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const tile = (filled: boolean) => <div style={{ width: 120, height: 120, borderRadius: 28, border: "14px solid #f6f6f6", background: filled ? "#aaa0d0" : "transparent" }} />;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#272725" }}>
      <div style={{ display: "flex", flexWrap: "wrap", width: 280, gap: 40, transform: "rotate(-8deg)" }}>{tile(false)}{tile(false)}{tile(false)}{tile(true)}</div>
    </div>,
    size,
  );
}
