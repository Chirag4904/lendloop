import type { CSSProperties, ReactNode } from "react";

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
// Matching outline points keep the wrist and finger contours aligned during the handover.
export const HAND_POSES = {
  receiverOpen:
    "M-30.3 58.2L-28.6 48.2L-26.7 38.0L-25.0 27.8L-23.8 17.5L-27.7 8.2L-33.8 -0.2L-39.2 -9.0L-44.5 -17.9L-49.5 -26.9L-51.1 -37.1L-50.8 -47.4L-53.4 -57.4L-56.9 -67.1L-60.7 -76.7L-65.2 -86.0L-59.9 -92.1L-56.3 -91.7L-52.8 -90.6L-49.5 -88.9L-46.5 -86.8L-43.7 -84.4L-41.2 -81.7L-39.0 -78.8L-37.1 -75.6L-35.4 -72.3L-33.8 -69.0L-32.3 -65.7L-30.8 -62.3L-29.2 -59.0L-27.6 -55.7L-25.7 -52.6L-22.8 -50.3L-17.0 -54.3L-12.4 -60.0L-8.4 -66.1L-5.2 -72.7L-2.5 -79.5L-0.9 -86.6L0.1 -93.9L1.5 -101.1L3.1 -108.2L4.7 -115.4L6.5 -122.5L8.4 -129.5L10.6 -136.5L13.2 -143.3L16.7 -149.8L22.5 -153.9L27.2 -153.8L30.6 -150.7L31.3 -146.1L30.7 -141.4L29.7 -136.8L28.7 -132.2L27.6 -127.6L26.4 -123.0L25.3 -118.4L24.2 -113.8L23.3 -109.2L22.4 -104.6L21.6 -99.9L20.9 -95.2L20.2 -90.6L20.5 -86.3L22.0 -90.5L23.0 -95.1L24.0 -99.7L25.1 -104.3L26.2 -108.8L27.4 -113.3L28.7 -117.9L30.0 -122.4L31.3 -126.8L32.7 -131.3L34.2 -135.8L35.7 -140.2L37.4 -144.6L39.3 -148.9L41.7 -152.9L45.6 -155.3L51.0 -154.5L54.8 -150.7L55.0 -145.3L53.7 -139.9L52.2 -134.5L50.6 -129.2L49.1 -123.8L47.6 -118.5L46.2 -113.1L44.8 -107.8L43.4 -102.4L42.1 -97.0L40.8 -91.6L39.5 -86.2L38.5 -80.7L38.4 -79.7L40.4 -77.6L42.2 -81.8L43.7 -86.1L45.5 -90.3L47.3 -94.5L49.3 -98.7L51.3 -102.8L53.4 -106.9L55.4 -111.0L57.5 -115.0L59.5 -119.2L61.5 -123.3L63.4 -127.4L65.2 -131.6L68.4 -134.8L72.9 -134.8L77.3 -131.6L77.9 -126.2L76.3 -120.8L74.2 -115.6L72.0 -110.5L69.8 -105.3L67.6 -100.2L65.4 -95.1L63.3 -89.9L61.3 -84.7L59.2 -79.5L57.3 -74.3L55.4 -69.0L54.2 -64.7L54.4 -65.5L54.2 -60.0L57.3 -59.4L59.5 -62.2L61.4 -65.2L63.2 -68.3L65.1 -71.4L66.9 -74.5L68.7 -77.6L70.6 -80.7L72.5 -83.8L74.3 -86.9L76.2 -90.0L78.1 -93.0L80.1 -96.1L82.1 -99.1L84.2 -101.9L87.6 -102.7L92.2 -93.7L88.4 -83.3L83.6 -73.3L78.7 -63.3L74.1 -53.2L70.0 -42.9L66.9 -32.2L63.5 -21.7L59.4 -11.3L54.6 -1.3L48.6 8.0L42.0 16.9L35.8 26.2L30.9 36.1L29.0 47.0L29.1 58.1L25.4 58.2L21.7 58.2L18.0 58.2L14.3 58.2L10.6 58.2L6.9 58.2L3.1 58.2L-0.6 58.2L-4.3 58.2L-8.0 58.2L-11.7 58.2L-15.4 58.2L-19.1 58.2L-22.9 58.2L-26.6 58.2Z",
  receiverClosed:
    "M-30.0 58.0L-29.7 50.6L-30.2 43.1L-31.4 35.8L-33.3 28.6L-35.9 21.6L-39.1 14.9L-43.0 8.6L-47.5 2.7L-52.5 -2.8L-57.2 -8.6L-61.2 -14.8L-64.5 -21.5L-66.9 -28.5L-68.8 -35.0L-75.9 -37.0L-79.6 -43.1L-79.6 -43.5L-79.5 -43.9L-79.5 -44.3L-79.4 -44.7L-79.3 -45.1L-79.1 -45.5L-79.0 -45.9L-78.8 -46.2L-78.6 -46.6L-78.4 -47.0L-78.2 -47.3L-78.0 -47.7L-77.8 -48.0L-77.5 -48.3L-77.3 -48.7L-77.0 -49.0L-77.8 -49.2L-78.7 -49.5L-79.6 -49.8L-80.4 -50.1L-81.3 -50.5L-82.1 -50.9L-82.9 -51.4L-83.6 -51.9L-84.4 -52.5L-85.0 -53.1L-85.7 -53.7L-86.2 -54.5L-86.7 -55.3L-87.0 -56.1L-87.3 -57.0L-87.4 -57.9L-87.4 -58.6L-87.3 -59.4L-87.2 -60.1L-86.9 -60.8L-86.6 -61.4L-86.3 -62.1L-85.9 -62.7L-85.5 -63.3L-85.0 -63.8L-84.5 -64.3L-84.0 -64.8L-83.4 -65.3L-82.8 -65.8L-82.2 -66.2L-81.6 -66.6L-81.0 -67.0L-81.7 -67.4L-82.4 -67.8L-83.1 -68.2L-83.7 -68.7L-84.3 -69.2L-84.9 -69.8L-85.5 -70.3L-86.0 -71.0L-86.4 -71.7L-86.8 -72.4L-87.1 -73.1L-87.3 -73.9L-87.5 -74.7L-87.6 -75.5L-87.6 -76.3L-87.5 -77.1L-87.3 -77.8L-87.1 -78.6L-86.8 -79.3L-86.4 -80.1L-86.0 -80.7L-85.5 -81.4L-85.0 -82.0L-84.4 -82.6L-83.8 -83.1L-83.2 -83.6L-82.6 -84.1L-81.9 -84.6L-81.2 -85.0L-80.5 -85.3L-79.8 -85.7L-79.0 -86.0L-79.5 -86.6L-79.9 -87.3L-80.4 -88.0L-80.8 -88.8L-81.1 -89.5L-81.4 -90.3L-81.6 -91.1L-81.8 -91.9L-81.9 -92.7L-82.0 -93.5L-82.0 -94.3L-81.9 -95.1L-81.7 -95.9L-81.4 -96.7L-81.1 -97.5L-80.7 -98.2L-79.3 -99.9L-77.5 -101.2L-75.6 -102.1L-73.5 -102.7L-71.3 -103.0L-69.1 -103.1L-67.0 -102.7L-64.8 -102.2L-62.7 -101.7L-60.6 -101.1L-58.5 -100.6L-56.4 -100.1L-54.2 -99.6L-52.1 -99.0L-50.0 -98.5L-48.1 -98.1L-49.3 -99.2L-50.6 -100.3L-51.9 -101.2L-53.3 -102.2L-54.6 -103.0L-56.1 -103.9L-57.5 -104.7L-59.0 -105.5L-60.4 -106.2L-61.9 -106.9L-63.2 -108.0L-64.2 -109.2L-65.0 -110.7L-65.5 -112.2L-65.5 -113.9L-65.2 -115.5L-53.3 -119.5L-39.8 -115.3L-27.2 -108.9L-16.0 -100.3L-5.8 -90.6L3.3 -79.8L9.8 -67.3L13.7 -53.7L15.3 -39.7L17.1 -25.7L20.0 -11.9L23.3 1.9L26.2 15.7L27.4 29.8L28.7 43.8L30.0 57.9L26.3 58.0L22.6 58.0L18.8 58.0L15.1 58.0L11.3 58.0L7.6 58.0L3.8 58.0L0.1 58.0L-3.7 58.0L-7.5 58.0L-11.2 58.0L-15.0 58.0L-18.7 58.0L-22.5 58.0L-26.2 58.0Z",
  lenderClosed:
    "M-115.0 -10.0L-106.6 -11.1L-98.3 -12.6L-90.1 -14.7L-82.2 -17.6L-74.7 -21.5L-67.9 -26.5L-61.7 -32.3L-55.4 -37.9L-48.7 -43.0L-41.6 -47.7L-34.2 -51.8L-26.6 -55.4L-18.7 -58.4L-10.6 -60.8L-2.3 -62.4L6.2 -63.0L9.3 -62.5L12.2 -61.3L14.6 -59.3L16.1 -56.6L16.3 -53.4L15.1 -50.5L13.1 -48.1L10.6 -46.1L7.9 -44.6L5.0 -43.2L2.1 -41.9L-0.7 -40.6L-3.6 -39.3L-6.5 -38.0L-9.3 -36.5L-11.9 -35.0L-8.8 -35.7L-5.6 -36.3L-2.4 -36.8L0.8 -37.3L4.0 -37.7L7.2 -38.0L10.5 -38.2L13.7 -38.2L16.9 -38.2L20.2 -37.9L23.3 -37.4L26.5 -36.5L29.5 -35.4L32.4 -33.9L35.0 -32.0L36.8 -29.4L37.0 -28.7L37.2 -28.0L37.2 -27.3L37.2 -26.6L37.1 -25.9L36.9 -25.2L36.6 -24.5L36.2 -23.9L35.8 -23.3L35.3 -22.8L34.9 -22.2L34.3 -21.7L33.8 -21.3L33.2 -20.8L32.6 -20.4L32.0 -20.0L32.8 -19.8L33.7 -19.5L34.5 -19.2L35.4 -18.9L36.2 -18.5L37.0 -18.0L37.7 -17.6L38.5 -17.0L39.1 -16.4L39.8 -15.8L40.3 -15.1L40.8 -14.4L41.2 -13.5L41.5 -12.7L41.7 -11.8L41.8 -10.9L41.8 -10.2L41.7 -9.5L41.5 -8.7L41.3 -8.1L41.0 -7.4L40.6 -6.7L40.2 -6.1L39.7 -5.6L39.2 -5.0L38.7 -4.5L38.2 -4.0L37.6 -3.6L37.0 -3.1L36.4 -2.7L35.7 -2.4L35.1 -2.0L35.7 -1.5L36.3 -0.9L37.0 -0.2L37.5 0.6L38.0 1.3L38.4 2.1L38.8 3.0L39.0 3.9L39.2 4.8L39.3 5.7L39.2 6.6L39.1 7.5L38.9 8.4L38.7 9.3L38.4 10.2L38.0 11.0L37.6 11.6L37.2 12.3L36.8 12.8L36.3 13.4L35.8 14.0L35.3 14.5L34.7 15.0L34.1 15.4L33.5 15.8L32.9 16.2L32.3 16.6L31.6 17.0L31.0 17.3L30.3 17.6L29.6 17.8L29.1 18.1L29.5 18.5L29.9 19.0L30.2 19.5L30.6 20.0L30.9 20.5L31.2 21.0L31.4 21.6L31.6 22.2L31.8 22.7L31.9 23.3L32.0 23.9L32.0 24.5L32.0 25.1L32.0 25.7L31.9 26.4L31.7 26.9L26.5 34.4L18.1 38.4L9.9 42.6L1.9 47.4L-6.4 51.4L-15.3 54.2L-24.5 55.0L-33.6 53.5L-42.4 50.4L-51.1 47.3L-60.3 46.1L-69.5 47.3L-78.5 49.6L-87.3 52.3L-96.1 55.2L-105.0 58.0L-104.7 53.7L-104.5 49.3L-104.4 45.0L-104.5 40.7L-104.6 36.3L-104.9 32.0L-105.3 27.7L-105.9 23.4L-106.5 19.1L-107.3 14.8L-108.3 10.6L-109.3 6.4L-110.5 2.2L-111.9 -1.9L-113.4 -6.0Z",
  lenderOpen:
    "M-122.5 7.3L-115.1 5.4L-108.3 2.2L-102.5 -2.8L-97.5 -8.5L-92.8 -14.4L-87.7 -20.0L-81.9 -25.0L-75.8 -29.5L-69.5 -33.7L-63.0 -37.6L-56.9 -42.1L-51.0 -47.0L-45.3 -52.0L-39.5 -56.9L-33.3 -61.2L-26.6 -59.8L-26.5 -57.5L-28.0 -55.5L-29.6 -53.7L-31.3 -51.8L-32.9 -50.0L-34.6 -48.3L-36.3 -46.5L-38.1 -44.7L-39.8 -42.9L-41.5 -41.2L-43.2 -39.4L-44.9 -37.6L-46.7 -35.8L-48.4 -34.1L-49.8 -32.1L-48.9 -30.2L-45.3 -31.3L-45.8 -31.1L-43.1 -32.6L-40.0 -34.7L-36.9 -37.0L-33.8 -39.2L-30.7 -41.5L-27.7 -43.8L-24.7 -46.2L-21.7 -48.5L-18.6 -50.9L-15.6 -53.2L-12.6 -55.5L-9.3 -57.6L-5.6 -58.2L-2.7 -55.8L-1.9 -52.8L-3.5 -50.2L-5.9 -48.2L-8.3 -46.2L-10.7 -44.2L-13.1 -42.1L-15.4 -40.0L-17.7 -37.9L-20.1 -35.9L-22.4 -33.8L-24.8 -31.8L-27.2 -29.8L-29.7 -27.9L-32.3 -26.1L-34.7 -24.2L-33.0 -23.2L-32.4 -23.5L-29.0 -25.1L-25.6 -26.9L-22.3 -28.7L-18.9 -30.6L-15.6 -32.4L-12.3 -34.3L-9.0 -36.2L-5.8 -38.1L-2.5 -40.1L0.7 -42.1L4.0 -44.0L7.4 -45.8L11.0 -46.6L14.2 -44.8L15.7 -41.4L14.8 -38.4L12.5 -36.1L10.0 -34.1L7.4 -32.2L4.8 -30.4L2.1 -28.6L-0.6 -26.9L-3.4 -25.2L-6.1 -23.6L-8.9 -21.9L-11.6 -20.3L-14.4 -18.8L-17.3 -17.3L-20.1 -15.8L-23.0 -14.3L-25.5 -12.6L-22.6 -13.1L-19.7 -14.4L-16.7 -15.7L-13.8 -17.1L-10.9 -18.5L-8.0 -19.9L-5.1 -21.4L-2.3 -23.0L0.5 -24.6L3.4 -26.1L6.2 -27.6L9.1 -29.1L12.1 -30.3L15.3 -30.7L17.9 -28.9L18.8 -25.9L17.1 -21.3L13.5 -17.9L9.4 -14.9L5.2 -12.2L0.9 -9.7L-3.5 -7.3L-7.9 -4.9L-12.4 -2.7L-16.9 -0.5L-21.5 1.5L-25.9 3.9L-30.0 6.8L-33.7 10.1L-37.1 13.8L-40.0 17.9L-41.6 22.4L-39.6 23.9L-37.2 24.6L-34.7 25.1L-32.3 25.6L-29.8 26.0L-27.3 26.4L-24.8 26.9L-22.4 27.4L-19.9 28.1L-17.6 29.0L-15.4 30.2L-13.3 31.6L-11.4 33.3L-9.7 35.1L-8.3 37.2L-7.4 39.6L-10.5 44.1L-17.4 42.8L-24.5 42.0L-31.5 41.4L-38.6 41.4L-45.3 43.5L-52.3 44.2L-59.2 42.5L-66.0 40.6L-72.8 38.6L-79.4 36.0L-86.3 35.1L-92.9 37.7L-99.3 40.6L-105.7 43.7L-112.0 46.6L-112.7 44.1L-113.3 41.7L-114.0 39.2L-114.7 36.8L-115.3 34.3L-116.0 31.9L-116.6 29.4L-117.3 26.9L-117.9 24.5L-118.6 22.0L-119.3 19.6L-119.9 17.1L-120.6 14.7L-121.2 12.2L-121.9 9.8Z",
};
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
          {/* Keep the sleeve behind the drill while the closed grip overlaps it. */}
          <g className="handover-receiver">
            <g
              transform="translate(865 705) rotate(-30)"
              stroke="#0E2230"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <path
                d="M-46 53C-47 145-62 299-72 520H70C55 291 45 150 43 53Z"
                fill="#E4DDCD"
              />
              <path
                className="handover-receiver-open"
                d={HAND_POSES.receiverOpen}
                fill="#F6F2E9"
                strokeWidth="2.5"
              />
              <path d="M-47 53Q-4 62 44 53L46 83Q-3 93-49 82Z" fill="#9FB0B0" />
            </g>
          </g>
        </svg>
      </div>
      {/* One unbroken grip silhouette overlaps the drill handle. */}
      <div className="scene-layer scene-4 scene-front" aria-hidden="true">
        <svg className="scene-svg" viewBox="0 0 1440 900">
          <g className="handover-lender">
            <g
              transform="translate(712 640) rotate(-21)"
              stroke="#0E2230"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              <path
                d="M-130-20C-271 0-480 43-780 109L-756 235C-493 166-280 104-112 72Z"
                fill="#2B4757"
              />
              <path
                d="M-142-17L-113-23Q-100 20-103 70L-136 78Q-130 30-142-17Z"
                fill="#D9F36A"
              />
              <path
                className="handover-lender-grip"
                d={HAND_POSES.lenderClosed}
                fill="#F6F2E9"
              />
              <path
                className="handover-lender-open"
                d={HAND_POSES.lenderOpen}
                fill="#F6F2E9"
                strokeWidth="2.5"
                opacity="0"
              />
            </g>
          </g>
          <g className="handover-receiver">
            <g transform="translate(865 705) rotate(-30)">
              <path
                className="handover-receiver-grip"
                d={HAND_POSES.receiverClosed}
                fill="#F6F2E9"
                stroke="#0E2230"
                strokeWidth="2.5"
                strokeLinejoin="round"
                opacity="0"
              />
            </g>
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
