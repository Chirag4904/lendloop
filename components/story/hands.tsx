/**
 * Illustrative hands for the handover chapter. Both share the scene's cream
 * skin and ink outline; fingers are round-capped phalanx strokes so they taper
 * and bend like a real hand instead of reading as stacked pills.
 */

const SKIN = "#F6F2E9";
const INK = "#0E2230";
const SHADE = "#D8CEBA";
const OUTLINE = 6;
const RAD = Math.PI / 180;

type FingerSpec = {
  x: number;
  y: number;
  /** Degrees: 0 points up, positive turns clockwise. */
  angle: number;
  length: number;
  width: number;
  /** Extra bend added at each joint. */
  curl?: number;
  /** Phalanx shares of the length. */
  joints?: number[];
};

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  a: number;
};

function phalanges({
  x,
  y,
  angle,
  length,
  width,
  curl = 0,
  joints = [0.42, 0.32, 0.26],
}: FingerSpec): Segment[] {
  const out: Segment[] = [];
  let a = angle;
  let px = x;
  let py = y;
  joints.forEach((share, i) => {
    const l = length * share;
    const nx = px + Math.sin(a * RAD) * l;
    const ny = py - Math.cos(a * RAD) * l;
    out.push({ x1: px, y1: py, x2: nx, y2: ny, w: width * (1 - i * 0.07), a });
    px = nx;
    py = ny;
    a += curl;
  });
  return out;
}

function Strokes({
  segs,
  color,
  extra = 0,
}: {
  segs: Segment[];
  color: string;
  extra?: number;
}) {
  return segs.map((s, i) => (
    <line
      key={i}
      x1={s.x1}
      y1={s.y1}
      x2={s.x2}
      y2={s.y2}
      stroke={color}
      strokeWidth={s.w + extra}
      strokeLinecap="round"
    />
  ));
}

/** A short shade line across each joint. */
function Creases({ segs, scale = 0.3 }: { segs: Segment[]; scale?: number }) {
  return segs.slice(1).map((s, i) => {
    const a = ((segs[i].a + s.a) / 2) * RAD;
    const dx = Math.cos(a) * s.w * scale;
    const dy = Math.sin(a) * s.w * scale;
    return (
      <line
        key={i}
        x1={s.x1 - dx}
        y1={s.y1 - dy}
        x2={s.x1 + dx}
        y2={s.y1 + dy}
        stroke={SHADE}
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  });
}

function Nail({ segs }: { segs: Segment[] }) {
  const tip = segs[segs.length - 1];
  const t = 0.58;
  const cx = tip.x1 + (tip.x2 - tip.x1) * t;
  const cy = tip.y1 + (tip.y2 - tip.y1) * t;
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={tip.w * 0.34}
      ry={tip.w * 0.26}
      transform={`rotate(${tip.a - 90} ${cx} ${cy})`}
      fill={SHADE}
    />
  );
}

/** One finger with its own outline, for stacking overlaps. */
function Finger({ segs }: { segs: Segment[] }) {
  return (
    <>
      <Strokes segs={segs} color={INK} extra={OUTLINE} />
      <Strokes segs={segs} color={SKIN} />
    </>
  );
}

/**
 * Borrower: an open palm facing the viewer, fingers slightly spread and the
 * thumb resting out to the side. Origin is the palm center; fingers point up.
 */
export function OpenHand() {
  const fingers = [
    { x: -42, y: -40, angle: -5, length: 80, width: 26, curl: -2 },
    { x: -13, y: -46, angle: -1, length: 88, width: 26 },
    { x: 16, y: -44, angle: 4, length: 82, width: 25, curl: 2 },
    { x: 43, y: -34, angle: 10, length: 62, width: 22, curl: 4 },
  ].map(phalanges);
  const thumb = phalanges({
    x: -46,
    y: 16,
    angle: -56,
    length: 72,
    width: 31,
    curl: -8,
    joints: [0.55, 0.45],
  });
  // Palm with the thenar bulge on the thumb side, narrowing into the wrist.
  const palm =
    "M-56 -34C-66 -12 -78 16 -68 38C-60 50 -48 58 -42 66C-40 78 -38 90 -38 104L38 104C38 90 40 78 44 66C54 52 62 30 58 2C57 -12 56 -24 54 -32C30 -48 -20 -52 -56 -34Z";
  return (
    <g>
      <path d="M0 110V620" stroke={INK} strokeWidth={100} />
      <path d="M0 110V620" stroke="#E4DDCD" strokeWidth={94} />
      <path d={palm} fill={INK} stroke={INK} strokeWidth={OUTLINE} />
      {fingers.map((segs, i) => (
        <Strokes key={i} segs={segs} color={INK} extra={OUTLINE} />
      ))}
      <Strokes segs={thumb} color={INK} extra={OUTLINE} />
      {fingers.map((segs, i) => (
        <Strokes key={i} segs={segs} color={SKIN} />
      ))}
      <Strokes segs={thumb} color={SKIN} />
      <path d={palm} fill={SKIN} />
      <g stroke={SHADE} strokeWidth={3.5} strokeLinecap="round" fill="none">
        <path d="M-40 -20C-16 -32 14 -34 44 -24" />
        <path d="M-54 6C-26 -4 4 -4 30 2" />
        <path d="M-28 -24C-46 -4 -50 24 -40 56" />
        <path d="M-30 86C-10 92 10 92 30 86" />
      </g>
      {fingers.map((segs, i) => (
        <Creases key={i} segs={segs} />
      ))}
      <Creases segs={thumb} />
      <path d="M0 96V130" stroke={INK} strokeWidth={104} />
      <path d="M0 97V129" stroke="#9FB0B0" strokeWidth={98} />
    </g>
  );
}

/**
 * Lender: the back of a hand gripping a vertical handle centered on the
 * origin. Fingers wrap across and curl around its far edge; the thumb rests
 * over the top. The arm leaves toward the left.
 */
export function GripHand() {
  const fingers = [
    { x: -8, y: 32, angle: 90, length: 58, width: 19, curl: 38 },
    { x: -8, y: 8, angle: 90, length: 68, width: 22, curl: 34 },
    { x: -8, y: -16, angle: 90, length: 74, width: 24, curl: 32 },
    { x: -8, y: -40, angle: 90, length: 70, width: 23, curl: 34 },
  ].map(phalanges);
  const thumb = phalanges({
    x: -36,
    y: -48,
    angle: 66,
    length: 68,
    width: 26,
    curl: 44,
    joints: [0.55, 0.45],
  });
  // Back of the hand from the wrist (left) to a soft knuckle edge at x≈8.
  const back =
    "M-118 -24C-96 -34 -72 -48 -50 -54C-30 -60 -6 -62 2 -56C8 -52 10 -48 8 -42L8 36C8 44 2 50 -6 48C-40 46 -80 44 -118 40Z";
  return (
    <g>
      <path d="M-132 11L-760 155" stroke={INK} strokeWidth={102} />
      <path d="M-132 11L-760 155" stroke="#2B4757" strokeWidth={96} />
      <path d={back} fill={INK} stroke={INK} strokeWidth={OUTLINE} />
      {fingers.map((segs, i) => (
        <Finger key={i} segs={segs} />
      ))}
      <Finger segs={thumb} />
      <path d={back} fill={SKIN} />
      <g stroke={SHADE} strokeWidth={3} strokeLinecap="round" fill="none">
        <path d="M-96 -14C-70 -28 -40 -40 -12 -46" />
        <path d="M-96 8C-66 -2 -36 -12 -12 -22" />
        <path d="M-6 -52C-1 -48 -1 -42 -6 -38M-6 -28C-1 -24 -1 -18 -6 -14M-6 -4C-1 0 -1 6 -6 10M-6 20C-1 24 -1 30 -6 34" />
      </g>
      {fingers.map((segs, i) => (
        <g key={i}>
          <Creases segs={segs} scale={0.26} />
          <Nail segs={segs} />
        </g>
      ))}
      <Creases segs={thumb} scale={0.26} />
      <Nail segs={thumb} />
      <path d="M-106 5L-140 13" stroke={INK} strokeWidth={98} />
      <path d="M-107 5L-139 13" stroke="#D9F36A" strokeWidth={92} />
    </g>
  );
}
