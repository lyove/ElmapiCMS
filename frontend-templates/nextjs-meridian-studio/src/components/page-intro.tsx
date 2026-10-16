type PageIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-16 md:pb-16 md:pt-24">
      {eyebrow ? (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-heading max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
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
        {eyebrow ? (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-heading text-3xl font-semibold md:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-3 max-w-xl text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
