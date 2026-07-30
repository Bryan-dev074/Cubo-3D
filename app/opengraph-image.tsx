import { ImageResponse } from "next/og";

export const alt = "Cubo Mágico 3D interactivo";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#edf1f3",
          color: "#20262a",
          display: "flex",
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#0f4fd4",
            color: "#ffffff",
            display: "flex",
            fontSize: 24,
            fontWeight: 900,
            justifyContent: "center",
            letterSpacing: "0.12em",
            width: 84,
            writingMode: "vertical-rl",
          }}
        >
          CUBO 3D
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "72px 80px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              width: 500,
            }}
          >
            <div
              style={{
                background: "#0f4fd4",
                display: "flex",
                height: 8,
                marginBottom: 28,
                width: 82,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 86,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
              }}
            >
              <span>Cubo</span>
              <span>Mágico 3D</span>
            </div>
            <div
              style={{
                color: "#596269",
                display: "flex",
                fontSize: 28,
                lineHeight: 1.35,
                marginTop: 34,
                maxWidth: 460,
              }}
            >
              Desordénalo. Resuélvelo. Llévalo a tus manos.
            </div>
          </div>

          <svg
            aria-hidden="true"
            height="500"
            style={{
              marginLeft: "auto",
              marginTop: -10,
            }}
            viewBox="0 0 520 500"
            width="520"
          >
            <ellipse cx="268" cy="440" fill="#172027" opacity=".17" rx="192" ry="34" />
            <path d="M260 40 472 157 260 274 48 157Z" fill="#f0f1ec" stroke="#111416" strokeWidth="24" strokeLinejoin="round" />
            <path d="M48 157 260 274v216L48 373Z" fill="#145bc5" stroke="#111416" strokeWidth="24" strokeLinejoin="round" />
            <path d="M260 274 472 157v216L260 490Z" fill="#e6382d" stroke="#111416" strokeWidth="24" strokeLinejoin="round" />
            <path d="M119 118 331 235M189 79 401 196M119 196 331 313M189 235 401 352M119 274 331 391M189 313 401 430" fill="none" stroke="#111416" strokeWidth="13" />
            <path d="M260 40v450M48 157 472 373M472 157 48 373" fill="none" stroke="#111416" strokeWidth="13" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
