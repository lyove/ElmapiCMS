import Image from "next/image";
import Link from "next/link";
import { assetAlt, assetList, firstAsset } from "@/lib/assets";
import type { CaseStudyFields, CaseStudyResult, ContentEntry } from "@/lib/types";
import { RichText } from "@/components/rich-text";

type CaseStudyDetailProps = {
  study: ContentEntry<CaseStudyFields>;
};

function ResultsRow({ results }: { results: CaseStudyResult[] }) {
  const items = results.filter((item) => item.value && item.label);
  if (items.length === 0) return null;

  return (
    <section className="mt-16 border-y border-border/40 bg-card/20">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.value}-${item.label}`}>
            <p className="font-heading text-3xl font-semibold tracking-tight text-primary md:text-4xl">
              {item.value}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NarrativeBlock({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  if (!body?.trim()) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="font-heading mt-2 text-2xl font-semibold md:text-3xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Gallery({
  assets,
  title,
}: {
  assets: ReturnType<typeof assetList>;
  title: string;
}) {
  if (assets.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <p className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">Gallery</p>
      <div className="grid gap-4 md:grid-cols-2">
        {assets.map((asset, index) => (
          <div
            key={asset.uuid}
            className={`relative overflow-hidden rounded-2xl bg-muted ${
              index === 0 && assets.length > 2
                ? "aspect-[16/10] md:col-span-2 md:aspect-[21/9]"
                : "aspect-[16/10]"
            }`}
          >
            <Image
              src={asset.url}
              alt={assetAlt(asset, `${title} gallery ${index + 1}`)}
              fill
              className="object-cover"
              sizes={
                index === 0 && assets.length > 2
                  ? "(max-width: 1200px) 100vw, 1152px"
                  : "(max-width: 768px) 100vw, 50vw"
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function CaseStudyDetail({ study }: CaseStudyDetailProps) {
  const image = firstAsset(study.fields["featured-image"]);
  const gallery = assetList(study.fields.gallery).filter(
    (asset) => asset.uuid !== image?.uuid,
  );
  const services = study.fields.services ?? [];
  const results = study.fields.results ?? [];
  const hasNarrative =
    Boolean(study.fields.challenge?.trim()) ||
    Boolean(study.fields.approach?.trim()) ||
    Boolean(study.fields.outcome?.trim());

  return (
    <article>
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-16 md:pt-24">
        <Link
          href="/work"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← All work
        </Link>
        <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          {study.fields.client ? <span>{study.fields.client}</span> : null}
          {study.fields.industry ? <span>{study.fields.industry}</span> : null}
          {study.fields.year ? <span>{study.fields.year}</span> : null}
        </div>
        <h1 className="font-heading mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
          {study.fields.title}
        </h1>
        {study.fields.excerpt ? (
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{study.fields.excerpt}</p>
        ) : null}
      </div>

      {image ? (
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl md:aspect-[21/9]">
            <Image
              src={image.url}
              alt={assetAlt(image, study.fields.title || "Case study")}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1200px) 100vw, 1152px"
            />
          </div>
        </div>
      ) : null}

      <ResultsRow results={results} />

      {hasNarrative ? (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-3">
            <NarrativeBlock
              eyebrow="01"
              title="Challenge"
              body={study.fields.challenge}
            />
            <NarrativeBlock
              eyebrow="02"
              title="Approach"
              body={study.fields.approach}
            />
            <NarrativeBlock
              eyebrow="03"
              title="Outcome"
              body={study.fields.outcome}
            />
          </div>
        </section>
      ) : null}

      <Gallery assets={gallery} title={study.fields.title || "Case study"} />

      {(study.fields.body || services.length > 0) && (
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 lg:grid-cols-[1fr_280px]">
          <div>
            {study.fields.body ? (
              <>
                <p className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">
                  Deep dive
                </p>
                <RichText value={study.fields.body} className="max-w-none" />
              </>
            ) : null}
          </div>
          {services.length > 0 ? (
            <aside className="h-fit rounded-2xl border border-border/50 bg-card/30 p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Services</p>
              <ul className="mt-4 space-y-2">
                {services.map((service) => (
                  <li key={service.uuid} className="text-sm font-medium">
                    {service.fields.title}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      )}
    </article>
  );
}
