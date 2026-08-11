import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Wallet } from "lucide-react";
import type { Hex } from "viem";
import { MediaDropzone } from "@/components/media-dropzone";
import { EvidencePanel, EvidenceRow } from "@/components/evidence";
import { AiVerdict } from "@/components/ai-verdict";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { hashFile, formatBytes, fileToDataUrl, truncateHash } from "@/lib/media";
import {
  EXPLORER,
  getRegistryAddress,
  provenanceMessage,
  signAttestation,
  writeRegistration,
} from "@/lib/chain";
import { analyzeMedia, type DeepfakeAnalysis } from "@/lib/analysis.functions";
import { ORIGIN_OPTIONS } from "@/lib/origin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/register")({
  head: () => ({
    meta: [
      { title: "Register media — Sign and anchor provenance" },
      {
        name: "description",
        content:
          "Fingerprint your media, declare whether it is human-created or AI-generated, sign it with your wallet and anchor it on Base Sepolia.",
      },
      { property: "og:title", content: "Register media provenance" },
      {
        property: "og:description",
        content: "Sign your media fingerprint and anchor the declaration on-chain.",
      },
    ],
  }),
  component: RegisterPage,
});

type Step = "file" | "declare" | "sign" | "done";

function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wallet = useWallet();
  const runAnalysis = useServerFn(analyzeMedia);

  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState<string>("human");
  const [toolName, setToolName] = useState("");

  const [analysis, setAnalysis] = useState<DeepfakeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function onFile(next: File) {
    setBusy(true);
    try {
      const digest = await hashFile(next);
      const { data: existing } = await supabase
        .from("registrations")
        .select("media_hash")
        .eq("media_hash", digest)
        .maybeSingle();
      if (existing) {
        toast.error("This exact file is already registered.");
        navigate({ to: "/record/$hash", params: { hash: digest } });
        return;
      }
      setFile(next);
      setHash(digest);
      setTitle(next.name.replace(/\.[^.]+$/, ""));
      setStep("declare");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setAnalysis(await runAnalysis({ data: { dataUrl, mimeType: file.type, fileName: file.name } }));
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function signAndRegister() {
    if (!file || !hash || !user) return;
    const address = wallet.address ?? (await wallet.connect());
    setBusy(true);
    try {
      const message = provenanceMessage({ mediaHash: hash, origin, address, title });
      const sig = await signAttestation(address as Hex, message);
      setSignature(sig);

      let tx: string | null = null;
      if (getRegistryAddress()) {
        try {
          tx = await writeRegistration({
            account: address as Hex,
            mediaHash: hash as Hex,
            origin,
            metaURI: title.slice(0, 120),
          });
          setTxHash(tx);
        } catch (err) {
          toast.warning(
            err instanceof Error
              ? `On-chain anchoring skipped: ${err.message}`
              : "On-chain anchoring skipped.",
          );
        }
      } else {
        toast.info("No registry contract configured — saved with signature only.");
      }

      const { error } = await supabase.from("registrations").insert({
        user_id: user.id,
        media_hash: hash,
        origin: origin as "human" | "ai_generated" | "ai_assisted",
        title: title || file.name,
        description: description || null,
        media_type: file.type || null,
        file_name: file.name,
        file_size: file.size,
        tool_name: toolName || null,
        wallet_address: address,
        signature: sig,
        signed_message: message,
        tx_hash: tx,
        status: tx ? "confirmed" : "pending",
        ai_score: analysis && analysis.score >= 0 ? analysis.score : null,
        ai_summary: analysis?.verdict ?? null,
      });
      if (error) throw error;

      await supabase
        .from("wallets")
        .upsert({ user_id: user.id, address }, { onConflict: "address" });

      setStep("done");
      toast.success("Media registered.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="label-mono">Chain of custody</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Register media</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Hash locally, declare the origin, sign with your wallet, anchor on Base Sepolia. Your file
          is never uploaded.
        </p>
      </header>

      <ol className="mb-8 flex flex-wrap gap-2">
        {(["file", "declare", "sign", "done"] as Step[]).map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em]",
              step === s ? "border-primary text-primary" : "text-muted-foreground",
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === "file" && (
        <>
          <MediaDropzone onFile={onFile} disabled={busy} label="Drop the original file" />
          {busy && (
            <p className="mt-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Fingerprinting…
            </p>
          )}
        </>
      )}

      {step !== "file" && file && hash && (
        <div className="space-y-5">
          <EvidencePanel title="Fingerprint">
            <EvidenceRow label="File" value={file.name} mono={false} />
            <EvidenceRow label="Type / size" value={`${file.type || "unknown"} · ${formatBytes(file.size)}`} />
            <EvidenceRow label="SHA-256" value={hash} tone="good" />
          </EvidencePanel>

          {step === "declare" && (
            <>
              <EvidencePanel title="Declaration">
                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="label-mono">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      maxLength={140}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="desc" className="label-mono">
                      Context (optional)
                    </Label>
                    <Textarea
                      id="desc"
                      rows={3}
                      maxLength={1000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Where and when it was captured or produced."
                    />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="label-mono mb-2">Origin declaration</legend>
                    {ORIGIN_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setOrigin(option.value)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 rounded border px-3 py-2.5 text-left transition-colors",
                          origin === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-panel",
                        )}
                      >
                        <span className="font-mono text-xs uppercase tracking-[0.14em]">
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{option.hint}</span>
                      </button>
                    ))}
                  </fieldset>
                  {origin !== "human" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="tool" className="label-mono">
                        Model / tool used
                      </Label>
                      <Input
                        id="tool"
                        value={toolName}
                        maxLength={120}
                        onChange={(e) => setToolName(e.target.value)}
                        placeholder="e.g. Midjourney v7"
                      />
                    </div>
                  )}
                </div>
              </EvidencePanel>

              <AiVerdict
                analysis={analysis}
                loading={analyzing}
                error={analysisError}
                onRun={analyze}
                disabled={analyzing}
              />

              <div className="flex justify-end">
                <Button onClick={() => setStep("sign")} disabled={!title.trim()}>
                  Continue to signing
                </Button>
              </div>
            </>
          )}

          {step === "sign" && (
            <EvidencePanel title="Wallet attestation">
              <div className="space-y-4 py-4">
                <p className="text-xs text-muted-foreground">
                  You'll sign a plain-text attestation binding your wallet to this fingerprint and
                  origin declaration, then submit the anchoring transaction on Base Sepolia.
                </p>
                {!wallet.available && (
                  <p className="text-xs text-destructive">
                    No browser wallet detected. Install MetaMask to sign.
                  </p>
                )}
                {wallet.error && <p className="text-xs text-destructive">{wallet.error}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => wallet.connect()}
                    disabled={!wallet.available || wallet.connecting || Boolean(wallet.address)}
                  >
                    <Wallet className="h-4 w-4" />
                    {wallet.address ? truncateHash(wallet.address, 6, 4) : "Connect wallet"}
                  </Button>
                  <Button onClick={signAndRegister} disabled={busy || !wallet.available}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sign & register
                  </Button>
                  <Button variant="ghost" onClick={() => setStep("declare")} disabled={busy}>
                    Back
                  </Button>
                </div>
              </div>
            </EvidencePanel>
          )}

          {step === "done" && (
            <EvidencePanel title="Registered">
              <div className="space-y-3 py-4">
                <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-primary">
                  <Check className="h-4 w-4" /> Attestation recorded
                </p>
                <EvidenceRow label="Signature" value={signature ?? "—"} />
                <EvidenceRow
                  label="Transaction"
                  value={
                    txHash ? (
                      <a
                        href={`${EXPLORER}/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {truncateHash(txHash, 22, 12)}
                      </a>
                    ) : (
                      "Signed only — not anchored on-chain"
                    )
                  }
                />
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => navigate({ to: "/record/$hash", params: { hash } })}>
                    View record
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Register another
                  </Button>
                </div>
              </div>
            </EvidencePanel>
          )}
        </div>
      )}
    </main>
  );
}
