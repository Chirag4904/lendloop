import type { CSSProperties, ReactNode } from "react";
import { GripHand, OpenHand } from "./hands";

/**
 * Decorative layers for the homepage journey. Every layer shares the
 * 1440×900 canvas used by the traveling drill, so art and drill stay aligned.
 */

type Win = { x: number; y: number; lit: boolean };

function windows(
  x0: number,
  y0: number,
  warm: string[],
  hide: string[],
): Win[] {
  const list: Win[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const key = `${row},${col}`;
      if (!hide.includes(key))
        list.push({
          x: x0 + col * 94,
          y: y0 + row * 110,
          lit: warm.includes(key),
        });
    }
  return list;
}

const blockB = windows(126, 336, ["0,1", "3,3", "5,2"], ["2,2"]);
const blockA = windows(990, 270, ["0,3", "3,2", "5,3", "4,1"], ["1,1"]);
export const THREAD_PATH =
  "M384 587C540 560 620 400 780 400C910 400 1000 412 1084 411";
const LOOP_PATH = "M270 470A450 290 0 1 1 1170 470A450 290 0 1 1 270 470";

/** Position an overlay in canvas units. */
const at = (x: number, y: number, rotate = 0) =>
  ({ "--x": x, "--y": y, rotate: `${rotate}deg` }) as CSSProperties;

function Windows({ list }: { list: Win[] }) {
  return list.map(({ x, y, lit }) => (
    <g key={`${x}-${y}`}>
      {lit && (
        <circle
          cx={x + 35}
          cy={y + 31}
          r={70}
          fill="url(#story-lamp-glow)"
          opacity={0.35}
        />
      )}
      <rect
        x={x}
        y={y}
        width={70}
        height={62}
        rx={3}
        fill={lit ? "#F2B866" : "#1A3444"}
        opacity={lit ? 0.75 : 1}
      />
    </g>
  ));
}

function Chip({
  mark,
  title,
  note,
  x,
  y,
  rotate,
}: {
  mark: ReactNode;
  title: string;
  note: string;
  x: number;
  y: number;
  rotate?: number;
}) {
  return (
    <div className="scene-chip" style={at(x, y, rotate)}>
      <span className="chip-mark">{mark}</span>
      <span>
        {title}
        <small>{note}</small>
      </span>
    </div>
  );
}

function Home({ x, label, lit }: { x: number; label: string; lit?: boolean }) {
  return (
    <g transform={`translate(${x} 470)`}>
      <circle r={52} fill="#152D3B" stroke="#D9F36A" strokeWidth={3} />
      <path d="M-17 2V-10L0-24L17-10V2Z" fill={lit ? "#D9F36A" : "#F6F2E9"} />
      <text y={30} textAnchor="middle" className="home-label">
        {label}
      </text>
    </g>
  );
}

export function SceneArt() {
  return (
    <>
      <svg className="story-defs" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="story-light-shaft" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#F2B866" stopOpacity="0" />
            <stop offset=".55" stopColor="#F2B866" stopOpacity=".16" />
            <stop offset="1" stopColor="#F2B866" stopOpacity=".02" />
          </linearGradient>
          <radialGradient id="story-lamp-glow">
            <stop stopColor="#F2B866" stopOpacity=".55" />
            <stop offset="1" stopColor="#F2B866" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="story-lime-glow">
            <stop stopColor="#D9F36A" stopOpacity=".5" />
            <stop offset="1" stopColor="#D9F36A" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* 01 · The waiting room */}
      <div className="scene-layer scene-1" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <text x="786" y="132" className="scene-caption">
            CUPBOARD, FLAT 4B · LAST USED: ONE SHELF AGO
          </text>
          <rect
            x="760"
            y="150"
            width="560"
            height="640"
            rx="14"
            fill="#0E2230"
          />
          <rect
            x="780"
            y="170"
            width="520"
            height="600"
            rx="8"
            fill="#10283A"
          />
          <polygon
            points="1300,170 1300,770 1420,820 1420,120"
            fill="#1B3646"
            stroke="#25475A"
            strokeWidth="2"
          />
          <circle cx="1318" cy="470" r="6" fill="#3B5C6D" />
          <polygon
            points="1300,170 1300,770 1030,770 1120,170"
            fill="url(#story-light-shaft)"
          />
          <rect x="780" y="352" width="520" height="12" fill="#21404F" />
          <rect x="812" y="268" width="88" height="84" rx="4" fill="#1B3646" />
          <rect x="812" y="268" width="88" height="14" rx="3" fill="#25475A" />
          <rect x="918" y="300" width="58" height="52" rx="6" fill="#203E4D" />
          <ellipse cx="947" cy="300" rx="29" ry="7" fill="#2B4757" />
          <rect
            x="1190"
            y="250"
            width="22"
            height="102"
            rx="3"
            fill="#1E3A4A"
          />
          <rect x="1216" y="262" width="22" height="90" rx="3" fill="#24414F" />
          <rect
            x="1242"
            y="244"
            width="22"
            height="108"
            rx="3"
            fill="#1B3646"
          />
          <rect x="780" y="612" width="520" height="12" fill="#21404F" />
          <path d="M800 612q30-40 70-32q40 8 70 32z" fill="#1B3646" />
          <rect x="1180" y="540" width="96" height="72" rx="4" fill="#1B3646" />
          <ellipse
            cx="1050"
            cy="606"
            rx="150"
            ry="10"
            fill="#07161F"
            opacity=".5"
          />
          <g fill="#F2B866">
            <circle cx="1150" cy="300" r="2" opacity=".5" />
            <circle cx="1196" cy="420" r="1.5" opacity=".4" />
            <circle cx="1110" cy="470" r="2.5" opacity=".3" />
            <circle cx="1230" cy="520" r="1.8" opacity=".45" />
            <circle cx="1080" cy="380" r="1.4" opacity=".35" />
            <circle cx="1260" cy="360" r="2.2" opacity=".3" />
          </g>
        </svg>
      </div>

      {/* 02 · Next door */}
      <div className="scene-layer scene-2" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <defs>
            <mask
              id="story-thread-mask"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1440"
              height="900"
            >
              <path
                className="thread-reveal"
                d={THREAD_PATH}
                pathLength={1}
                stroke="#fff"
                strokeWidth="16"
                fill="none"
              />
            </mask>
          </defs>
          <circle cx="1240" cy="110" r="46" fill="#F6F2E9" opacity=".05" />
          <circle cx="1240" cy="110" r="30" fill="#F6F2E9" opacity=".08" />
          <rect x="100" y="300" width="380" height="640" fill="#0E2230" />
          <rect x="100" y="284" width="380" height="20" fill="#1B3646" />
          <text x="120" y="272" className="scene-caption">
            BLOCK B
          </text>
          <rect x="960" y="240" width="400" height="700" fill="#0E2230" />
          <rect x="960" y="224" width="400" height="20" fill="#1B3646" />
          <text x="980" y="212" className="scene-caption">
            BLOCK A
          </text>
          <Windows list={blockB} />
          <Windows list={blockA} />
          <rect
            x="314"
            y="556"
            width="70"
            height="62"
            rx="3"
            fill="#24414F"
            stroke="#D9F36A"
            strokeWidth="2"
          />
          <circle cx="1119" cy="411" r="110" fill="url(#story-lime-glow)" />
          <rect x="1084" y="380" width="70" height="62" rx="3" fill="#D9F36A" />
          <rect x="1094" y="402" width="50" height="5" fill="#152D3B" />
          <rect x="1100" y="392" width="8" height="10" fill="#152D3B" />
          <rect x="1126" y="388" width="10" height="14" fill="#152D3B" />
          <circle cx="720" cy="790" r="62" fill="#183243" />
          <circle cx="676" cy="820" r="40" fill="#1B3646" />
          <circle cx="770" cy="818" r="44" fill="#16303F" />
          <path
            d={THREAD_PATH}
            mask="url(#story-thread-mask)"
            stroke="#D9F36A"
            strokeWidth="3"
            strokeDasharray="2 12"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="384" cy="587" r="6" fill="#D9F36A" />
          <circle cx="1084" cy="411" r="6" fill="#D9F36A" />
        </svg>
        <Chip
          mark="B"
          title="Flat 4B"
          note="A drill, mostly resting"
          x={240}
          y={636}
        />
        <Chip
          mark="A"
          title="Flat 7A"
          note="Putting up a shelf on Saturday"
          x={1010}
          y={470}
        />
        <div className="scene-chip chip-search" style={at(520, 640)}>
          <span className="chip-search-icon">⌕</span>
          <span>a drill, this weekend</span>
          <b>Found in your society ↗</b>
        </div>
      </div>

      {/* 03 · The ask */}
      <div className="scene-layer scene-3" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <circle
            cx="1020"
            cy="450"
            r="320"
            fill="url(#story-lime-glow)"
            opacity=".3"
          />
          <path
            d="M600 900C660 720 720 560 820 500C980 420 1180 470 1440 400"
            stroke="#D9F36A"
            strokeWidth="3"
            strokeDasharray="2 12"
            strokeLinecap="round"
            fill="none"
            opacity=".8"
          />
        </svg>
        <div className="story-phone" style={at(840, 110, 4)}>
          <div className="phone-screen">
            <div className="phone-photo">
              <span>ILLUSTRATIVE LISTING</span>
            </div>
            <div className="phone-body">
              <span className="phone-meta">Power Tools · Good</span>
              <strong>Cordless drill</strong>
              <span className="phone-pill">Free to borrow</span>
              <span className="phone-dates">
                Dates <b>Sat → Sun</b>
              </span>
              <span className="phone-button">Request to borrow</span>
              <span className="phone-status">✓ Owner approved</span>
            </div>
          </div>
        </div>
        <Chip
          mark="→"
          title="Request sent"
          note="Sat → Sun · Waiting for the owner"
          x={672}
          y={236}
          rotate={-3}
        />
      </div>

      {/* 04 · The handover */}
      <div className="scene-layer scene-4" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <g transform="translate(0 30)">
            <circle
              cx="720"
              cy="640"
              r="380"
              fill="url(#story-lamp-glow)"
              opacity=".5"
            />
            <path
              d="M140 650C360 450 1080 450 1300 650"
              stroke="#D9F36A"
              strokeWidth="3"
              strokeDasharray="2 12"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          {/* Borrower: an open palm reaching up under the drill's nose. */}
          <g transform="translate(865 705) rotate(-30)">
            <OpenHand />
          </g>
        </svg>
      </div>
      {/* The lender's grip sits above the traveling drill so the fingers wrap its handle. */}
      <div className="scene-layer scene-4 scene-front" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <g transform="translate(712 640) rotate(-21)">
            <GripHand />
          </g>
        </svg>
      </div>

      {/* 05 · Put to use */}
      <div className="scene-layer scene-5" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <rect x="700" y="-60" width="800" height="1020" fill="#EFE9DC" />
          <rect x="700" y="770" width="800" height="190" fill="#E4DDCD" />
          <rect x="700" y="766" width="800" height="6" fill="#D6D0BF" />
          <rect x="820" y="400" width="450" height="20" rx="3" fill="#152D3B" />
          <path
            d="M870 420v40h34M1220 420v40h-34"
            stroke="#152D3B"
            strokeWidth="8"
            fill="none"
          />
          <rect x="850" y="300" width="28" height="100" rx="3" fill="#2B4757" />
          <rect x="880" y="316" width="24" height="84" rx="3" fill="#D9F36A" />
          <rect x="906" y="290" width="30" height="110" rx="3" fill="#536269" />
          <rect
            x="938"
            y="330"
            width="20"
            height="70"
            rx="3"
            transform="rotate(12 948 365)"
            fill="#9FB0B0"
          />
          <path d="M1010 400h70l-8-56h-54z" fill="#C9734E" opacity=".9" />
          <path
            d="M1045 344c-30-40-60-30-70-70c30 10 50 20 70 70zM1045 344c10-50 40-70 70-80c-10 40-30 60-70 80zM1045 344c0-40 0-70 6-100c14 30 10 70-6 100z"
            fill="#5E8B5A"
          />
          <rect
            x="1130"
            y="300"
            width="96"
            height="100"
            rx="4"
            fill="#fff"
            stroke="#152D3B"
            strokeWidth="5"
          />
          <rect x="1144" y="314" width="68" height="72" fill="#D9F36A" />
          <circle cx="1178" cy="350" r="16" fill="#152D3B" />
          <rect x="960" y="660" width="210" height="18" rx="4" fill="#152D3B" />
          <path
            d="M985 678l-20 92M1145 678l20 92"
            stroke="#152D3B"
            strokeWidth="10"
          />
          <g transform="rotate(-6 1300 560)">
            <rect x="1240" y="500" width="130" height="120" fill="#D9F36A" />
            <text x="1256" y="545" className="scene-note">
              Shelf:
            </text>
            <text x="1256" y="580" className="scene-note">
              done ✓
            </text>
          </g>
        </svg>
      </div>

      {/* 06 · Full circle */}
      <div className="scene-layer scene-6" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <ellipse
            cx="720"
            cy="470"
            rx="490"
            ry="325"
            stroke="#D9F36A"
            strokeWidth="1"
            fill="none"
            opacity=".2"
          />
          <path
            className="loop-path"
            d={LOOP_PATH}
            pathLength={1}
            stroke="#D9F36A"
            strokeWidth="3"
            fill="none"
          />
          <Home x={270} label="4B" lit />
          <Home x={1170} label="7A" />
          <text x="720" y="850" textAnchor="middle" className="scene-caption">
            BORROW · USE · RETURN · REPEAT
          </text>
        </svg>
      </div>
    </>
  );
}
