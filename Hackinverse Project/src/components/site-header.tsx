import { Link, useRouter } from "@tanstack/react-router";
import { Fingerprint, LogOut, Sun, Moon, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { firebaseAuth } from "@/integrations/firebase/client";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { to: "/verify", label: "Verify" },
  { to: "/bulk", label: "Bulk" },
  { to: "/register", label: "Register" },
  { to: "/explorer", label: "Registry" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const { theme, toggle, mounted } = useTheme();
  const router = useRouter();

  async function signOutUser() {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
    router.navigate({ to: "/", replace: true });
  }

  const initials = (user?.displayName || user?.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

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
          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Open profile menu"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? "Avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-mono text-xs font-semibold text-primary">{initials}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium leading-none">
                    {user.displayName || "Creator"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOutUser}
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
