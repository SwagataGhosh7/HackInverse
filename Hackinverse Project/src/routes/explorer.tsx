import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Blocks, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { truncateHash } from "@/lib/media";
import { ORIGIN_LABEL, ORIGIN_OPTIONS } from "@/lib/origin";
import {
  EXPLORER,
  ORIGIN_FROM_CODE,
  fetchRegisteredEvents,
  getRegistryAddress,
} from "@/lib/chain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Public provenance registry — signed media records" },
      {
        name: "description",
        content:
          "Browse every media fingerprint registered on the public provenance registry, with declared origin, creator wallet, decoded on-chain events and direct verification links.",
      },
      { property: "og:title", content: "Public provenance registry" },
      {
        property: "og:description",
        content: "Every signed media fingerprint, its declared origin and its on-chain anchor.",
      },
    ],
  }),
  component: ExplorerPage,
});

type Row = {
  id: string;
  media_hash: string;
  origin: string;
  title: string | null;
  wallet_address: string | null;
  tx_hash: string | null;
  created_at: string;
};

type Tab = "registry" | "onchain";

function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<string>("all");
  const [verdict, setVerdict] = useState<"all" | "anchored" | "signed">("all");
  const [tab, setTab] = useState<Tab>("registry");
  const registryAddress = getRegistryAddress();

  const { data, isLoading } = useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, media_hash, origin, title, wallet_address, tx_hash, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["registry-events", registryAddress],
    enabled: tab === "onchain" && Boolean(registryAddress),
    queryFn: () => fetchRegisteredEvents(),
  });

  const q = query.trim().toLowerCase();

  const rows = (data ?? []).filter((row) => {
    const matchesQuery =
      !q ||
      row.media_hash.toLowerCase().includes(q) ||
      (row.title ?? "").toLowerCase().includes(q) ||
      (row.wallet_address ?? "").toLowerCase().includes(q);
    const matchesOrigin = origin === "all" || row.origin === origin;
    const matchesVerdict =
      verdict === "all" ||
      (verdict === "anchored" ? Boolean(row.tx_hash) : !row.tx_hash);
    return matchesQuery && matchesOrigin && matchesVerdict;
  });

  const eventRows = (events ?? []).filter((event) => {
    const eventOrigin = ORIGIN_FROM_CODE[event.originType] ?? "human";
    const matchesQuery =
      !q ||
      event.mediaHash.toLowerCase().includes(q) ||
      event.creator.toLowerCase().includes(q) ||
      event.metaURI.toLowerCase().includes(q);
    return matchesQuery && (origin === "all" || eventOrigin === origin);
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <p className="label-mono">Public registry</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Registry explorer</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every attestation is public. Search by fingerprint, title or creator wallet, filter by
          declared origin, and inspect decoded on-chain <code className="font-mono">Registered</code>{" "}
          events.
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={tab === "registry" ? "default" : "outline"}
          onClick={() => setTab("registry")}
        >
          <ShieldCheck className="h-4 w-4" /> Registry records
        </Button>
        <Button
          size="sm"
          variant={tab === "onchain" ? "default" : "outline"}
          onClick={() => setTab("onchain")}
        >
          <Blocks className="h-4 w-4" /> On-chain events
        </Button>
      </div>

      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="0x… hash, title or creator wallet"
          className="pl-9 font-mono text-xs"
          aria-label="Search registry"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="label-mono mr-1">Origin</span>
        {[{ value: "all", label: "All" }, ...ORIGIN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))].map(
          (option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setOrigin(option.value)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                origin === option.value
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ),
        )}

        {tab === "registry" && (
          <>
            <span className="label-mono mr-1 ml-4">Anchor</span>
            {(
              [
                { value: "all", label: "All" },
                { value: "anchored", label: "On-chain" },
                { value: "signed", label: "Signed only" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVerdict(option.value)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                  verdict === option.value
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </>
        )}
      </div>

      {tab === "registry" && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="hidden grid-cols-[1fr_9rem_9rem_7rem_5rem] gap-4 border-b border-border px-4 py-2.5 md:grid">
            <span className="label-mono">Fingerprint / title</span>
            <span className="label-mono">Origin</span>
            <span className="label-mono">Creator</span>
            <span className="label-mono">Date</span>
            <span className="label-mono">Verify</span>
          </div>

          {isLoading && (
            <p className="px-4 py-8 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Loading records…
            </p>
          )}

          {!isLoading && rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No matching records.{" "}
              <Link to="/register" className="text-primary underline-offset-4 hover:underline">
                Register one →
              </Link>
            </p>
          )}

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-1 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-panel md:grid-cols-[1fr_9rem_9rem_7rem_5rem] md:items-center md:gap-4"
            >
              <Link to="/record/$hash" params={{ hash: row.media_hash }} className="min-w-0">
                <span className="block truncate font-mono text-xs text-foreground">
                  {truncateHash(row.media_hash, 22, 10)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.title || "Untitled"}
                </span>
              </Link>
              <span
                className={cn(
                  "font-mono text-[11px] uppercase tracking-[0.12em]",
                  row.origin === "human" ? "text-primary" : "text-warning",
                )}
              >
                {ORIGIN_LABEL[row.origin] ?? row.origin}
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {row.wallet_address ? truncateHash(row.wallet_address, 6, 4) : "—"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(row.created_at).toISOString().slice(0, 10)}
              </span>
              <Link
                to="/verify"
                search={{ hash: row.media_hash }}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary underline-offset-4 hover:underline"
              >
                Verify →
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "onchain" && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {!registryAddress && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No registry contract configured. Deploy one from the{" "}
              <Link to="/dashboard" className="text-primary underline-offset-4 hover:underline">
                dashboard
              </Link>{" "}
              to read on-chain events.
            </p>
          )}

          {registryAddress && eventsLoading && (
            <p className="px-4 py-8 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Decoding Registered events…
            </p>
          )}

          {registryAddress && !eventsLoading && eventRows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No matching on-chain events for {truncateHash(registryAddress, 8, 6)}.
            </p>
          )}

          {eventRows.map((event) => {
            const eventOrigin = ORIGIN_FROM_CODE[event.originType] ?? "human";
            return (
              <div
                key={`${event.txHash}-${event.mediaHash}`}
                className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 hover:bg-panel md:grid-cols-[1fr_9rem_9rem_7rem_5rem] md:items-center md:gap-4"
              >
                <Link to="/record/$hash" params={{ hash: event.mediaHash }} className="min-w-0">
                  <span className="block truncate font-mono text-xs text-foreground">
                    {truncateHash(event.mediaHash, 22, 10)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    block {event.blockNumber} ·{" "}
                    <a
                      href={`${EXPLORER}/tx/${event.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {truncateHash(event.txHash, 10, 6)}
                    </a>
                  </span>
                </Link>
                <span
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-[0.12em]",
                    eventOrigin === "human" ? "text-primary" : "text-warning",
                  )}
                >
                  {ORIGIN_LABEL[eventOrigin] ?? eventOrigin}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {truncateHash(event.creator, 6, 4)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {event.timestamp
                    ? new Date(event.timestamp * 1000).toISOString().slice(0, 10)
                    : "—"}
                </span>
                <Link
                  to="/verify"
                  search={{ hash: event.mediaHash }}
                  className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary underline-offset-4 hover:underline"
                >
                  Verify →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
