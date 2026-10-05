import { ImageResponse } from "next/og";

/** App-Icon als PNG: dunkler Grund, "7" in Violett (Felix' LevelUp10 ist gelb), Pfeil nach oben. */
export function renderAppIcon(size: number) {
  const s = size / 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#14161c",
          color: "#a78bfa",
        }}
      >
        <div style={{ fontSize: 120 * s, lineHeight: 1, marginBottom: -20 * s }}>▲</div>
        <div style={{ fontSize: 260 * s, fontWeight: 800, lineHeight: 1, letterSpacing: -10 * s }}>7</div>
      </div>
    ),
    { width: size, height: size },
  );
}
