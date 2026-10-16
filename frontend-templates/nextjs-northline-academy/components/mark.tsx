import { cn } from "@/lib/utils";

export function NorthlineMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-xl bg-ink text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <svg viewBox="0 0 28 28" className="size-5" fill="none">
        <path
          d="M5 21 14 6l9 15"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 17h10"
          stroke="#E4572E"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
