import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeInput = z.object({
  dataUrl: z.string().min(16),
  mimeType: z.string().min(1),
  fileName: z.string().max(300).optional(),
});

export type DeepfakeAnalysis = {
  score: number;
  verdict: string;
  reasons: string[];
  caveat: string;
};

export const analyzeMedia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<DeepfakeAnalysis> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    if (!data.mimeType.startsWith("image/")) {
      return {
        score: -1,
        verdict: "unsupported",
        reasons: [
          "Automated synthesis analysis currently supports still images only.",
          "Video and audio can still be fingerprinted and anchored on-chain.",
        ],
        caveat: "Cryptographic provenance is unaffected by this limitation.",
      };
    }

    const body = {
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages: [
        {
          role: "system",
          content:
            "You are a forensic media analyst. Estimate the likelihood that an image was produced or heavily altered by a generative model. Respond ONLY with compact JSON: {\"score\": <integer 0-100>, \"verdict\": \"likely human\"|\"uncertain\"|\"likely AI-generated\", \"reasons\": [3 short strings]}. Judge lighting consistency, anatomy, text rendering, texture repetition, edge artifacts, and depth-of-field plausibility.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this media${data.fileName ? ` (${data.fileName})` : ""}.`,
            },
            { type: "image_url", image_url: { url: data.dataUrl } },
          ],
        },
      ],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) throw new Error("Analysis rate limit reached. Try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted for this workspace.");
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Analysis failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);

    let parsed: { score?: number; verdict?: string; reasons?: string[] } = {};
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = {};
      }
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 50))));
    return {
      score,
      verdict:
        parsed.verdict ??
        (score >= 65 ? "likely AI-generated" : score <= 35 ? "likely human" : "uncertain"),
      reasons: (parsed.reasons ?? ["No detailed reasoning returned."]).slice(0, 4),
      caveat:
        "Heuristic signal only. Detection models are probabilistic and can be fooled — treat this as evidence, not proof.",
    };
  });
