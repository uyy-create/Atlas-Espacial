import { useSolarStore } from '../store/useSolarStore'

export function BackButton() {
  const unfocus = useSolarStore((s) => s.unfocus)

  return (
    <button
      type="button"
      onClick={unfocus}
      className="group inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 12 6 8l4-4" />
      </svg>
      <span>Volver</span>
    </button>
  )
}
