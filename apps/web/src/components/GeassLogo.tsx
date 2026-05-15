"use client";

export function GeassLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="gl" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b1"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="4"  result="b2"/>
          <feMerge><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#gl)">
        <path d="M150,268 L120,222 L84,200 L84,170 L112,146 C88,116 52,76 16,36 C8,26 10,44 18,54 C42,84 72,118 96,142 L110,154 L126,182 L144,224 Z" fill="#dd1111"/>
        <path d="M150,268 L180,222 L216,200 L216,170 L188,146 C212,116 248,76 284,36 C292,26 290,44 282,54 C258,84 228,118 204,142 L190,154 L174,182 L156,224 Z" fill="#dd1111"/>
      </g>
      <path d="M150,268 L120,222 L84,200 L84,170 L112,146 C88,116 52,76 16,36 C8,26 10,44 18,54 C42,84 72,118 96,142 L110,154 L126,182 L144,224 Z" fill="#ee2222"/>
      <path d="M150,268 L180,222 L216,200 L216,170 L188,146 C212,116 248,76 284,36 C292,26 290,44 282,54 C258,84 228,118 204,142 L190,154 L174,182 L156,224 Z" fill="#ee2222"/>
    </svg>
  );
}
