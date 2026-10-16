import type { Metadata } from "next";
import { ProjectsGrid } from "@/components/projects-grid";
import { getProjects, getSiteSettings } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildMetadata({
    settings,
    title: "Projects",
    description:
      "Selected Ridgeform residential and light commercial construction projects.",
    path: "/projects",
  });
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsGrid projects={projects} />;
}
