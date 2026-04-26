import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Mail,
  MessageSquareText,
  Sparkles,
  Users,
  Zap,
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
    title: "AI-drafted parent emails",
    body: "One-click drafts for attendance, invoices and resource shares — with the right links and student context already filled in.",
  },
  {
    icon: MessageSquareText,
    title: "Ask AI assistant",
    body: "Ask plain-English questions about revenue, overdue invoices, upcoming sessions, tutor payouts and more — right from the dashboard.",
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

const pricingTiers = [
  {
    name: "Starter",
    price: "$10",
    period: "per month",
    tagline: "For tutors just getting organised.",
    highlights: [
      "Up to 15 students",
      "Up to 3 tutors",
      "Sessions, attendance & resources",
      "Payments, expenses & invoices",
    ],
    cta: "Request access",
    featured: false,
  },
  {
    name: "Growth",
    price: "$20",
    period: "per month",
    tagline: "For growing studios with a small team.",
    highlights: [
      "Up to 40 students",
      "Up to 10 tutors",
      "Calendar view & scheduling",
      "Everything in Starter",
    ],
    cta: "Request access",
    featured: true,
  },
  {
    name: "AI",
    price: "$35",
    period: "per month",
    tagline: "Unlimited scale with the AI assistant on tap.",
    highlights: [
      "Unlimited students & tutors",
      "Ask AI assistant",
      "AI-drafted parent emails",
      "Everything in Growth",
    ],
    cta: "Request access",
    featured: false,
  },
];

const faqs = [
  {
    q: "Is it really free right now?",
    a: "Yes — Tutor Portal is free for invited businesses through the beta. Paid plans only kick in at the start of NSW Term 4 2026, and we'll give you plenty of notice before any change.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. Upgrade or downgrade anytime from the dashboard — billing is prorated and you keep all your data.",
  },
  {
    q: "Where is my data stored?",
    a: "In Supabase (Sydney region). Each tutoring business is fully isolated by row-level security, so nobody else can see your students, invoices or notes.",
  },
  {
    q: "Does the AI assistant see sensitive data like bank details?",
    a: "No. The Ask AI assistant runs read-only queries against your data and is explicitly blocked from selecting BSB, account numbers or TFNs. It can't send emails or change anything by itself.",
  },
  {
    q: "Do AI emails actually send themselves?",
    a: "Never. Tutor Portal drafts the email and hands it to your normal mail app (Gmail, Outlook, Apple Mail). You read it, tweak it, then hit send.",
  },
  {
    q: "Can I import my existing student list?",
    a: "Yes — drop us a CSV and we'll help with the first import during onboarding.",
  },
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
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="#ai"
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground md:inline-flex"
            >
              AI
            </Link>
            <Link
              href="#pricing"
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground md:inline-flex"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground md:inline-flex"
            >
              FAQ
            </Link>
            <div className="hidden h-5 w-px bg-border md:mx-2 md:block" />
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
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Free until NSW Term 4, 2026 · invite-only beta
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

      {/* AI Spotlight */}
      <section id="ai" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                New · AI built in
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                An AI co-pilot that actually knows your business.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Tutor Portal&apos;s AI is grounded in your real data — students, sessions,
                invoices, resources — so the answers and emails you get are specific, not generic.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex gap-3">
                  <Zap className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Ask anything, get a real answer</p>
                    <p className="text-sm text-muted-foreground">
                      &ldquo;How much did we make this month?&rdquo; &middot; &ldquo;Who&apos;s overdue?&rdquo; &middot; &ldquo;What sessions does Priya have next week?&rdquo;
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Drafts that sound like you</p>
                    <p className="text-sm text-muted-foreground">
                      Attendance follow-ups know if a student was late or absent. Resource shares include the
                      actual links. Invoice nudges quote the real amount.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Safe by design</p>
                    <p className="text-sm text-muted-foreground">
                      Read-only access to your data. Never touches bank details, BSBs or TFNs. Never sends an
                      email without your final OK.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Mock preview */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent blur-2xl" />
              <div className="relative rounded-2xl border bg-card shadow-xl">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="ml-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Ask AI
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                    How much revenue this month and who&apos;s overdue?
                  </div>
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
                    <p className="font-medium">This month so far</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• Revenue: <span className="font-medium text-foreground">$4,820</span></li>
                      <li>• Expenses: <span className="font-medium text-foreground">$310</span></li>
                      <li>• Net: <span className="font-medium text-emerald-600 dark:text-emerald-400">+$4,510</span></li>
                    </ul>
                    <p className="mt-3 font-medium">Overdue invoices (2)</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li>• Sharma family — $240 · 12 days late</li>
                      <li>• Nguyen family — $180 · 4 days late</li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Ask anything…
                  </div>
                </div>
              </div>
            </div>
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

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, honest pricing</h2>
            <p className="mt-4 text-muted-foreground">
              <span className="font-medium text-foreground">Free for everyone in the beta.</span> Paid plans
              start from the beginning of NSW Term 4, 2026 — we&apos;ll let you know well in advance.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={
                  "relative flex flex-col rounded-2xl border bg-card p-6 " +
                  (tier.featured ? "border-primary shadow-lg ring-1 ring-primary/30" : "")
                }
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-medium text-muted-foreground">{tier.name}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {tier.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-2">
                  <Button
                    asChild
                    variant={tier.featured ? "default" : "outline"}
                    className="w-full"
                  >
                    <Link href="#request-access">{tier.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            All prices in AUD. Switch or cancel anytime. No card needed during beta.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
            <p className="mt-4 text-muted-foreground">
              The things most owner-operators want to know before signing up.
            </p>
          </div>
          <div className="mt-10 divide-y rounded-2xl border bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-base font-medium">
                  {f.q}
                  <span className="text-muted-foreground transition group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
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
