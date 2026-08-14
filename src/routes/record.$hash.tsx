import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { EvidencePanel, EvidenceRow } from "@/components/evidence";
import { SignatureEvidence } from "@/components/signature-evidence";
import { EvidenceTimeline } from "@/components/evidence-timeline";


import { supabase } from "@/integrations/supabase/client";
import { EXPLORER } from "@/lib/chain";
import { truncateHash } from "@/lib/media";
import { ORIGIN_LABEL } from "@/lib/origin";

export const Route = createFileRoute("/record/$hash")({
  head: ({ params }) => {
    const short = params.hash ? `${params.hash.slice(0, 14)}…` : "record";
    return {
      meta: [
        { title: `Provenance record ${short} — Registry` },
        {
          name: "description",
          content:
            "Signed provenance attestation: declared origin, creator wallet, cryptographic signature and on-chain anchor for this media fingerprint.",
        },
        { property: "og:title", content: `Provenance record ${short}` },
        {
          property: "og:description",
          content: "Declared origin, creator signature and on-chain anchor for this fingerprint.",
        },
      ],
    };
  },
  component: RecordPage,
  notFoundComponent: RecordMissing,
});

function RecordMissing() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No record for that fingerprint</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing has been registered under this hash.
      </p>
      <Link to="/explorer" className="mt-6 inline-block text-primary underline-offset-4 hover:underline">
        Back to the registry →
      </Link>
    </main>
  );
}

type Row = {
  id: string;
  media_hash: string;
  origin: string;
  title: string | null;
  description: string | null;
  media_type: string | null;
  file_name: string | null;
  wallet_address: string | null;
  signature: string | null;
  tx_hash: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  created_at: string;
};

function RecordPage() {
  const { hash } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["record", hash],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, media_hash, origin, title, description, media_type, file_name, wallet_address, signature, tx_hash, ai_score, ai_summary, created_at",
        )
        .eq("media_hash", hash)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Row;
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Loading record…
      </main>
    );
  }
  if (!data) return <RecordMissing />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/explorer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Registry
      </Link>

      <header className="mt-4 mb-8">
        <p className="label-mono">Attestation</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {data.title || "Untitled media"}
        </h1>
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{data.media_hash}</p>
      </header>

      <div className="space-y-5">
        <EvidencePanel title="Declaration">
          <EvidenceRow
            label="Declared origin"
            value={ORIGIN_LABEL[data.origin] ?? data.origin}
            mono={false}
            tone={data.origin === "human" ? "good" : "warn"}
          />
          <EvidenceRow label="Description" value={data.description || "—"} mono={false} />
          <EvidenceRow label="Media type" value={data.media_type || "—"} />
          <EvidenceRow label="File name" value={data.file_name || "—"} mono={false} />
          <EvidenceRow label="Registered" value={new Date(data.created_at).toUTCString()} />
          {data.ai_score !== null && (
            <EvidenceRow
              label="AI likelihood"
              value={`${data.ai_score}%`}
              tone={data.ai_score >= 65 ? "bad" : data.ai_score <= 35 ? "good" : "warn"}
            />
          )}
        </EvidencePanel>

        <SignatureEvidence
          record={{
            mediaHash: data.media_hash,
            origin: data.origin,
            title: data.title,
            walletAddress: data.wallet_address,
            signature: data.signature,
          }}
        />

        <EvidenceTimeline
          record={{
            mediaHash: data.media_hash,
            origin: data.origin,
            title: data.title,
            walletAddress: data.wallet_address,
            signature: data.signature,
          }}
          registeredAt={data.created_at}
          txHash={data.tx_hash}
        />



        <EvidencePanel title="Cryptographic proof">
          <EvidenceRow label="Creator wallet" value={data.wallet_address || "—"} />
          <EvidenceRow label="Signature" value={data.signature || "—"} />
          <EvidenceRow
            label="On-chain tx"
            value={
              data.tx_hash ? (
                <a
                  href={`${EXPLORER}/tx/${data.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {truncateHash(data.tx_hash, 24, 12)}
                </a>
              ) : (
                "Not anchored"
              )
            }
          />
        </EvidencePanel>


        <p className="rounded-md border border-border bg-panel px-4 py-3 text-xs text-muted-foreground">
          This record binds a wallet signature to an exact byte-for-byte fingerprint. It attests to
          what the creator declared, not to the truthfulness of the content.
        </p>
      </div>
    </main>
  );
}
