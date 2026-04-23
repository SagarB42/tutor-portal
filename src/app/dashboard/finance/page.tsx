import { getFinanceSnapshot } from "@/lib/queries/finance";
import { FinanceView, type FinanceSnapshot } from "./_components/finance-view";

export default async function FinancePage() {
  const snap = await getFinanceSnapshot();
  return <FinanceView snap={snap as unknown as FinanceSnapshot} />;
}
