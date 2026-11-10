import { LoanDetail } from "@/components/borrowing/loan-detail";
import type { Id } from "@/convex/_generated/dataModel";

export default async function LoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LoanDetail loanId={id as Id<"loans">} />;
}
