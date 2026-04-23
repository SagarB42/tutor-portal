"use client";

import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Pencil,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { CsvDownloadButton } from "@/components/shared/csv-download-button";
import { LogExpenseDialog } from "@/components/finance/log-expense-dialog";
import { LogPaymentDialog } from "@/components/finance/log-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteExpense, deletePayment } from "@/lib/actions/finance";
import { exportFinanceCsv } from "@/lib/actions/exports";
import { formatCurrency, getSessionHours } from "@/lib/utils";

const methodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  payid: "PayID",
  card: "Card",
  other: "Other",
};

const categoryLabels: Record<string, string> = {
  materials: "Materials",
  software: "Software",
  rent: "Rent",
  travel: "Travel",
  tutor_pay: "Tutor Pay",
  other: "Other",
};

type PaymentRow = {
  id: string;
  student_id: string | null;
  amount: number;
  payment_date: string;
  method: string;
  description: string | null;
  students?: { full_name: string } | null;
};

type ExpenseRow = {
  id: string;
  amount: number;
  expense_date: string;
  category: string;
  description: string | null;
};

type SessionStudentSnap = {
  student_id: string;
  rate: number;
  sessions: {
    start_time: string;
    end_time: string;
    status: string;
  } | null;
};

type SessionSnap = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  tutor_pay_rate: number | null;
  tutor_id: string | null;
};

type MiniRef = { id: string; full_name: string };

export type FinanceSnapshot = {
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  sessionStudents: SessionStudentSnap[];
  sessions: SessionSnap[];
  students: MiniRef[];
  tutors: MiniRef[];
};

export function FinanceView({ snap }: { snap: FinanceSnapshot }) {
  const { payments, expenses, sessionStudents, sessions, students, tutors } =
    snap;

  const [accountSearch, setAccountSearch] = useState("");
  const [tutorAccountSearch, setTutorAccountSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");

  const {
    studentAccounts,
    tutorAccounts,
    totalBilled,
    totalTutorPay,
  } = useMemo(() => {
    const billedMap: Record<string, { billed: number; sessions: number }> = {};
    const paidMap: Record<string, number> = {};

    for (const ss of sessionStudents) {
      if (
        !ss.sessions ||
        !["completed", "cancelled_billable"].includes(ss.sessions.status)
      )
        continue;
      const hours = getSessionHours(ss.sessions.start_time, ss.sessions.end_time);
      const charge = Number(ss.rate) * hours;
      if (!billedMap[ss.student_id])
        billedMap[ss.student_id] = { billed: 0, sessions: 0 };
      billedMap[ss.student_id].billed += charge;
      billedMap[ss.student_id].sessions += 1;
    }

    for (const p of payments) {
      if (p.student_id) {
        paidMap[p.student_id] = (paidMap[p.student_id] ?? 0) + Number(p.amount);
      }
    }

    const studentMap = new Map(students.map((s) => [s.id, s.full_name]));
    const ids = new Set([...Object.keys(billedMap), ...Object.keys(paidMap)]);
    const studentAccounts = Array.from(ids)
      .map((id) => ({
        id,
        name: studentMap.get(id) ?? "Unknown",
        billed: billedMap[id]?.billed ?? 0,
        paid: paidMap[id] ?? 0,
        balance: (billedMap[id]?.billed ?? 0) - (paidMap[id] ?? 0),
        sessions: billedMap[id]?.sessions ?? 0,
      }))
      .sort((a, b) => b.balance - a.balance);

    const totalBilled = Object.values(billedMap).reduce(
      (sum, v) => sum + v.billed,
      0,
    );

    let totalTutorPay = 0;
    const tutorPayMap: Record<
      string,
      { owed: number; sessions: number; hours: number }
    > = {};
    for (const s of sessions) {
      if (
        ["completed", "cancelled_billable"].includes(s.status) &&
        s.tutor_pay_rate
      ) {
        const hours = getSessionHours(s.start_time, s.end_time);
        const pay = Number(s.tutor_pay_rate) * hours;
        totalTutorPay += pay;
        if (s.tutor_id) {
          if (!tutorPayMap[s.tutor_id])
            tutorPayMap[s.tutor_id] = { owed: 0, sessions: 0, hours: 0 };
          tutorPayMap[s.tutor_id].owed += pay;
          tutorPayMap[s.tutor_id].sessions += 1;
          tutorPayMap[s.tutor_id].hours += hours;
        }
      }
    }
    const tutorNameMap = new Map(tutors.map((t) => [t.id, t.full_name]));
    const tutorAccounts = Object.entries(tutorPayMap)
      .map(([id, data]) => ({
        id,
        name: tutorNameMap.get(id) ?? "Unknown",
        owed: data.owed,
        sessions: data.sessions,
        hours: data.hours,
      }))
      .sort((a, b) => b.owed - a.owed);

    return { studentAccounts, tutorAccounts, totalBilled, totalTutorPay };
  }, [payments, sessionStudents, sessions, students, tutors]);

  const totalPaymentsReceived = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const outstanding = totalBilled - totalPaymentsReceived;
  const netProfit = totalPaymentsReceived - totalExpenses;

  const statCards = [
    {
      title: "Total Billed",
      value: formatCurrency(totalBilled),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Payments Received",
      value: formatCurrency(totalPaymentsReceived),
      icon: ArrowUpRight,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Outstanding",
      value: formatCurrency(outstanding),
      icon: Wallet,
      color: outstanding > 0 ? "text-amber-600" : "text-green-600",
      bg: outstanding > 0 ? "bg-amber-50" : "bg-green-50",
    },
    {
      title: "Tutor Pay (Owed)",
      value: formatCurrency(totalTutorPay),
      icon: ArrowDownRight,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Net Profit",
      value: formatCurrency(netProfit),
      icon: TrendingUp,
      color: netProfit >= 0 ? "text-green-600" : "text-red-600",
      bg: netProfit >= 0 ? "bg-green-50" : "bg-red-50",
    },
  ];

  const dialogStudents = students.map((s) => ({
    id: s.id,
    full_name: s.full_name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Finance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Income, expenses, and student accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <CsvDownloadButton action={exportFinanceCsv} label="Export CSV" />
          <LogPaymentDialog students={dialogStudents} />
          <LogExpenseDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                {c.title}
              </CardTitle>
              <div className={`rounded-lg p-1.5 ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold sm:text-2xl">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="accounts" className="flex-1 sm:flex-none">
            Student Accounts
          </TabsTrigger>
          <TabsTrigger value="tutor-accounts" className="flex-1 sm:flex-none">
            Tutor Accounts
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 sm:flex-none">
            Payments
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 sm:flex-none">
            Expenses
          </TabsTrigger>
        </TabsList>

        {/* Student accounts */}
        <TabsContent value="accounts">
          <Card>
            <CardContent className="p-0">
              {studentAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No billing data yet. Log sessions to see student accounts.
                </div>
              ) : (
                <>
                  <div className="border-b p-4">
                    <SearchInput
                      value={accountSearch}
                      onChange={setAccountSearch}
                      placeholder="Search students..."
                    />
                  </div>
                  <div className="divide-y md:hidden">
                    {studentAccounts
                      .filter((a) =>
                        a.name.toLowerCase().includes(accountSearch.toLowerCase()),
                      )
                      .map((a) => (
                        <div key={a.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{a.name}</p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {a.sessions} sessions
                              </p>
                            </div>
                            <p
                              className={`font-bold ${a.balance > 0 ? "text-amber-600" : "text-green-600"}`}
                            >
                              {a.balance > 0
                                ? `${formatCurrency(a.balance)} owed`
                                : "Paid"}
                            </p>
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                            <span>Billed: {formatCurrency(a.billed)}</span>
                            <span>Paid: {formatCurrency(a.paid)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Billed</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentAccounts
                          .filter((a) =>
                            a.name
                              .toLowerCase()
                              .includes(accountSearch.toLowerCase()),
                          )
                          .map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">
                                {a.name}
                              </TableCell>
                              <TableCell className="text-right">
                                {a.sessions}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(a.billed)}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(a.paid)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    a.balance > 0
                                      ? "font-semibold text-amber-600"
                                      : "text-green-600"
                                  }
                                >
                                  {formatCurrency(a.balance)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tutor accounts */}
        <TabsContent value="tutor-accounts">
          <Card>
            <CardContent className="p-0">
              {tutorAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No tutor pay data yet.
                </div>
              ) : (
                <>
                  <div className="border-b p-4">
                    <SearchInput
                      value={tutorAccountSearch}
                      onChange={setTutorAccountSearch}
                      placeholder="Search tutors..."
                    />
                  </div>
                  <div className="divide-y md:hidden">
                    {tutorAccounts
                      .filter((a) =>
                        a.name
                          .toLowerCase()
                          .includes(tutorAccountSearch.toLowerCase()),
                      )
                      .map((a) => (
                        <div key={a.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{a.name}</p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {a.sessions} sessions · {a.hours.toFixed(1)} hrs
                              </p>
                            </div>
                            <p className="font-bold text-violet-600">
                              {formatCurrency(a.owed)} owed
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tutor</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Pay Owed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tutorAccounts
                          .filter((a) =>
                            a.name
                              .toLowerCase()
                              .includes(tutorAccountSearch.toLowerCase()),
                          )
                          .map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">
                                {a.name}
                              </TableCell>
                              <TableCell className="text-right">
                                {a.sessions}
                              </TableCell>
                              <TableCell className="text-right">
                                {a.hours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-violet-600">
                                {formatCurrency(a.owed)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                <>
                  <div className="border-b p-4">
                    <SearchInput
                      value={paymentSearch}
                      onChange={setPaymentSearch}
                      placeholder="Search payments..."
                    />
                  </div>
                  <div className="divide-y md:hidden">
                    {payments
                      .filter((p) => {
                        const q = paymentSearch.toLowerCase();
                        return (
                          (p.students?.full_name ?? "")
                            .toLowerCase()
                            .includes(q) ||
                          (p.description ?? "").toLowerCase().includes(q) ||
                          (methodLabels[p.method] ?? "")
                            .toLowerCase()
                            .includes(q)
                        );
                      })
                      .map((p) => (
                        <div key={p.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(p.amount)}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {methodLabels[p.method] ?? p.method}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {p.students?.full_name ?? "No student"} ·{" "}
                                {format(
                                  new Date(p.payment_date),
                                  "MMM d, yyyy",
                                )}
                              </p>
                              {p.description && (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {p.description}
                                </p>
                              )}
                            </div>
                            <PaymentRowActions
                              row={p}
                              dialogStudents={dialogStudents}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[100px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments
                          .filter((p) => {
                            const q = paymentSearch.toLowerCase();
                            return (
                              (p.students?.full_name ?? "")
                                .toLowerCase()
                                .includes(q) ||
                              (p.description ?? "").toLowerCase().includes(q) ||
                              (methodLabels[p.method] ?? "")
                                .toLowerCase()
                                .includes(q)
                            );
                          })
                          .map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">
                                {format(
                                  new Date(p.payment_date),
                                  "MMM d, yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                {p.students?.full_name ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {methodLabels[p.method] ?? p.method}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                {p.description ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCurrency(p.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <PaymentRowActions
                                    row={p}
                                    dialogStudents={dialogStudents}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses">
          <Card>
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No expenses recorded yet.
                </div>
              ) : (
                <>
                  <div className="border-b p-4">
                    <SearchInput
                      value={expenseSearch}
                      onChange={setExpenseSearch}
                      placeholder="Search expenses..."
                    />
                  </div>
                  <div className="divide-y md:hidden">
                    {expenses
                      .filter((ex) => {
                        const q = expenseSearch.toLowerCase();
                        return (
                          (ex.description ?? "").toLowerCase().includes(q) ||
                          (categoryLabels[ex.category] ?? "")
                            .toLowerCase()
                            .includes(q)
                        );
                      })
                      .map((ex) => (
                        <div key={ex.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-red-600">
                                  {formatCurrency(ex.amount)}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {categoryLabels[ex.category] ?? ex.category}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {format(
                                  new Date(ex.expense_date),
                                  "MMM d, yyyy",
                                )}
                              </p>
                              {ex.description && (
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {ex.description}
                                </p>
                              )}
                            </div>
                            <ExpenseRowActions row={ex} />
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[100px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses
                          .filter((ex) => {
                            const q = expenseSearch.toLowerCase();
                            return (
                              (ex.description ?? "")
                                .toLowerCase()
                                .includes(q) ||
                              (categoryLabels[ex.category] ?? "")
                                .toLowerCase()
                                .includes(q)
                            );
                          })
                          .map((ex) => (
                            <TableRow key={ex.id}>
                              <TableCell className="font-medium">
                                {format(
                                  new Date(ex.expense_date),
                                  "MMM d, yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {categoryLabels[ex.category] ?? ex.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                {ex.description ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {formatCurrency(ex.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <ExpenseRowActions row={ex} />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

function PaymentRowActions({
  row,
  dialogStudents,
}: {
  row: PaymentRow;
  dialogStudents: { id: string; full_name: string }[];
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <LogPaymentDialog
        students={dialogStudents}
        initialData={row as unknown as Parameters<typeof LogPaymentDialog>[0]["initialData"]}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <ActionButton
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        action={() => deletePayment(row.id)}
        confirm="Delete this payment?"
        successMessage="Payment deleted"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ActionButton>
    </div>
  );
}

function ExpenseRowActions({ row }: { row: ExpenseRow }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <LogExpenseDialog
        initialData={row as unknown as Parameters<typeof LogExpenseDialog>[0]["initialData"]}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <ActionButton
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        action={() => deleteExpense(row.id)}
        confirm="Delete this expense?"
        successMessage="Expense deleted"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ActionButton>
    </div>
  );
}
