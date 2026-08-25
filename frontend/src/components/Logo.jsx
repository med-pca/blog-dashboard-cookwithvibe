export default function Logo({ textWhite = false, className = 'h-20 w-auto' }) {
  // Over the dark hero (transparent navbar) the pan and wordmark go white and
  // the steam drops to blush, which is the one accent that still reads on both
  // the cream page and a dark photo.
  const pan = textWhite ? '#ffffff' : '#b33b62'
  const steam = textWhite ? '#f5a3b8' : '#c2683f'
  const wordA = textWhite ? '#ffffff' : '#b33b62'
  const wordB = textWhite ? '#ffffff' : '#241a18'

  return (
    <svg
      viewBox="0 0 600 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CookWithVibe"
    >
      {/* Mark — kept identical to public/food/logo-mark.svg (viewBox 18 14 220
          220), scaled to 140px and translated to cancel that viewBox origin. */}
      <g transform="translate(-3.45 21.09) scale(0.63636)">
        {/* Steam as three waveform ribbons: the "vibe" half of the name. */}
        <g stroke={steam} strokeWidth="11" strokeLinecap="round" fill="none">
          <path d="M66 130 Q82 116 66 102 Q50 88 66 74" />
          <path d="M102 138 Q118 122 102 106 Q86 90 102 74 Q118 58 102 42" />
          <path d="M138 130 Q154 116 138 102 Q122 88 138 74" />
        </g>
        {/* Skillet. Explicit cubics rather than an elliptical arc — a chord of
            exactly 2·rx is A's degenerate case and renderers disagree on it. */}
        <path
          d="M30 150 H178 V160 C176 196 146 212 104 212 C62 212 32 196 30 160 Z"
          fill={pan}
        />
        <path
          d="M180 154 L218 140"
          stroke={pan}
          strokeWidth="17"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {/* Wordmark. The camel-case seams are carried by colour, not spacing, so
          the three words stay legible while the name remains one token. */}
      <text
        x="170"
        y="128"
        fontFamily="'Instrument Serif', Georgia, 'Times New Roman', serif"
        fontSize="62"
        letterSpacing="0.5"
      >
        <tspan fill={wordA}>Cook</tspan>
        <tspan fill={wordB}>With</tspan>
        <tspan fill={wordA}>Vibe</tspan>
      </text>
    </svg>
  )
}
