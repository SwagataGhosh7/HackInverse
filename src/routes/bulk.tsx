import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Download, HelpCircle, Loader2, ShieldAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EXPLORER, getRegistryAddress } from "@/lib/chain";
import { auditRecord, type SignatureAudit } from "@/lib/signature";
import { ORIGIN_LABEL } from "@/lib/origin";
import { truncateHash } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk verification — check many fingerprints at once" },
      {
        name: "description",
        content:
          "Paste a list of SHA-256 media fingerprints or upload a CSV to check them against the provenance registry and on-chain anchors in one pass.",
      },
      { property: "og:title", content: "Bulk provenance verification" },
      {
        property: "og:description",
        content: "Check hundreds of media fingerprints against the registry in a single run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkPage,
});

type Row = {
  id: string;
  media_hash: string;
  origin: string;
  title: string | null;
  wallet_address: string | null;
  signature: string | null;
  tx_hash: string | null;
  created_at: string;
};

type Result = {
  hash: string;
  record: Row | null;
  audit: SignatureAudit | null;
};

const HASH_RE = /0x[a-fA-F0-9]{64}/g;

function extractHashes(text: string): string[] {
  const found = text.match(HASH_RE) ?? [];
  return Array.from(new Set(found.map((h) => h.toLowerCase())));
}

function verdictOf(result: Result) {
  if (!result.record) return { label: "Unregistered", tone: "warn" as const };
  if (result.audit?.signatureValid === false || result.audit?.originMatch === false)
    return { label: "Conflict", tone: "bad" as const };
  if (result.audit?.signatureValid) return { label: "Verified", tone: "good" as const };
  return { label: "Registered", tone: "good" as const };
}

function BulkPage() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [running, setRunning] = useState(false);
  const [invalid, setInvalid] = useState(0);

  async function run(source: string) {
    const hashes = extractHashes(source);
    const lines = source.split(/[\n,;]+/).filter((l) => l.trim().length > 0);
    setInvalid(Math.max(0, lines.length - hashes.length));
    if (!hashes.length) {
      setResults([]);
      return;
    }
    setRunning(true);
    try {
      const { data } = await supabase
        .from("registrations")
        .select(
          "id, media_hash, origin, title, wallet_address, signature, tx_hash, created_at",
        )
        .in("media_hash", hashes);
      const byHash = new Map((data as Row[] | null)?.map((r) => [r.media_hash.toLowerCase(), r]) ?? []);
      const chainReady = Boolean(getRegistryAddress());
      const rows = await Promise.all(
        hashes.map(async (hash) => {
          const record = byHash.get(hash) ?? null;
          let audit: SignatureAudit | null = null;
          if (record && (record.signature || chainReady)) {
            audit = await auditRecord({
              mediaHash: record.media_hash,
              origin: record.origin,
              title: record.title,
              walletAddress: record.wallet_address,
              signature: record.signature,
            });
          }
          return { hash, record, audit } satisfies Result;
        }),
      );
      setResults(rows);
    } finally {
      setRunning(false);
    }
  }

  async function onCsv(file: File | null | undefined) {
    if (!file) return;
    const content = await file.text();
    setText(content);
    await run(content);
  }

  function exportRows() {
    return (results ?? []).map((r) => {
      const verdict = verdictOf(r);
      return {
        media_hash: r.hash,
        verdict: verdict.label,
        registered: Boolean(r.record),
        title: r.record?.title ?? "",
        declared_origin: r.record?.origin ?? "",
        wallet_address: r.record?.wallet_address ?? "",
        signature: r.record?.signature ?? "",
        recovered_signer: r.audit?.recovered ?? "",
        signature_valid:
          r.audit?.signatureValid === null || r.audit?.signatureValid === undefined
            ? "unknown"
            : String(r.audit.signatureValid),
        onchain_origin: r.audit?.onChain?.origin ?? "",
        onchain_creator: r.audit?.onChain?.creator ?? "",
        origin_match:
          r.audit?.originMatch === null || r.audit?.originMatch === undefined
            ? "unknown"
            : String(r.audit.originMatch),
        creator_match:
          r.audit?.creatorMatch === null || r.audit?.creatorMatch === undefined
            ? "unknown"
            : String(r.audit.creatorMatch),
        tx_hash: r.record?.tx_hash ?? "",
        registered_at: r.record?.created_at ?? "",
      };
    });
  }

  function download(content: string, mime: string, extension: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-verification-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const rows = exportRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]!);
    const escape = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escape(row[h as keyof typeof row])).join(",")),
    ].join("\n");
    download(csv, "text/csv;charset=utf-8", "csv");
  }

  function exportJson() {
    const rows = exportRows();
    if (!rows.length) return;
    download(
      JSON.stringify({ generatedAt: new Date().toISOString(), results: rows }, null, 2),
      "application/json",
      "json",
    );
  }


  const summary = results
    ? {
        total: results.length,
        registered: results.filter((r) => r.record).length,
        conflicts: results.filter((r) => verdictOf(r).tone === "bad").length,
      }
    : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <p className="label-mono">Batch terminal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bulk verification</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Paste SHA-256 fingerprints (one per line) or upload a CSV export. Each hash is matched
          against the registry, and stored signatures are re-derived and compared with the on-chain
          origin declaration.
        </p>
      </header>

      <div className="rounded-md border border-border bg-card p-4">
        <label htmlFor="hashes" className="label-mono">
          Fingerprints
        </label>
        <textarea
          id="hashes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={"0x" + "a".repeat(64) + "\n0x" + "b".repeat(64)}
          className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => run(text)} disabled={running || !text.trim()}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verify batch
          </Button>
          <Button asChild variant="outline" disabled={running}>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={(e) => onCsv(e.target.files?.[0])}
              />
            </label>
          </Button>
          {results && results.length > 0 && (
            <>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Button variant="outline" onClick={exportJson}>
                <Download className="h-4 w-4" /> Export JSON
              </Button>
            </>
          )}

          {results && (
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {summary!.total} checked · {summary!.registered} registered · {summary!.conflicts}{" "}
              conflicts
              {invalid > 0 ? ` · ${invalid} unparsable` : ""}
            </span>
          )}
        </div>
      </div>

      {results && results.length === 0 && (
        <p className="mt-6 rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
          No valid SHA-256 fingerprints found in that input. Each hash must be a 0x-prefixed,
          64-character hex string.
        </p>
      )}

      {results && results.length > 0 && (
        <section className="mt-6 overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-2.5 font-normal">Fingerprint</th>
                <th className="px-4 py-2.5 font-normal">Verdict</th>
                <th className="px-4 py-2.5 font-normal">Declared origin</th>
                <th className="px-4 py-2.5 font-normal">Signature</th>
                <th className="px-4 py-2.5 font-normal">Anchor</th>
                <th className="px-4 py-2.5 font-normal" />
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const verdict = verdictOf(result);
                const Icon =
                  verdict.tone === "good"
                    ? CheckCircle2
                    : verdict.tone === "bad"
                      ? ShieldAlert
                      : HelpCircle;
                return (
                  <tr key={result.hash} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs">{truncateHash(result.hash, 14, 10)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em]",
                          verdict.tone === "good" && "text-primary",
                          verdict.tone === "bad" && "text-destructive",
                          verdict.tone === "warn" && "text-warning",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden /> {verdict.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {result.record
                        ? (ORIGIN_LABEL[result.record.origin] ?? result.record.origin)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {result.audit?.signatureValid === true
                        ? "Valid signer"
                        : result.audit?.signatureValid === false
                          ? "Signer mismatch"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {result.record?.tx_hash ? (
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href={`${EXPLORER}/tx/${result.record.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {truncateHash(result.record.tx_hash, 10, 8)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <Link
                        to="/verify"
                        search={{ hash: result.hash }}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Verify →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
