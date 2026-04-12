"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

type AuthState = {
  user: User | null;
  organizationId: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  organizationId: null,
  loading: true,
});

const supabase = createClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    organizationId: null,
    loading: true,
  });

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", session.user.id)
            .single();

          setState({
            user: session.user,
            organizationId: org?.id ?? null,
            loading: false,
          });
        } else {
          setState({ user: null, organizationId: null, loading: false });
        }
      } catch {
        setState({ user: null, organizationId: null, loading: false });
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", session.user.id)
          .single();

        setState({
          user: session.user,
          organizationId: org?.id ?? null,
          loading: false,
        });
      } else {
        setState({ user: null, organizationId: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
