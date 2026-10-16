import { PageIntro } from "@/components/page-intro";
import { TeamGrid } from "@/components/team-insights";
import { getSiteSettings, getTeamMembers } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Team",
    description: "Meet the strategists, designers, and engineers behind the studio.",
    path: "/team",
  });
}

export default async function TeamPage() {
  const members = await getTeamMembers();

  return (
    <>
      <PageIntro
        eyebrow="People"
        title="Small team, senior craft"
        description="We stay deliberately lean — every project is led by partners who stay close to the work."
      />
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <TeamGrid members={members} />
      </div>
    </>
  );
}
