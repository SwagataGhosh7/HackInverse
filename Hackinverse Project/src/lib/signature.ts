import { recoverMessageAddress, type Address, type Hex } from "viem";
import { ORIGIN_FROM_CODE, provenanceMessage, readOnChainRecord } from "./chain";

export type SignatureAudit = {
  /** Address recovered from the stored signature, if recoverable. */
  recovered: Address | null;
  /** Signature recovers to the wallet stored alongside the record. */
  signatureValid: boolean | null;
  /** Message that was signed (reconstructed from the record). */
  message: string | null;
  onChain: {
    creator: Address;
    originType: number;
    origin: string;
    timestamp: number;
  } | null;
  /** On-chain creator equals the signing wallet. */
  creatorMatch: boolean | null;
  /** On-chain origin code equals the declared origin. */
  originMatch: boolean | null;
};

export type AuditInput = {
  mediaHash: string;
  origin: string;
  title?: string | null;
  walletAddress?: string | null;
  signature?: string | null;
};

export async function auditRecord(input: AuditInput): Promise<SignatureAudit> {
  const audit: SignatureAudit = {
    recovered: null,
    signatureValid: null,
    message: null,
    onChain: null,
    creatorMatch: null,
    originMatch: null,
  };

  if (input.signature && input.walletAddress) {
    const message = provenanceMessage({
      mediaHash: input.mediaHash,
      origin: input.origin,
      address: input.walletAddress,
      title: input.title ?? "",
    });
    audit.message = message;
    try {
      const recovered = await recoverMessageAddress({
        message,
        signature: input.signature as Hex,
      });
      audit.recovered = recovered;
      audit.signatureValid = recovered.toLowerCase() === input.walletAddress.toLowerCase();
    } catch {
      audit.signatureValid = false;
    }
  }

  try {
    const record = await readOnChainRecord(input.mediaHash as Hex);
    if (record) {
      const origin = ORIGIN_FROM_CODE[record.originType] ?? String(record.originType);
      audit.onChain = {
        creator: record.creator,
        originType: record.originType,
        origin,
        timestamp: record.timestamp,
      };
      audit.originMatch = origin === input.origin;
      if (input.walletAddress) {
        audit.creatorMatch = record.creator.toLowerCase() === input.walletAddress.toLowerCase();
      }
    }
  } catch {
    /* chain unreachable — leave on-chain fields null */
  }

  return audit;
}
