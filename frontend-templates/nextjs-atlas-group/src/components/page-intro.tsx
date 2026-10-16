type PageIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <div className="grid-field border-b border-border">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        {eyebrow ? <p className="coord-label mb-4">{eyebrow}</p> : null}
        <h1 className="font-heading max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="coord-label mb-3">{eyebrow}</p> : null}
        <h2 className="font-heading text-3xl font-semibold md:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-3 max-w-xl text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
