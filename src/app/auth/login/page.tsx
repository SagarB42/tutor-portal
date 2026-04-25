"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap, Mail, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Server-side dashboard layout will bootstrap the organization on first
      // visit. Just navigate — middleware guarantees the session cookie is
      // set before the RSC runs.
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next);
      router.refresh();
      return;
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 bg-background text-foreground">
      {/* Background — uses theme tokens so it adapts to light/dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl translate-y-1/2" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <Card className="shadow-xl border bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Tutor Portal</CardTitle>
            <CardDescription className="text-sm">Sign in to manage your tutoring business</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure authentication powered by Supabase
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
