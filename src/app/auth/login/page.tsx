"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, GraduationCap, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      // Ensure org exists — if not, create from invitation data
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", data.session.user.id)
        .single();

      if (!org) {
        // Look up the invite to get the business name
        const { data: invite } = await supabase
          .from("invitations")
          .select("id, business_name")
          .eq("email", email.toLowerCase())
          .single();

        const { data: newOrg } = await supabase.from("organizations").insert({
          name: invite?.business_name || "My Tutoring Business",
          owner_id: data.session.user.id,
        }).select("id").single();

        // Link invite to the new org
        if (invite && newOrg) {
          supabase.from("invitations").update({
            organization_id: newOrg.id,
          }).eq("id", invite.id).then();
        }
      }

      router.replace("/dashboard");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-violet-50/50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-t from-violet-100/30 to-transparent rounded-full blur-3xl translate-y-1/2" />

      <div className="relative w-full max-w-md animate-slide-up">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-14 h-14 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-7 w-7 text-white" />
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
