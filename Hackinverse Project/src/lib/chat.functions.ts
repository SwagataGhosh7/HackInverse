import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ChatInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      parts: z.array(z.object({ text: z.string() })),
    }),
  ),
});

const SYSTEM_PROMPT = `You are a helpful assistant for the Provenance Registry — a cryptographic media fingerprinting and deepfake verification platform built on the Base Sepolia blockchain.

You help users with:
- Understanding how media provenance works (SHA-256 hashing, on-chain anchoring)
- Registering media: uploading files, declaring origin (human / AI-generated / AI-assisted), signing with a wallet, and anchoring on-chain
- Verifying media: checking if a file's hash exists in the registry
- Dashboard and wallet setup: deploying MediaRegistry.sol, linking MetaMask
- Firebase authentication issues
- Understanding deepfake analysis scores

Keep responses concise and technical. Always prefer accuracy over brevity when explaining blockchain concepts.`;

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["VITE_GEMINI_API_KEY"] || process.env["GEMINI_API_KEY"];
    if (!key) {
      return {
        text: "Chatbot is not configured yet. Add VITE_GEMINI_API_KEY to your environment variables.",
      };
    }

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: data.messages,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text =
      json.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I couldn't generate a response.";

    return { text };
  });
