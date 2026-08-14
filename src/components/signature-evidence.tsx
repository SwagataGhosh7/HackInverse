import { useEffect, useState } from "react";
import { CheckCircle2, HelpCircle, ShieldAlert, Loader2 } from "lucide-react";
import { EvidencePanel, EvidenceRow } from "@/components/evidence";
import { auditRecord, type AuditInput, type SignatureAudit } from "@/lib/signature";
import { ORIGIN_LABEL } from "@/lib/origin";
import { truncateHash } from "@/lib/media";
import { cn } from "@/lib/utils";

function Verdict({
  state,
  good,
  bad,
  unknown,
}: {
  state: boolean | null;
  good: string;
  bad: string;
  unknown: string;
}) {
  const Icon = state === null ? HelpCircle : state ? CheckCircle2 : ShieldAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        state === null ? "text-muted-foreground" : state ? "text-primary" : "text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {state === null ? unknown : state ? good : bad}
    </span>
  );
}

export function SignatureEvidence({ record }: { record: AuditInput }) {
  const [audit, setAudit] = useState<SignatureAudit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    auditRecord(record)
      .then((result) => {
        if (active) setAudit(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.mediaHash, record.origin, record.walletAddress, record.signature, record.title]);

  return (
    <EvidencePanel title="Signature evidence">
      {loading && !audit ? (
        <div className="flex items-center gap-2 py-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Recovering signer…
        </div>
      ) : (
        <>
          <EvidenceRow label="Signing wallet" value={record.walletAddress || "—"} />
          <EvidenceRow
            label="Signature"
            value={record.signature ? truncateHash(record.signature, 24, 14) : "Not signed"}
          />
          <EvidenceRow
            label="Recovered signer"
            value={audit?.recovered ?? "Not recoverable"}
            tone={audit?.signatureValid === false ? "bad" : "default"}
          />
          <EvidenceRow
            label="Signature check"
            mono={false}
            value={
              <Verdict
                state={audit?.signatureValid ?? null}
                good="Valid — signature recovers to the stated wallet"
                bad="Invalid — signer does not match the stated wallet"
                unknown="No signature stored for this record"
              />
            }
          />
          <EvidenceRow
            label="Declared origin"
            mono={false}
            value={ORIGIN_LABEL[record.origin] ?? record.origin}
          />
          <EvidenceRow
            label="On-chain origin"
            mono={false}
            value={
              audit?.onChain
                ? (ORIGIN_LABEL[audit.onChain.origin] ?? audit.onChain.origin)
                : "No on-chain record found"
            }
          />
          <EvidenceRow
            label="Origin match"
            mono={false}
            value={
              <Verdict
                state={audit?.originMatch ?? null}
                good="Matches the on-chain declaration"
                bad="Conflict — on-chain declaration differs"
                unknown="Not anchored or registry not configured"
              />
            }
          />
          <EvidenceRow
            label="Creator match"
            mono={false}
            value={
              <Verdict
                state={audit?.creatorMatch ?? null}
                good="On-chain creator equals the signing wallet"
                bad="On-chain creator differs from the signing wallet"
                unknown="No on-chain creator to compare"
              />
            }
          />
        </>
      )}
    </EvidencePanel>
  );
}
