import { redirect } from "next/navigation";
import { getDefaultVersion } from "@/lib/content";

export default async function RootPage() {
  try {
    const version = await getDefaultVersion();
    redirect(`/v/${version.fields.slug}`);
  } catch {
    redirect("/v/1.0");
  }
}
