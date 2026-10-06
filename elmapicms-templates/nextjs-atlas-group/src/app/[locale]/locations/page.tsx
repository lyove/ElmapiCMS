import type { Metadata } from "next";
import { LocationCard } from "@/components/location-card";
import { PageIntro } from "@/components/page-intro";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getLocations, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type LocationsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocationsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const settings = await getSiteSettings(locale);

  return buildMetadata({
    settings,
    locale,
    title: dictionary.locations.pageHeading,
    description: dictionary.locations.pageIntro,
    path: "/locations",
  });
}

export default async function LocationsPage({ params }: LocationsPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dictionary = getDictionary(locale);
  const locations = await getLocations(locale);

  return (
    <>
      <PageIntro
        eyebrow={dictionary.locations.pageEyebrow}
        title={dictionary.locations.pageHeading}
        description={dictionary.locations.pageIntro}
      />
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {locations.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {locations.map((location, index) => (
              <LocationCard
                key={location.uuid}
                location={location}
                locale={locale}
                headquartersLabel={dictionary.locations.headquartersLabel}
                delayMs={index * 60}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{dictionary.locations.emptyState}</p>
        )}
      </div>
    </>
  );
}
