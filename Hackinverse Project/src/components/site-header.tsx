import { Link, useRouter } from "@tanstack/react-router";
import { Fingerprint, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { firebaseAuth } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/verify", label: "Verify" },
  { to: "/bulk", label: "Bulk" },
  { to: "/register", label: "Register" },
  { to: "/explorer", label: "Registry" },
] as const;


export function SiteHeader() {
  const { user } = useAuth();
  const router = useRouter();

  async function signOutUser() {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
    router.navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary" aria-hidden />
          <span className="font-mono text-sm tracking-[0.2em] uppercase">Provenance</span>
        </Link>
        <nav className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.14em]">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-primary" }}
              >
                Dashboard
              </Link>
              <Button variant="ghost" size="sm" onClick={signOutUser} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
