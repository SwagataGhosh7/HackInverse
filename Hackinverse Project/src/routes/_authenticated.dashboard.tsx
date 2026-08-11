import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Rocket, Wallet } from "lucide-react";
import { EvidencePanel, EvidenceRow } from "@/components/evidence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import {
  deployRegistry,
  getRegistryAddress,
  setRegistryAddress,
  CHAIN,
  EXPLORER,
} from "@/lib/chain";
import { truncateHash } from "@/lib/media";
import { ORIGIN_LABEL } from "@/lib/origin";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Creator dashboard — Provenance Registry" },
      {
        name: "description",
        content:
          "Manage your registered media, linked wallets and the Base Sepolia registry contract used for anchoring.",
      },
      { property: "og:title", content: "Creator dashboard" },
      {
        property: "og:description",
        content: "Your registered media, linked wallets and registry contract settings.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const wallet = useWallet();
  const [contract, setContract] = useState(() => getRegistryAddress() ?? "");
  const [deploying, setDeploying] = useState(false);
  const [deployTx, setDeployTx] = useState<string | null>(null);


  const { data: rows } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, media_hash, origin, title, tx_hash, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function linkWallet() {
    if (!user) return;
    try {
      const address = await wallet.connect();
      const { error } = await supabase
        .from("wallets")
        .upsert({ user_id: user.id, address }, { onConflict: "address" });
      if (error) throw error;
      toast.success("Wallet linked to your account.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link wallet.");
    }
  }

  function saveContract() {
    setRegistryAddress(contract);
    toast.success(contract ? "Registry contract saved." : "Registry contract cleared.");
  }

  async function deploy() {
    setDeploying(true);
    setDeployTx(null);
    try {
      const account = wallet.address ?? (await wallet.connect());
      toast.info("Confirm the deployment in your wallet…");
      const { hash, address } = await deployRegistry(account as `0x${string}`);
      setDeployTx(hash);
      setRegistryAddress(address);
      setContract(address);
      toast.success("MediaRegistry deployed and saved as your registry contract.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  }


  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="label-mono">Operator console</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <EvidencePanel title="Wallet">
          <div className="space-y-3 py-4">
            <EvidenceRow label="Connected" value={wallet.address ?? "Not connected"} />
            <EvidenceRow label="Network" value={`${CHAIN.name} (${CHAIN.id})`} mono={false} />
            <Button variant="outline" size="sm" onClick={linkWallet} disabled={!wallet.available}>
              <Wallet className="h-4 w-4" />
              {wallet.address ? "Link to account" : "Connect wallet"}
            </Button>
          </div>
        </EvidencePanel>

        <EvidencePanel title="Registry contract">
          <div className="space-y-4 py-4">
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <span className="label-mono mr-2">01</span>Connect a wallet funded with{" "}
                {CHAIN.name} test ETH.
              </li>
              <li>
                <span className="label-mono mr-2">02</span>Deploy{" "}
                <code className="font-mono">MediaRegistry.sol</code> in one click — the address is
                saved automatically.
              </li>
              <li>
                <span className="label-mono mr-2">03</span>Or paste an already-deployed address
                below.
              </li>
            </ol>

            <Button size="sm" onClick={deploy} disabled={deploying || !wallet.available}>
              {deploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {deploying ? "Deploying…" : `Deploy to ${CHAIN.name}`}
            </Button>
            {!wallet.available && (
              <p className="text-xs text-warning">
                No browser wallet detected — install MetaMask to deploy.
              </p>
            )}
            {deployTx && (
              <a
                href={`${EXPLORER}/tx/${deployTx}`}
                target="_blank"
                rel="noreferrer"
                className="block font-mono text-[11px] text-primary underline-offset-4 hover:underline"
              >
                Deployment tx {truncateHash(deployTx, 12, 8)} →
              </a>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="contract" className="label-mono">
                Contract address
              </Label>
              <Input
                id="contract"
                value={contract}
                onChange={(e) => setContract(e.target.value)}
                placeholder="0x…"
                className="font-mono text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={saveContract}>
              Save
            </Button>

          </div>
        </EvidencePanel>
      </div>

      <section className="mt-8">
        <h2 className="label-mono mb-3">Your registrations</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {(rows ?? []).length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing registered yet.{" "}
              <Link to="/register" className="text-primary underline-offset-4 hover:underline">
                Register media →
              </Link>
            </p>
          )}
          {(rows ?? []).map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Link
                to="/record/$hash"
                params={{ hash: row.media_hash }}
                className="min-w-0 flex-1"
              >
                <span className="block truncate text-sm">{row.title}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {truncateHash(row.media_hash, 20, 8)}
                </span>
              </Link>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {ORIGIN_LABEL[row.origin] ?? row.origin}
              </span>
              {row.tx_hash ? (
                <a
                  href={`${EXPLORER}/tx/${row.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
                >
                  anchored
                </a>
              ) : (
                <span className="font-mono text-[11px] text-warning">signed only</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
