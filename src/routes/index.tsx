import { createFileRoute, Link } from "@tanstack/react-router";
import { Fingerprint, Link2, ScanSearch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Provenance Registry — Verify AI vs human-created media" },
      {
        name: "description",
        content:
          "Fingerprint media in your browser, anchor signed origin declarations on Base Sepolia, and check any file against the public deepfake provenance registry.",
      },
      { property: "og:title", content: "Provenance Registry — Verify AI vs human media" },
      {
        property: "og:description",
        content:
          "Cryptographic signatures plus on-chain hashes to prove whether media was AI-generated or human-created.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: Fingerprint,
    title: "Fingerprint locally",
    body: "SHA-256 is computed in your browser. The file itself never leaves your device.",
  },
  {
    icon: ShieldCheck,
    title: "Sign the declaration",
    body: "Your wallet signs the hash plus an origin declaration: human, AI-assisted or AI-generated.",
  },
  {
    icon: Link2,
    title: "Anchor on-chain",
    body: "The fingerprint is written to a Base Sepolia registry contract with an immutable timestamp.",
  },
  {
    icon: ScanSearch,
    title: "Verify anywhere",
    body: "Anyone can re-hash a file, match it against the registry and run synthesis analysis.",
  },
];

function Index() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-field" aria-hidden />
        <div className="pointer-events-none absolute inset-0 scanlines" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-24">
          <p className="label-mono text-primary">Base Sepolia · public registry</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
            Prove what's real.
            <span className="block text-muted-foreground">Anchor it before it spreads.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Cryptographic provenance for digital media. Creators sign a fingerprint and declare
            whether their work is human-made or AI-generated; anyone can verify a file against the
            on-chain record and run deepfake analysis on top.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/verify">Verify a file</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Register your media</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="label-mono">Chain of custody</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {steps.map((step, i) => (
            <article key={step.title} className="bg-card p-6">
              <div className="flex items-center gap-3">
                <step.icon className="h-4 w-4 text-primary" aria-hidden />
                <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-mono text-sm uppercase tracking-[0.14em]">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="rounded-md border border-border bg-panel px-6 py-8">
          <h2 className="font-mono text-sm uppercase tracking-[0.16em]">What this does not claim</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            A registry match proves a specific wallet signed a specific byte sequence and declared
            its origin. It does not prove the content is truthful, and an unmatched file is simply
            unregistered — re-encoding or cropping changes the fingerprint. AI analysis is a
            probabilistic signal, treated here as evidence rather than proof.
          </p>
          <Link
            to="/explorer"
            className="mt-5 inline-block font-mono text-xs tracking-[0.14em] text-primary uppercase underline-offset-4 hover:underline"
          >
            Browse the registry →
          </Link>
        </div>
      </section>
    </main>
  );
}
