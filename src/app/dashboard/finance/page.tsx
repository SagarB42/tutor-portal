"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { LogPaymentDialog } from "@/components/finance/log-payment-dialog";
import { LogExpenseDialog } from "@/components/finance/log-expense-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, DollarSign, TrendingUp, TrendingDown, Wallet,
  ArrowUpRight, ArrowDownRight, Pencil, Trash2, Search,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, getSessionHours } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const methodLabels: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", payid: "PayID", card: "Card", other: "Other",
};

const categoryLabels: Record<string, string> = {
  materials: "Materials", software: "Software", rent: "Rent",
  travel: "Travel", tutor_pay: "Tutor Pay", other: "Other",
};

type StudentAccount = {
  id: string;
  name: string;
  billed: number;
  paid: number;
  balance: number;
  sessions: number;
};

type TutorAccount = {
  id: string;
  name: string;
  owed: number;
  sessions: number;
  hours: number;
};

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);
  const [tutorAccounts, setTutorAccounts] = useState<TutorAccount[]>([]);
  const [totalBilled, setTotalBilled] = useState(0);
  const [totalTutorPay, setTotalTutorPay] = useState(0);
  const [accountSearch, setAccountSearch] = useState("");
  const [tutorAccountSearch, setTutorAccountSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");

  const supabase = createClient();

  async function fetchData() {
    const [paymentsRes, expensesRes, sessionStudentsRes, sessionsRes, studentsRes, tutorsRes] = await Promise.all([
      supabase.from("payments").select("*, students(full_name)").order("payment_date", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("session_students").select("student_id, rate, sessions(start_time, end_time, status)"),
      supabase.from("sessions").select("id, start_time, end_time, status, tutor_pay_rate, tutor_id"),
      supabase.from("students").select("id, full_name"),
      supabase.from("tutors").select("id, full_name"),
    ]);

    setPayments(paymentsRes.data || []);
    setExpenses(expensesRes.data || []);

    // Calculate student account summaries
    const billedMap: Record<string, { billed: number; sessions: number }> = {};
    const paidMap: Record<string, number> = {};

    (sessionStudentsRes.data || []).forEach((ss: any) => {
      if (!ss.sessions || !["completed", "cancelled_billable"].includes(ss.sessions.status)) return;
      const hours = getSessionHours(ss.sessions.start_time, ss.sessions.end_time);
      const charge = Number(ss.rate) * hours;
      if (!billedMap[ss.student_id]) billedMap[ss.student_id] = { billed: 0, sessions: 0 };
      billedMap[ss.student_id].billed += charge;
      billedMap[ss.student_id].sessions += 1;
    });

    (paymentsRes.data || []).forEach((p: any) => {
      if (p.student_id) {
        paidMap[p.student_id] = (paidMap[p.student_id] || 0) + Number(p.amount);
      }
    });

    const studentMap = new Map((studentsRes.data || []).map((s: any) => [s.id, s.full_name]));
    const allStudentIds = new Set([...Object.keys(billedMap), ...Object.keys(paidMap)]);
    const accounts: StudentAccount[] = Array.from(allStudentIds).map((id) => ({
      id,
      name: studentMap.get(id) || "Unknown",
      billed: billedMap[id]?.billed || 0,
      paid: paidMap[id] || 0,
      balance: (billedMap[id]?.billed || 0) - (paidMap[id] || 0),
      sessions: billedMap[id]?.sessions || 0,
    })).sort((a, b) => b.balance - a.balance);

    setStudentAccounts(accounts);

    // Total billed
    const billed = Object.values(billedMap).reduce((sum, v) => sum + v.billed, 0);
    setTotalBilled(billed);

    // Tutor pay & tutor accounts
    let tutorPay = 0;
    const tutorPayMap: Record<string, { owed: number; sessions: number; hours: number }> = {};
    (sessionsRes.data || []).forEach((s: any) => {
      if (["completed", "cancelled_billable"].includes(s.status) && s.tutor_pay_rate) {
        const hours = getSessionHours(s.start_time, s.end_time);
        const pay = Number(s.tutor_pay_rate) * hours;
        tutorPay += pay;
        if (s.tutor_id) {
          if (!tutorPayMap[s.tutor_id]) tutorPayMap[s.tutor_id] = { owed: 0, sessions: 0, hours: 0 };
          tutorPayMap[s.tutor_id].owed += pay;
          tutorPayMap[s.tutor_id].sessions += 1;
          tutorPayMap[s.tutor_id].hours += hours;
        }
      }
    });
    setTotalTutorPay(tutorPay);

    const tutorNameMap = new Map((tutorsRes.data || []).map((t: any) => [t.id, t.full_name]));
    const tAccounts: TutorAccount[] = Object.entries(tutorPayMap).map(([id, data]) => ({
      id,
      name: tutorNameMap.get(id) || "Unknown",
      owed: data.owed,
      sessions: data.sessions,
      hours: data.hours,
    })).sort((a, b) => b.owed - a.owed);
    setTutorAccounts(tAccounts);

    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const handleDeletePayment = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchData();
  };

  const handleDeleteExpense = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading finance data...
      </div>
    );
  }

  const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const outstanding = totalBilled - totalPaymentsReceived;
  const netProfit = totalPaymentsReceived - totalExpenses;

  const statCards = [
    { title: "Total Billed", value: formatCurrency(totalBilled), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Payments Received", value: formatCurrency(totalPaymentsReceived), icon: ArrowUpRight, color: "text-green-600", bg: "bg-green-50" },
    { title: "Outstanding", value: formatCurrency(outstanding), icon: Wallet, color: outstanding > 0 ? "text-amber-600" : "text-green-600", bg: outstanding > 0 ? "bg-amber-50" : "bg-green-50" },
    { title: "Tutor Pay (Owed)", value: formatCurrency(totalTutorPay), icon: ArrowDownRight, color: "text-violet-600", bg: "bg-violet-50" },
    { title: "Total Expenses", value: formatCurrency(totalExpenses), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { title: "Net Profit", value: formatCurrency(netProfit), icon: TrendingUp, color: netProfit >= 0 ? "text-green-600" : "text-red-600", bg: netProfit >= 0 ? "bg-green-50" : "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance</h2>
          <p className="text-muted-foreground mt-1 text-sm">Income, expenses, and student accounts.</p>
        </div>
        <div className="flex gap-2">
          <LogPaymentDialog onSuccess={fetchData} />
          <LogExpenseDialog onSuccess={fetchData} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {statCards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <div className={`p-1.5 rounded-lg ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="accounts" className="flex-1 sm:flex-none">Student Accounts</TabsTrigger>
          <TabsTrigger value="tutor-accounts" className="flex-1 sm:flex-none">Tutor Accounts</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payments</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 sm:flex-none">Expenses</TabsTrigger>
        </TabsList>

        {/* Student Accounts */}
        <TabsContent value="accounts">
          <Card>
            <CardContent className="p-0">
              {studentAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No billing data yet. Log sessions to see student accounts.</div>
              ) : (
                <>
                  <div className="p-4 border-b">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search students..." value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden divide-y">
                    {studentAccounts.filter((a) => a.name.toLowerCase().includes(accountSearch.toLowerCase())).map((a) => (
                      <div key={a.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{a.name}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{a.sessions} sessions</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${a.balance > 0 ? "text-amber-600" : "text-green-600"}`}>
                              {a.balance > 0 ? `${formatCurrency(a.balance)} owed` : "Paid"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Billed: {formatCurrency(a.billed)}</span>
                          <span>Paid: {formatCurrency(a.paid)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
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
                        {studentAccounts.filter((a) => a.name.toLowerCase().includes(accountSearch.toLowerCase())).map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell className="text-right">{a.sessions}</TableCell>
                            <TableCell className="text-right">{formatCurrency(a.billed)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(a.paid)}</TableCell>
                            <TableCell className="text-right">
                              <span className={a.balance > 0 ? "text-amber-600 font-semibold" : "text-green-600"}>
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

        {/* Tutor Accounts */}
        <TabsContent value="tutor-accounts">
          <Card>
            <CardContent className="p-0">
              {tutorAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No tutor pay data yet. Log sessions with tutor pay rates to see accounts.</div>
              ) : (
                <>
                  <div className="p-4 border-b">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search tutors..." value={tutorAccountSearch} onChange={(e) => setTutorAccountSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden divide-y">
                    {tutorAccounts.filter((a) => a.name.toLowerCase().includes(tutorAccountSearch.toLowerCase())).map((a) => (
                      <div key={a.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{a.name}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{a.sessions} sessions · {a.hours.toFixed(1)} hrs</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-violet-600">{formatCurrency(a.owed)} owed</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
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
                        {tutorAccounts.filter((a) => a.name.toLowerCase().includes(tutorAccountSearch.toLowerCase())).map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell className="text-right">{a.sessions}</TableCell>
                            <TableCell className="text-right">{a.hours.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-semibold text-violet-600">{formatCurrency(a.owed)}</TableCell>
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
                <div className="p-8 text-center text-muted-foreground">No payments recorded yet.</div>
              ) : (
                <>
                  <div className="p-4 border-b">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search payments..." value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden divide-y">
                    {payments.filter((p) => {
                      const q = paymentSearch.toLowerCase();
                      return (p.students?.full_name || "").toLowerCase().includes(q) ||
                        (p.description || "").toLowerCase().includes(q) ||
                        (methodLabels[p.method] || "").toLowerCase().includes(q);
                    }).map((p) => (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                              <Badge variant="secondary" className="text-xs">{methodLabels[p.method] || p.method}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {p.students?.full_name || "No student"} · {format(new Date(p.payment_date), "MMM d, yyyy")}
                            </p>
                            {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <LogPaymentDialog initialData={p} onSuccess={fetchData} trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDeletePayment(e, p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.filter((p) => {
                          const q = paymentSearch.toLowerCase();
                          return (p.students?.full_name || "").toLowerCase().includes(q) ||
                            (p.description || "").toLowerCase().includes(q) ||
                            (methodLabels[p.method] || "").toLowerCase().includes(q);
                        }).map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{p.students?.full_name || "—"}</TableCell>
                            <TableCell><Badge variant="secondary">{methodLabels[p.method] || p.method}</Badge></TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">{p.description || "—"}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.amount)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <LogPaymentDialog initialData={p} onSuccess={fetchData} trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                                } />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDeletePayment(e, p.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
                <div className="p-8 text-center text-muted-foreground">No expenses recorded yet.</div>
              ) : (
                <>
                  <div className="p-4 border-b">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search expenses..." value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden divide-y">
                    {expenses.filter((ex) => {
                      const q = expenseSearch.toLowerCase();
                      return (ex.description || "").toLowerCase().includes(q) ||
                        (categoryLabels[ex.category] || "").toLowerCase().includes(q);
                    }).map((ex) => (
                      <div key={ex.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-red-600">{formatCurrency(ex.amount)}</p>
                              <Badge variant="secondary" className="text-xs">{categoryLabels[ex.category] || ex.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(ex.expense_date), "MMM d, yyyy")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{ex.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <LogExpenseDialog initialData={ex} onSuccess={fetchData} trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                            } />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDeleteExpense(e, ex.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.filter((ex) => {
                          const q = expenseSearch.toLowerCase();
                          return (ex.description || "").toLowerCase().includes(q) ||
                            (categoryLabels[ex.category] || "").toLowerCase().includes(q);
                        }).map((ex) => (
                          <TableRow key={ex.id}>
                            <TableCell className="font-medium">{format(new Date(ex.expense_date), "MMM d, yyyy")}</TableCell>
                            <TableCell><Badge variant="secondary">{categoryLabels[ex.category] || ex.category}</Badge></TableCell>
                            <TableCell className="text-muted-foreground max-w-[250px] truncate">{ex.description}</TableCell>
                            <TableCell className="text-right font-semibold text-red-600">{formatCurrency(ex.amount)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <LogExpenseDialog initialData={ex} onSuccess={fetchData} trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                                } />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => handleDeleteExpense(e, ex.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
