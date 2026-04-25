import { format } from "date-fns";
import { Mail, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { listEmailDrafts, countDraftsByStatus } from "@/lib/queries/emails";
import { requireOrg } from "@/lib/queries/org";
import type { EmailDraftContext, EmailDraftStatus } from "@/lib/db-types";
import { NewEmailButton } from "./_components/new-email-button";
import { DraftRowActions } from "./_components/draft-row-actions";

export const dynamic = "force-dynamic";

const statusVariant: Partial<
  Record<EmailDraftStatus, { label: string; className: string }>
> = {
  draft: {
    label: "Draft",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  sent: {
    label: "Sent",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const contextLabel: Record<string, string> = {
  session_summary: "Session summary",
  invoice_reminder: "Invoice reminder",
  prepaid_topup: "Prepaid top-up",
  attendance_absence: "Attendance",
  resource_assignment: "Resource",
  marketing: "Marketing",
  custom: "Custom",
};

export default async function EmailsPage() {
  await requireOrg();
  const [all, counts] = await Promise.all([
    listEmailDrafts(),
    countDraftsByStatus(),
  ]);

  // Hide discarded and failed drafts from every view — they are noise.
  const visible = all.filter(
    (d) => d.status !== "discarded" && d.status !== "failed",
  );
  const buckets: Record<"all" | "draft" | "sent", typeof all> = {
    all: visible,
    draft: visible.filter((d) => d.status === "draft"),
    sent: visible.filter((d) => d.status === "sent"),
  };

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Mail className="h-6 w-6 text-primary" /> Emails
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-drafted emails to parents and students. Nothing is sent until you
            click <span className="font-medium">Send</span>.
          </p>
        </div>
        <NewEmailButton />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Draft inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="draft" className="w-full">
            <TabsList>
              <TabsTrigger value="draft">
                Drafts{" "}
                <Badge variant="outline" className="ml-2">
                  {counts.draft}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent{" "}
                <Badge variant="outline" className="ml-2">
                  {counts.sent}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {(["draft", "sent", "all"] as const).map((key) => {
              const rows = buckets[key];
              return (
                <TabsContent key={key} value={key} className="mt-4">
                  {rows.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No emails here yet.
                    </p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {rows.map((d) => {
                        const v =
                          statusVariant[d.status as EmailDraftStatus] ??
                          statusVariant.draft!;
                        return (
                          <li
                            key={d.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={v.className}
                                >
                                  {v.label}
                                </Badge>
                                <Badge variant="outline" className="text-[11px]">
                                  {contextLabel[d.context_type] ??
                                    d.context_type}
                                </Badge>
                                <span className="truncate text-sm font-medium">
                                  {d.subject}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                To {d.to_email}
                                {d.students?.full_name &&
                                  ` · re: ${d.students.full_name}`}{" "}
                                · {format(new Date(d.created_at ?? Date.now()), "d MMM yyyy h:mm a")}
                              </p>
                            </div>
                            <DraftRowActions
                              draft={{
                                id: d.id,
                                status: d.status as EmailDraftStatus,
                                context_type: d.context_type as EmailDraftContext,
                                context_id: d.context_id ?? null,
                                student_id: d.student_id ?? null,
                                to_email: d.to_email,
                                subject: d.subject,
                                body: d.body,
                              }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
