import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, RotateCcw } from "lucide-react";
import type { Hex } from "viem";
import { MediaDropzone } from "@/components/media-dropzone";
import { EvidencePanel, EvidenceRow } from "@/components/evidence";
import { SignatureEvidence } from "@/components/signature-evidence";
import { EvidenceTimeline } from "@/components/evidence-timeline";


import { AiVerdict } from "@/components/ai-verdict";
import { Button } from "@/components/ui/button";
import { hashFile, formatBytes, fileToDataUrl, truncateHash } from "@/lib/media";
import { readOnChainRecord, EXPLORER, getRegistryAddress } from "@/lib/chain";
import { analyzeMedia, type DeepfakeAnalysis } from "@/lib/analysis.functions";
import { supabase } from "@/integrations/supabase/client";
import { ORIGIN_LABEL } from "@/lib/origin";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): { hash?: string } =>
    typeof search['hash'] === "string" ? { hash: search['hash'] as string } : {},

  head: () => ({
    meta: [
      { title: "Verify media provenance — Deepfake & origin check" },
      {
        name: "description",
        content:
          "Fingerprint any image, video or audio in your browser, match it against the on-chain provenance registry, and run AI synthesis analysis.",
      },
      { property: "og:title", content: "Verify media provenance" },
      {
        property: "og:description",
        content: "Hash locally, check the on-chain registry, and run deepfake analysis.",
      },
    ],
  }),
  component: VerifyPage,
});


type DbRecord = {
  id: string;
  media_hash: string;
  origin: string;
  title: string | null;
  wallet_address: string | null;
  tx_hash: string | null;
  signature: string | null;
  created_at: string;
};

function VerifyPage() {
  const runAnalysis = useServerFn(analyzeMedia);
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [record, setRecord] = useState<DbRecord | null>(null);
  const [chainRecord, setChainRecord] = useState<Awaited<
    ReturnType<typeof readOnChainRecord>
  > | null>(null);
  const [looked, setLooked] = useState(false);
  const [analysis, setAnalysis] = useState<DeepfakeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  async function lookup(digest: string) {
    const { data } = await supabase
      .from("registrations")
      .select("id, media_hash, origin, title, wallet_address, tx_hash, signature, created_at")
      .eq("media_hash", digest)
      .maybeSingle();
    setRecord((data as DbRecord | null) ?? null);
    if (getRegistryAddress()) {
      setChainRecord(await readOnChainRecord(digest as Hex));
    }
    setLooked(true);
  }

  useEffect(() => {
    const incoming = search.hash;
    if (!incoming) return;
    setFile(null);
    setHash(incoming);
    setHashing(true);
    lookup(incoming).finally(() => setHashing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.hash]);

  async function onFile(next: File) {
    reset();
    setFile(next);
    setHashing(true);
    try {
      const digest = await hashFile(next);
      setHash(digest);
      await lookup(digest);
    } finally {
      setHashing(false);
    }
  }


  function reset() {
    setFile(null);
    setHash(null);
    setRecord(null);
    setChainRecord(null);
    setLooked(false);
    setAnalysis(null);
    setAnalysisError(null);
    if (search.hash) navigate({ to: "/verify", search: {} });
  }


  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await runAnalysis({
        data: { dataUrl, mimeType: file.type, fileName: file.name },
      });
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  const status = !looked ? null : record ? "found" : "unknown";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="label-mono">Verification terminal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Check a file's provenance</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The file never leaves your device for fingerprinting — only the SHA-256 digest is matched
          against the registry. Optional AI analysis sends the image to the analysis model.
        </p>
      </header>

      {!file && !hash && <MediaDropzone onFile={onFile} />}

      {hashing && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-6 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Resolving SHA-256 fingerprint…
        </div>
      )}

      {hash && (
        <div className="space-y-5">
          <div
            className={`flex items-start gap-3 rounded-md border px-4 py-4 ${
              status === "found"
                ? "border-primary/40 bg-primary/5"
                : "border-warning/40 bg-warning/5"
            }`}
          >
            {status === "found" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            ) : (
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-mono text-sm uppercase tracking-[0.16em]">
                {status === "found" ? "Registered media" : "No registry match"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status === "found"
                  ? `This fingerprint was registered as ${ORIGIN_LABEL[record!.origin] ?? record!.origin} by its creator.`
                  : "This fingerprint is not in the registry. That means unregistered — not necessarily fake. Re-encoding, cropping or compressing a file changes its fingerprint."}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> New file
            </Button>
          </div>

          <EvidencePanel title="File fingerprint">
            <EvidenceRow label="File" value={file ? file.name : "Looked up by hash"} mono={false} />
            {file && (
              <EvidenceRow
                label="Type / size"
                value={`${file.type || "unknown"} · ${formatBytes(file.size)}`}
              />
            )}
            <EvidenceRow label="SHA-256" value={hash} tone={status === "found" ? "good" : "default"} />
          </EvidencePanel>


          {record && (
            <EvidencePanel title="Registry record">
              <EvidenceRow label="Declared origin" value={ORIGIN_LABEL[record.origin] ?? record.origin} mono={false} tone={record.origin === "human" ? "good" : "warn"} />
              <EvidenceRow label="Title" value={record.title || "—"} mono={false} />
              <EvidenceRow label="Creator wallet" value={record.wallet_address || "—"} />
              <EvidenceRow label="Signature" value={record.signature ? truncateHash(record.signature, 20, 12) : "—"} />
              <EvidenceRow
                label="Anchored tx"
                value={
                  record.tx_hash ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={`${EXPLORER}/tx/${record.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {truncateHash(record.tx_hash, 18, 10)}
                    </a>
                  ) : (
                    "Not anchored on-chain"
                  )
                }
              />
              <EvidenceRow label="Registered" value={new Date(record.created_at).toUTCString()} />
              <EvidenceRow
                label="Detail"
                value={
                  <Link
                    to="/record/$hash"
                    params={{ hash: record.media_hash }}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open full record →
                  </Link>
                }
                mono={false}
              />
            </EvidencePanel>
          )}

          {record && (
            <SignatureEvidence
              record={{
                mediaHash: record.media_hash,
                origin: record.origin,
                title: record.title,
                walletAddress: record.wallet_address,
                signature: record.signature,
              }}
            />
          )}

          {record && (
            <EvidenceTimeline
              record={{
                mediaHash: record.media_hash,
                origin: record.origin,
                title: record.title,
                walletAddress: record.wallet_address,
                signature: record.signature,
              }}
              registeredAt={record.created_at}
              txHash={record.tx_hash}
            />
          )}





          {chainRecord && (
            <EvidencePanel title="On-chain confirmation">
              <EvidenceRow label="Contract creator" value={chainRecord.creator} tone="good" />
              <EvidenceRow label="Origin code" value={String(chainRecord.originType)} />
              <EvidenceRow
                label="Block timestamp"
                value={new Date(chainRecord.timestamp * 1000).toUTCString()}
              />
            </EvidencePanel>
          )}

          <AiVerdict
            analysis={analysis}
            loading={analyzing}
            error={analysisError}
            onRun={analyze}
            disabled={analyzing || !file}
          />

          <div className="flex items-start gap-2 rounded-md border border-border bg-panel px-4 py-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p>
              A registry match proves who signed this exact byte sequence and what they declared —
              not that the content is truthful. Absence of a match proves nothing on its own.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
