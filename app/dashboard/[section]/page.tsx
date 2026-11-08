import { notFound } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";

const sections = ["listings", "requests", "incoming", "profile"] as const;
export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return <DashboardView section={section as (typeof sections)[number]} />;
}
