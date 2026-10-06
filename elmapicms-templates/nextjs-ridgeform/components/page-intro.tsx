import Link from "next/link";
import { cn } from "@/lib/utils";

type PageIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
};

export function PageIntro({
  title,
  description,
  breadcrumbs,
  className,
}: PageIntroProps) {
  const crumbs =
    breadcrumbs ??
    [
      { label: "Home", href: "/" },
      { label: title },
    ];

  return (
    <div className={cn("page-banner", className)}>
      <div className="site-shell relative z-10 py-16 md:py-20">
        <h1 className="font-heading max-w-3xl text-3xl font-extrabold uppercase tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base text-white/75">{description}</p>
        ) : null}
        <nav className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/70">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 ? <span className="text-safety">/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-safety">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-safety">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  light?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  light,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? <span className="section-label">{eyebrow}</span> : null}
      <h2
        className={cn(
          "font-heading mt-4 text-3xl font-extrabold uppercase tracking-tight md:text-4xl",
          light ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            light ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
