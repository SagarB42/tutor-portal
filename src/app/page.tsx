import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { EoiForm } from "@/components/landing/eoi-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Tutor Portal — Run your tutoring business with calm",
  description:
    "Tutor Portal helps independent tutoring businesses manage students, tutors, sessions, finance and more — without the spreadsheet chaos.",
};

const features = [
  {
    icon: Users,
    title: "Students & tutors",
    body: "Centralised profiles, contact details, rates and emergency contacts — always one click away.",
  },
  {
    icon: CalendarDays,
    title: "Sessions & calendar",
    body: "Schedule one-offs or recurring series, track attendance, and see your week at a glance.",
  },
  {
    icon: DollarSign,
    title: "Finance & invoices",
    body: "Log payments and expenses, generate branded PDF invoices, and watch the FY P&L update live.",
  },
  {
    icon: BookOpen,
    title: "Resources",
    body: "Attach worksheets, links and notes to sessions so tutors always know what to bring.",
  },
  {
    icon: Mail,
    title: "AI-drafted emails",
    body: "Compose parent updates and reminders with AI — review, tweak, then hand off to your mail app.",
  },
  {
    icon: Sparkles,
    title: "Made for solo operators",
    body: "Built for owner-run tutoring businesses. No bloat, no enterprise upsell, just the tools you need.",
  },
];

const benefits = [
  "All your students, tutors and sessions in one place",
  "Automatic prepaid balance tracking with low-credit alerts",
  "PDF invoices with your branding and AU GST handled",
  "AI email drafts that sound like you wrote them",
  "Keyboard-first command palette for power users",
  "Light, dark and system themes",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Existing users go straight to the dashboard.
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/25">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">Tutor Portal</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="#request-access">Get access</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/40" />
        <div className="absolute -z-10 top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -z-10 bottom-0 right-0 h-[400px] w-[400px] translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Invite-only beta · early access available
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Run your tutoring business{" "}
              <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
                with calm
              </span>
              .
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Tutor Portal is the all-in-one workspace for owner-run tutoring businesses.
              Students, tutors, sessions, finance, resources and AI-drafted parent emails
              — without the spreadsheet chaos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="#request-access">Request access</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">See what&apos;s inside</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card. We onboard new businesses by invitation.
            </p>
          </div>

          <div id="request-access" className="lg:pt-4">
            <EoiForm />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything a tutoring business actually needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              Built from the ground up for solo operators and small teams. No enterprise
              bloat, no duct-taped spreadsheets.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-card/60 p-6 backdrop-blur-sm transition hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why owners switch to Tutor Portal
            </h2>
            <p className="mt-4 text-muted-foreground">
              Stop juggling Google Sheets, calendars and a notes app. Everything is wired
              together so the data you enter once shows up where it matters.
            </p>
            <ul className="mt-8 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" />
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border bg-card/60 p-8 backdrop-blur-sm">
            <p className="text-sm font-medium text-muted-foreground">The pitch</p>
            <blockquote className="mt-3 text-lg italic leading-relaxed">
              &ldquo;You&apos;re running a real business. You shouldn&apos;t need three
              spreadsheets and a sticky note to know which student paid this week.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Built by an owner-operator</p>
                <p className="text-xs text-muted-foreground">For other owner-operators.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to tidy up the chaos?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Send us a quick expression of interest and we&apos;ll be in touch with an invite.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="#request-access">Request access</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Tutor Portal. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="#request-access" className="hover:text-foreground">
              Request access
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
