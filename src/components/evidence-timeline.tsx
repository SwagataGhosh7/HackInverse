import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, ShieldAlert } from "lucide-react";
import { EXPLORER, fetchRegisteredEventForHash, type RegisteredEvent } from "@/lib/chain";
import { auditRecord, type AuditInput, type SignatureAudit } from "@/lib/signature";
import { ORIGIN_LABEL } from "@/lib/origin";
import { truncateHash } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Hex } from "viem";

type Tone = "good" | "bad" | "idle";

function Step({
  index,
  title,
  tone,
  time,
  children,
  last,
}: {
  index: number;
  title: string;
  tone: Tone;
  time?: string | null;
  children: React.ReactNode;
  last?: boolean;
}) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "bad" ? ShieldAlert : CircleDashed;
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && (
        <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" aria-hidden />
      )}
      <Icon
        className={cn(
          "relative z-10 mt-0.5 h-[22px] w-[22px] shrink-0 bg-card",
          tone === "good" && "text-primary",
          tone === "bad" && "text-destructive",
          tone === "idle" && "text-muted-foreground",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="label-mono">
            {String(index).padStart(2, "0")} · {title}
          </span>
          {time && <span className="font-mono text-[11px] text-muted-foreground">{time}</span>}
        </div>
        <div className="mt-1.5 space-y-1 text-sm break-all">{children}</div>
      </div>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-mono uppercase tracking-[0.12em]">{label}:</span>{" "}
      <span className="text-foreground">{value}</span>
    </p>
  );
}

export function EvidenceTimeline({
  record,
  registeredAt,
  txHash,
}: {
  record: AuditInput;
  registeredAt?: string | null;
  txHash?: string | null;
}) {
  const [audit, setAudit] = useState<SignatureAudit | null>(null);
  const [event, setEvent] = useState<RegisteredEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      auditRecord(record),
      fetchRegisteredEventForHash(record.mediaHash as Hex),
    ])
      .then(([nextAudit, nextEvent]) => {
        if (!active) return;
        setAudit(nextAudit);
        setEvent(nextEvent);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.mediaHash, record.origin, record.walletAddress, record.signature, record.title]);

  const anchored = Boolean(txHash || event || audit?.onChain);
  const conflict = audit?.signatureValid === false || audit?.originMatch === false || audit?.creatorMatch === false;
  const verdictTone: Tone = conflict ? "bad" : audit?.signatureValid && anchored ? "good" : "idle";
  const verdictLine = conflict
    ? "Conflicting evidence — the signature or the on-chain declaration does not line up."
    : audit?.signatureValid && anchored
      ? "Consistent chain of evidence: signer recovered, anchored on-chain, origin declarations agree."
      : audit?.signatureValid
        ? "Signature is valid, but the claim is not anchored on-chain."
        : "Insufficient evidence to link a signer to an on-chain declaration.";

  const eventOrigin = event ? (ORIGIN_LABEL[audit?.onChain?.origin ?? ""] ?? null) : null;

  return (
    <section className="rounded-md border border-border bg-card">
      <header className="border-b border-border px-4 py-2.5">
        <h2 className="label-mono">Evidence timeline</h2>
      </header>
      <div className="px-4 py-5">
        {loading ? (
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Correlating signature and chain evidence…
          </div>
        ) : (
          <ol>
            <Step
              index={1}
              title="Declaration recorded"
              tone="good"
              time={registeredAt ? new Date(registeredAt).toUTCString() : null}
            >
              <Detail
                label="Declared origin"
                value={ORIGIN_LABEL[record.origin] ?? record.origin}
              />
              <Detail label="Fingerprint" value={truncateHash(record.mediaHash, 18, 12)} />
            </Step>

            <Step
              index={2}
              title="Signer recovered"
              tone={audit?.signatureValid === true ? "good" : audit?.signatureValid === false ? "bad" : "idle"}
            >
              <Detail label="Stated wallet" value={record.walletAddress || "—"} />
              <Detail label="Recovered signer" value={audit?.recovered ?? "Not recoverable"} />
              <Detail
                label="Result"
                value={
                  audit?.signatureValid === true
                    ? "Signature recovers to the stated wallet"
                    : audit?.signatureValid === false
                      ? "Signature does not match the stated wallet"
                      : "No signature stored"
                }
              />
            </Step>

            <Step
              index={3}
              title="Registered event decoded"
              tone={event ? "good" : "idle"}
              time={event?.timestamp ? new Date(event.timestamp * 1000).toUTCString() : null}
            >
              {event ? (
                <>
                  <Detail label="creator" value={event.creator} />
                  <Detail
                    label="originType"
                    value={`${event.originType}${eventOrigin ? ` · ${eventOrigin}` : ""}`}
                  />
                  <Detail label="metaURI" value={event.metaURI || "—"} />
                  <Detail label="block" value={`#${event.blockNumber}`} />
                  <Detail
                    label="tx"
                    value={
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href={`${EXPLORER}/tx/${event.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncateHash(event.txHash, 18, 10)}
                      </a>
                    }
                  />
                </>
              ) : (
                <Detail
                  label="Status"
                  value={
                    txHash
                      ? "Transaction recorded, but no matching event found in the scanned block range"
                      : "No Registered event found for this fingerprint"
                  }
                />
              )}
            </Step>

            <Step
              index={4}
              title="Anchor & origin verdict"
              tone={verdictTone}
              last
            >
              <Detail
                label="Anchor"
                value={anchored ? "Anchored on Base Sepolia" : "Signed only — no on-chain anchor"}
              />
              <Detail
                label="Origin agreement"
                value={
                  audit?.originMatch === true
                    ? "On-chain origin matches the declaration"
                    : audit?.originMatch === false
                      ? "On-chain origin conflicts with the declaration"
                      : "No on-chain origin to compare"
                }
              />
              <Detail
                label="Creator agreement"
                value={
                  audit?.creatorMatch === true
                    ? "On-chain creator equals the signing wallet"
                    : audit?.creatorMatch === false
                      ? "On-chain creator differs from the signing wallet"
                      : "No on-chain creator to compare"
                }
              />
              <p
                className={cn(
                  "mt-2 text-sm",
                  verdictTone === "good" && "text-primary",
                  verdictTone === "bad" && "text-destructive",
                  verdictTone === "idle" && "text-muted-foreground",
                )}
              >
                {verdictLine}
              </p>
            </Step>
          </ol>
        )}
      </div>
    </section>
  );
}
