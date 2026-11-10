import { ToolDetail } from "@/components/marketplace/tool-detail";
import type { Id } from "@/convex/_generated/dataModel";
export default async function ToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ToolDetail toolId={id as Id<"tools">} />;
}
