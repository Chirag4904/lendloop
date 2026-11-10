import { ListingForm } from "@/components/listings/listing-form";
import type { Id } from "@/convex/_generated/dataModel";
export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingForm toolId={id as Id<"tools">} />;
}
