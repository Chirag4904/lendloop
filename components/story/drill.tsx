/** Original layered SVG artwork; no listing photograph or private data. */
export function DrillArtwork() {
  return (
    <svg
      viewBox="0 0 520 430"
      fill="none"
      role="img"
      aria-label="A lime and graphite cordless drill"
    >
      <defs>
        <linearGradient
          id="drill-shell"
          x1="150"
          y1="95"
          x2="300"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDFF9C" />
          <stop offset=".5" stopColor="#D9F36A" />
          <stop offset="1" stopColor="#96AC3D" />
        </linearGradient>
        <linearGradient
          id="drill-metal"
          x1="340"
          y1="120"
          x2="340"
          y2="195"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E0E5E1" />
          <stop offset=".45" stopColor="#84928E" />
          <stop offset=".6" stopColor="#D4DBD5" />
          <stop offset="1" stopColor="#596965" />
        </linearGradient>
        <linearGradient
          id="drill-grip"
          x1="210"
          y1="180"
          x2="290"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#344A4B" />
          <stop offset="1" stopColor="#101F27" />
        </linearGradient>
      </defs>
      <ellipse
        cx="261"
        cy="378"
        rx="142"
        ry="13"
        fill="#07161F"
        opacity=".25"
      />
      <g transform="rotate(-16 260 215)">
        <path
          d="M203 187H277L265 246L286 320L217 333L194 262Z"
          fill="url(#drill-grip)"
          stroke="#0C1D26"
          strokeWidth="3"
        />
        <path
          d="M210 204L223 250L214 271L228 310"
          stroke="#64736C"
          strokeWidth="4"
        />
        <path d="M270 203H292Q301 213 290 231H266" fill="#0C1D26" />
        <path
          d="M209 314L284 310L309 333L302 363H180L178 337Z"
          fill="#263B40"
          stroke="#0C1D26"
          strokeWidth="3"
        />
        <path d="M182 337H304L300 353H184Z" fill="#D9F36A" />
        <path d="M199 359H286" stroke="#64736C" strokeWidth="3" />
        <path
          d="M137 113Q139 89 170 88L293 102L321 125V184L286 207L161 194Q135 188 134 165Z"
          fill="url(#drill-shell)"
          stroke="#A9BF54"
          strokeWidth="2"
        />
        <path d="M144 110L164 99L283 112" stroke="#F5FFCE" strokeWidth="3" />
        <path d="M144 117L157 113V176L143 171Z" fill="#263B40" />
        <path
          d="M171 122L202 125M169 133L200 136M169 144L199 147M170 155L199 158"
          stroke="#526137"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M212 174L271 180" stroke="#99AD4A" strokeWidth="3" />
        <rect x="221" y="128" width="57" height="27" rx="5" fill="#152D3B" />
        <path
          d="M232 141H244M250 141H267"
          stroke="#D9F36A"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M297 110L328 119V187L298 200Z" fill="#263B40" />
        <path d="M309 120V189M318 124V185" stroke="#586A68" strokeWidth="3" />
        <path d="M329 126L366 132V176L329 184Z" fill="url(#drill-metal)" />
        <path d="M341 132V177M351 134V176" stroke="#526561" strokeWidth="3" />
        <path d="M365 139L385 143V166L365 172Z" fill="#263B40" />
        <path d="M385 150H445L455 154L445 158H385Z" fill="url(#drill-metal)" />
        <circle cx="156" cy="182" r="3" fill="#526137" />
      </g>
    </svg>
  );
}
