export function FloralLeaf({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M60 10C60 10 20 60 20 120C20 160 40 190 60 190C80 190 100 160 100 120C100 60 60 10 60 10Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M60 30V180"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.45"
      />
      <path
        d="M60 60C45 70 30 90 28 110"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M60 80C75 90 90 105 92 120"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M60 110C42 120 32 140 30 155"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
    </svg>
  );
}

export function FloralPetal({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Centre */}
      <circle cx="100" cy="100" r="14" fill="currentColor" opacity="0.4" />
      {/* Petals */}
      <ellipse cx="100" cy="52" rx="20" ry="38" fill="currentColor" opacity="0.25" />
      <ellipse cx="100" cy="148" rx="20" ry="38" fill="currentColor" opacity="0.25" />
      <ellipse cx="52" cy="100" rx="38" ry="20" fill="currentColor" opacity="0.25" />
      <ellipse cx="148" cy="100" rx="38" ry="20" fill="currentColor" opacity="0.25" />
      <ellipse
        cx="66"
        cy="66"
        rx="20"
        ry="38"
        fill="currentColor"
        opacity="0.2"
        transform="rotate(-45 66 66)"
      />
      <ellipse
        cx="134"
        cy="66"
        rx="20"
        ry="38"
        fill="currentColor"
        opacity="0.2"
        transform="rotate(45 134 66)"
      />
      <ellipse
        cx="66"
        cy="134"
        rx="20"
        ry="38"
        fill="currentColor"
        opacity="0.2"
        transform="rotate(45 66 134)"
      />
      <ellipse
        cx="134"
        cy="134"
        rx="20"
        ry="38"
        fill="currentColor"
        opacity="0.2"
        transform="rotate(-45 134 134)"
      />
    </svg>
  );
}

export function FloralBranch({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main stem */}
      <path
        d="M150 20C150 20 140 100 145 200C148 260 155 340 160 380"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.3"
      />
      {/* Left leaves */}
      <path
        d="M145 80C145 80 100 60 80 80C60 100 90 110 145 100"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M146 160C146 160 95 130 70 155C45 180 85 195 146 175"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M150 260C150 260 100 235 78 258C56 281 95 295 150 275"
        fill="currentColor"
        opacity="0.25"
      />
      {/* Right leaves */}
      <path
        d="M148 120C148 120 195 95 215 118C235 141 200 150 148 138"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M150 210C150 210 200 185 222 208C244 231 205 245 150 225"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M155 310C155 310 205 290 222 310C239 330 205 342 155 325"
        fill="currentColor"
        opacity="0.25"
      />
      {/* Small buds */}
      <circle cx="80" cy="78" r="6" fill="currentColor" opacity="0.35" />
      <circle cx="215" cy="116" r="6" fill="currentColor" opacity="0.35" />
      <circle cx="70" cy="153" r="7" fill="currentColor" opacity="0.35" />
      <circle cx="222" cy="206" r="6" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function FloralRose({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer petals */}
      <path
        d="M80 15C80 15 35 28 25 62C15 96 50 108 80 85C110 108 145 96 135 62C125 28 80 15 80 15Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M80 145C80 145 35 132 25 98C15 64 50 52 80 75C110 52 145 64 135 98C125 132 80 145 80 145Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M15 80C15 80 28 35 62 25C96 15 108 50 85 80C108 110 96 145 62 135C28 125 15 80 15 80Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M145 80C145 80 132 35 98 25C64 15 52 50 75 80C52 110 64 145 98 135C132 125 145 80 145 80Z"
        fill="currentColor"
        opacity="0.18"
      />
      {/* Inner spiral */}
      <path
        d="M80 50C80 50 60 58 56 72C52 86 66 92 80 82C94 92 108 86 104 72C100 58 80 50 80 50Z"
        fill="currentColor"
        opacity="0.28"
      />
      <circle cx="80" cy="80" r="10" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function FloralDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Centre flower */}
      <circle cx="200" cy="20" r="7" fill="currentColor" opacity="0.4" />
      <ellipse cx="200" cy="6" rx="6" ry="12" fill="currentColor" opacity="0.25" />
      <ellipse cx="200" cy="34" rx="6" ry="12" fill="currentColor" opacity="0.25" />
      <ellipse cx="186" cy="20" rx="12" ry="6" fill="currentColor" opacity="0.25" />
      <ellipse cx="214" cy="20" rx="12" ry="6" fill="currentColor" opacity="0.25" />
      {/* Lines out */}
      <line x1="232" y1="20" x2="390" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="10" y1="20" x2="168" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      {/* Small leaves on lines */}
      <ellipse cx="280" cy="20" rx="10" ry="5" fill="currentColor" opacity="0.2" transform="rotate(-20 280 20)" />
      <ellipse cx="345" cy="20" rx="8" ry="4" fill="currentColor" opacity="0.2" transform="rotate(15 345 20)" />
      <ellipse cx="120" cy="20" rx="10" ry="5" fill="currentColor" opacity="0.2" transform="rotate(20 120 20)" />
      <ellipse cx="55" cy="20" rx="8" ry="4" fill="currentColor" opacity="0.2" transform="rotate(-15 55 20)" />
    </svg>
  );
}
