import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";

export const CHAIN = baseSepolia;
export const EXPLORER = "https://sepolia.basescan.org";

/** MediaRegistry — deployed by the project owner on Base Sepolia. */
export const REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "mediaHash", type: "bytes32" },
      { name: "originType", type: "uint8" },
      { name: "metaURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "records",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "originType", type: "uint8" },
      { name: "timestamp", type: "uint64" },
      { name: "metaURI", type: "string" },
    ],
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "mediaHash", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "originType", type: "uint8", indexed: false },
      { name: "metaURI", type: "string", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
] as const;


const ADDRESS_STORAGE_KEY = "provenance.registry.address";
const ENV_ADDRESS = (import.meta.env["VITE_REGISTRY_ADDRESS"] as string | undefined)?.trim();

export function getRegistryAddress(): Address | null {
  const stored =
    typeof window !== "undefined" ? window.localStorage.getItem(ADDRESS_STORAGE_KEY) : null;
  const value = (stored || ENV_ADDRESS || "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

export function setRegistryAddress(value: string) {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (!trimmed) window.localStorage.removeItem(ADDRESS_STORAGE_KEY);
  else window.localStorage.setItem(ADDRESS_STORAGE_KEY, trimmed);
}

export const publicClient = createPublicClient({ chain: CHAIN, transport: http() });

type Ethereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

export function getEthereum(): Ethereum | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Ethereum }).ethereum ?? null;
}

export function getWalletClient() {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error("No browser wallet detected. Install MetaMask to continue.");
  return createWalletClient({ chain: CHAIN, transport: custom(ethereum) });
}

export async function connectWallet(): Promise<Address> {
  const client = getWalletClient();
  const [account] = await client.requestAddresses();
  if (!account) throw new Error("No account authorized in the wallet.");
  await ensureChain();
  return account;
}

export async function ensureChain() {
  const ethereum = getEthereum();
  if (!ethereum) return;
  const hexId = `0x${CHAIN.id.toString(16)}`;
  const current = (await ethereum.request({ method: "eth_chainId" })) as string;
  if (current?.toLowerCase() === hexId) return;
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexId,
          chainName: CHAIN.name,
          nativeCurrency: CHAIN.nativeCurrency,
          rpcUrls: [CHAIN.rpcUrls.default.http[0]],
          blockExplorerUrls: [EXPLORER],
        },
      ],
    });
  }
}

export function provenanceMessage(input: {
  mediaHash: string;
  origin: string;
  address: string;
  title: string;
}) {
  return [
    "PROVENANCE ATTESTATION",
    `hash: ${input.mediaHash}`,
    `origin: ${input.origin}`,
    `title: ${input.title}`,
    `creator: ${input.address}`,
    `chain: ${CHAIN.id}`,
  ].join("\n");
}

export async function signAttestation(account: Address, message: string): Promise<Hex> {
  const client = getWalletClient();
  return client.signMessage({ account, message });
}

export const ORIGIN_CODE: Record<string, number> = {
  human: 0,
  ai_generated: 1,
  ai_assisted: 2,
};

export async function writeRegistration(input: {
  account: Address;
  mediaHash: Hex;
  origin: string;
  metaURI: string;
}): Promise<Hex> {
  const address = getRegistryAddress();
  if (!address) throw new Error("No registry contract address configured.");
  await ensureChain();
  const client = getWalletClient();
  return client.writeContract({
    address,
    abi: REGISTRY_ABI,
    functionName: "register",
    account: input.account,
    chain: CHAIN,
    args: [input.mediaHash, ORIGIN_CODE[input.origin] ?? 0, input.metaURI],
  });
}

export async function readOnChainRecord(mediaHash: Hex) {
  const address = getRegistryAddress();
  if (!address) return null;
  try {
    const result = await publicClient.readContract({
      address,
      abi: REGISTRY_ABI,
      functionName: "records",
      args: [mediaHash],
    });
    const [creator, originType, timestamp, metaURI] = result as readonly [
      Address,
      number,
      bigint,
      string,
    ];
    if (!creator || creator === "0x0000000000000000000000000000000000000000") return null;
    return { creator, originType, timestamp: Number(timestamp), metaURI };
  } catch {
    return null;
  }
}

/** Deploy a fresh MediaRegistry from the connected wallet, returning tx + address. */
export async function deployRegistry(account: Address): Promise<{ hash: Hex; address: Address }> {
  const { REGISTRY_BYTECODE } = await import("./registry-bytecode");
  await ensureChain();
  const client = getWalletClient();
  const hash = await client.deployContract({
    abi: REGISTRY_ABI,
    bytecode: REGISTRY_BYTECODE as Hex,
    account,
    chain: CHAIN,
    args: [],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("Deployment succeeded but no address was returned.");
  return { hash, address: receipt.contractAddress };
}

export type RegisteredEvent = {
  mediaHash: Hex;
  creator: Address;
  originType: number;
  metaURI: string;
  timestamp: number;
  txHash: Hex;
  blockNumber: number;
};

export const ORIGIN_FROM_CODE: Record<number, string> = {
  0: "human",
  1: "ai_generated",
  2: "ai_assisted",
};

/** Read and decode Registered events from the configured registry contract. */
export async function fetchRegisteredEvents(maxBlocks = 45_000n): Promise<RegisteredEvent[]> {
  const address = getRegistryAddress();
  if (!address) return [];
  const latest = await publicClient.getBlockNumber();
  const fromBlock = latest > maxBlocks ? latest - maxBlocks : 0n;
  const logs = await publicClient.getContractEvents({
    address,
    abi: REGISTRY_ABI,
    eventName: "Registered",
    fromBlock,
    toBlock: "latest",
  });
  return logs
    .map((log) => {
      const args = log.args as {
        mediaHash?: Hex;
        creator?: Address;
        originType?: number;
        metaURI?: string;
        timestamp?: bigint;
      };
      if (!args.mediaHash || !args.creator) return null;
      return {
        mediaHash: args.mediaHash,
        creator: args.creator,
        originType: Number(args.originType ?? 0),
        metaURI: args.metaURI ?? "",
        timestamp: Number(args.timestamp ?? 0n),
        txHash: log.transactionHash as Hex,
        blockNumber: Number(log.blockNumber ?? 0n),
      } satisfies RegisteredEvent;
    })
    .filter((e): e is RegisteredEvent => e !== null)
    .reverse();
}

/** Fetch the decoded Registered event for one fingerprint, if the registry emitted it. */
export async function fetchRegisteredEventForHash(
  mediaHash: Hex,
  maxBlocks = 45_000n,
): Promise<RegisteredEvent | null> {
  const address = getRegistryAddress();
  if (!address) return null;
  try {
    const latest = await publicClient.getBlockNumber();
    const fromBlock = latest > maxBlocks ? latest - maxBlocks : 0n;
    const logs = await publicClient.getContractEvents({
      address,
      abi: REGISTRY_ABI,
      eventName: "Registered",
      args: { mediaHash },
      fromBlock,
      toBlock: "latest",
    });
    const log = logs.at(-1);
    if (!log) return null;
    const args = log.args as {
      mediaHash?: Hex;
      creator?: Address;
      originType?: number;
      metaURI?: string;
      timestamp?: bigint;
    };
    if (!args.mediaHash || !args.creator) return null;
    return {
      mediaHash: args.mediaHash,
      creator: args.creator,
      originType: Number(args.originType ?? 0),
      metaURI: args.metaURI ?? "",
      timestamp: Number(args.timestamp ?? 0n),
      txHash: log.transactionHash as Hex,
      blockNumber: Number(log.blockNumber ?? 0n),
    } satisfies RegisteredEvent;
  } catch {
    return null;
  }
}
