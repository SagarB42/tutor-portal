"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        // No session — redirect to login
        router.replace("/auth/login");
        return;
      }

      // Ensure the user has an organization
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", session.user.id)
        .single();

      if (!org) {
        const { error: orgError } = await supabase.from("organizations").insert({
          name: "My Tutoring Business",
          owner_id: session.user.id,
        });
        if (orgError) {
          setError("Failed to create organization: " + orgError.message);
          return;
        }
      }

      router.replace("/dashboard");
    });
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </main>
  );
}
