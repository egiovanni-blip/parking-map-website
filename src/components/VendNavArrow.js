/** Vend iconography: 24×24, 2px stroke (branding guidelines) */
export default function VendNavArrow({ direction = 'right', className = 'h-4 w-4 shrink-0' }) {
  if (direction === 'left') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l7 7-7 7" />
    </svg>
  )
}
