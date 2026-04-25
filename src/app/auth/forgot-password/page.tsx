"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Supabase silently no-ops for unknown emails (no enumeration leak),
    // so we always show the same success state.
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // The email template should include `{{ .Token }}` so the user gets a
      // 6-digit OTP. The redirectTo is a fallback for the magic link.
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/reset-password`
          : undefined,
    });

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Shell>
        <CardContent className="pt-2 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Check your email</p>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a 6-digit
              code. Enter it on the next screen to reset your password.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)
            }
          >
            I have my code
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Use a different email
          </button>
        </CardContent>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardContent className="pt-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send reset code
          </Button>
        </form>
        <Link
          href="/auth/login"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </CardContent>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <Card className="shadow-xl border bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
            <CardDescription className="text-sm">
              Enter the email registered to your account and we&apos;ll send you a code.
            </CardDescription>
          </CardHeader>
          {children}
        </Card>
      </div>
    </main>
  );
}
