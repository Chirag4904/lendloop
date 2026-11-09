import { notFound } from "next/navigation";
import { Admin } from "@/components/admin";
const sections = [
  "users",
  "listings",
  "loans",
  "societies",
  "society-suggestions",
  "audit",
  "automation",
] as const;
export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  return <Admin section={section as (typeof sections)[number]} />;
}
