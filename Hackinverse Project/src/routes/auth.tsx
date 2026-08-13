import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { firebaseAuth } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const authDisabled = !firebaseAuth;

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Provenance Registry" },
      {
        name: "description",
        content:
          "Sign in to register media fingerprints, link a wallet, and anchor provenance on Base Sepolia.",
      },
      { property: "og:title", content: "Sign in — Provenance Registry" },
      {
        property: "og:description",
        content: "Creator access to the media provenance and deepfake verification registry.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const target = search.redirect?.startsWith("/") ? search.redirect : "/dashboard";


  async function submit(event: FormEvent<HTMLFormElement>) {
    if (authDisabled || !firebaseAuth) {
      toast.error("Firebase auth is not configured. Set VITE_FIREBASE_* env vars.");
      return;
    }

    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (displayName.trim()) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
      navigate({ to: target, replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (authDisabled || !firebaseAuth) {
      toast.error("Firebase auth is not configured. Set VITE_FIREBASE_* env vars.");
      return;
    }

    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      navigate({ to: target, replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary" aria-hidden />
          <h1 className="font-mono text-sm uppercase tracking-[0.18em]">
            {mode === "signin" ? "Creator access" : "Create creator account"}
          </h1>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Verification is open to everyone. An account is only required to register and sign media.
        </p>

        {authDisabled && (
          <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Firebase auth is not configured yet. Add the VITE_FIREBASE_* values in your .env file.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="label-mono">
                Display name
              </Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                placeholder="Studio or creator name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="label-mono">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="label-mono">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {notice && <p className="text-xs text-primary">{notice}</p>}
          <Button type="submit" className="w-full" disabled={busy || authDisabled}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-mono">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google} disabled={authDisabled}>
          Continue with Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "signin"
            ? "No account yet? Register as a creator"
            : "Already registered? Sign in"}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/verify" className="underline-offset-4 hover:text-foreground hover:underline">
          Verify a file without an account →
        </Link>
      </p>
    </main>
  );
}
