"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

function InviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const supabase = createClient();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invalid, setInvalid] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) { setInvalid("No invite token provided."); setLoading(false); return; }

    Promise.resolve(
      supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .single()
    ).then(({ data, error }) => {
        if (error || !data) {
          setInvalid("This invite link is invalid.");
        } else if (data.used_at) {
          setInvalid("This invite has already been used.");
        } else if (new Date(data.expires_at) < new Date()) {
          setInvalid("This invite has expired. Please ask for a new link.");
        } else {
          setInvite(data);
          setEmail(data.email);
        }
        setLoading(false);
      })
      .catch(() => {
        setInvalid("Unable to verify invite. Please try again.");
        setLoading(false);
      });
  }, [token]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setSubmitting(true);

    try {
      // Sign up only — do NOT auto-login
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authErr) { setError(authErr.message); setSubmitting(false); return; }

      if (!authData.user) { setError("Sign up failed. Please try again."); setSubmitting(false); return; }

      // Sign out immediately so user must log in manually
      // This avoids RLS issues — org will be created on first login
      await supabase.auth.signOut();

      // Mark invite as used (fire-and-forget)
      supabase.from("invitations").update({
        used_at: new Date().toISOString(),
      }).eq("id", invite.id).then();

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invalid) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-violet-50/50" />
        <div className="relative w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="font-semibold text-lg">Invalid Invite</p>
              <p className="text-sm text-muted-foreground">{invalid}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-violet-50/50" />
        <div className="relative w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="font-semibold text-lg">Account Created!</p>
              <p className="text-sm text-muted-foreground">Your account has been set up. Please log in to get started.</p>
              <Button className="mt-4" onClick={() => router.push("/auth/login")}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-violet-50/50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2" />

      <div className="relative w-full max-w-md animate-slide-up">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-14 h-14 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Tutor Portal</CardTitle>
            <CardDescription className="text-sm">
              You&apos;ve been invited to join <strong>{invite.business_name}</strong>. Create your account below.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    className="pl-9 bg-muted"
                    required
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Already have an account?{" "}
              <a href="/auth/login" className="text-primary hover:underline">Sign in</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <InviteForm />
    </Suspense>
  );
}
