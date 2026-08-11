import { Loader2, Sparkles } from "lucide-react";
import type { DeepfakeAnalysis } from "@/lib/analysis.functions";
import { EvidencePanel } from "@/components/evidence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiVerdict({
  analysis,
  loading,
  error,
  onRun,
  disabled,
}: {
  analysis: DeepfakeAnalysis | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
  disabled?: boolean;
}) {
  return (
    <EvidencePanel title="AI synthesis analysis">
      {!analysis && !loading && (
        <div className="flex flex-col gap-3 py-4">
          <p className="text-xs text-muted-foreground">
            Run a heuristic check for generative-model artefacts. Independent of the on-chain
            record.
          </p>
          <Button size="sm" variant="outline" onClick={onRun} disabled={disabled}>
            <Sparkles className="h-4 w-4" /> Run analysis
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-6 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing frames…
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-3 py-4">
          {analysis.score >= 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="label-mono">Synthetic likelihood</span>
                <span
                  className={cn(
                    "font-mono text-2xl",
                    analysis.score >= 65
                      ? "text-destructive"
                      : analysis.score <= 35
                        ? "text-primary"
                        : "text-warning",
                  )}
                >
                  {analysis.score}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    analysis.score >= 65
                      ? "bg-destructive"
                      : analysis.score <= 35
                        ? "bg-primary"
                        : "bg-warning",
                  )}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
            </div>
          )}
          <p className="font-mono text-xs uppercase tracking-[0.16em]">{analysis.verdict}</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {analysis.reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden className="text-primary">
                  ›
                </span>
                {reason}
              </li>
            ))}
          </ul>
          <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
            {analysis.caveat}
          </p>
        </div>
      )}
    </EvidencePanel>
  );
}
