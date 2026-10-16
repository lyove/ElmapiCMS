import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: 0 | 1 | 2;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <div
      className={cn(
        "animate-rise",
        delay === 1 && "animate-rise-delay-1",
        delay === 2 && "animate-rise-delay-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
