import { useCallback, useEffect, useState } from "react";
import { connectWallet, getEthereum } from "@/lib/chain";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const ethereum = getEthereum();
    setAvailable(Boolean(ethereum));
    if (!ethereum) return;
    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list?.[0]) setAddress(list[0]);
      })
      .catch(() => undefined);

    const handler = (...args: never[]) => {
      const accounts = args[0] as unknown as string[];
      setAddress(accounts?.[0] ?? null);
    };
    ethereum.on?.("accountsChanged", handler);
    return () => ethereum.removeListener?.("accountsChanged", handler);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const account = await connectWallet();
      setAddress(account);
      return account;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet connection failed.";
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  return { address, connect, connecting, error, available };
}
