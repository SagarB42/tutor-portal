import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraftEmailButton } from "@/components/emails/draft-email-button";
import { formatCurrency } from "@/lib/utils";
import type { StudentBalanceRow } from "@/lib/db-types";

export function StudentBalanceCard({
  balance,
  studentId,
}: {
  balance: StudentBalanceRow | null;
  studentId?: string;
}) {
  const paid = Number(balance?.total_paid ?? 0);
  const billed = Number(balance?.total_billed ?? 0);
  const net = Number(balance?.balance ?? 0);
  const prepaid = Number(balance?.prepaid_sessions_remaining ?? 0);
  const netLabel =
    net > 0 ? "Credit (prepaid)" : net < 0 ? "Outstanding" : "Settled";
  const netColor =
    net > 0
      ? "text-emerald-600"
      : net < 0
        ? "text-rose-600"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Account balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total paid" value={formatCurrency(paid)} />
          <Stat label="Total billed" value={formatCurrency(billed)} />
          <Stat
            label={netLabel}
            value={formatCurrency(Math.abs(net))}
            valueClassName={netColor}
          />
          <Stat
            label="Prepaid sessions"
            value={`${prepaid} session${prepaid === 1 ? "" : "s"}`}
          />
        </div>
        {studentId && prepaid <= 2 && (
          <div className="mt-3 flex justify-end">
            <DraftEmailButton
              contextType="prepaid_topup"
              studentId={studentId}
              label="Email top-up request"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-semibold ${valueClassName ?? ""}`.trim()}
      >
        {value}
      </div>
    </div>
  );
}
