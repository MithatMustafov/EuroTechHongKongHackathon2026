"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Decision } from "@/lib/engine/types";
import {
  clearStoredContract,
  connect,
  deployAndMint,
  explorerAddress,
  explorerTx,
  getBalances,
  getStoredContract,
  isWalletAvailable,
  transfer,
  type Balances,
} from "@/lib/chain/hkdap";

export interface SettlementResult {
  txHash: string;
  recipient: string;
  contractAddress: string;
}

type Status = "idle" | "running" | "done" | "error";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function StablecoinSettlement({
  decision,
  onComplete,
  onFallback,
}: {
  decision: Decision;
  onComplete: (r: SettlementResult) => void;
  onFallback: () => void;
}) {
  const amount = String(decision.invoice.amount);

  const [address, setAddress] = useState<string | null>(null);
  const [contract, setContract] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);

  const [st, setSt] = useState<Record<string, Status>>({
    connect: "idle",
    provision: "idle",
    settle: "idle",
    verify: "idle",
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: Status) => setSt((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    setContract(getStoredContract());
  }, []);

  const walletMissing = typeof window !== "undefined" && !isWalletAvailable();

  async function run(key: string, fn: () => Promise<void>) {
    setError(null);
    set(key, "running");
    try {
      await fn();
      set(key, "done");
    } catch (e: unknown) {
      set(key, "error");
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg.length > 140 ? msg.slice(0, 140) + "…" : msg);
    }
  }

  const handleConnect = () =>
    run("connect", async () => {
      const { address: addr } = await connect();
      setAddress(addr);
      setRecipient((r) => r || addr);
    });

  const handleProvision = () =>
    run("provision", async () => {
      const existing = getStoredContract();
      if (existing) {
        setContract(existing);
        return;
      }
      const { address: addr, txHash: h } = await deployAndMint();
      setContract(addr);
      setDeployHash(h ?? null);
    });

  const handleRedeploy = () =>
    run("provision", async () => {
      clearStoredContract();
      const { address: addr, txHash: h } = await deployAndMint();
      setContract(addr);
      setDeployHash(h ?? null);
    });

  const handleSettle = () =>
    run("settle", async () => {
      if (!contract) throw new Error("No token contract");
      const h = await transfer(contract, recipient.trim(), amount);
      setTxHash(h);
    });

  const handleVerify = () =>
    run("verify", async () => {
      if (!contract || !address) throw new Error("Not ready");
      setBalances(await getBalances(contract, address));
    });

  if (walletMissing) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-2xl bg-warn/10 p-4">
          <p className="font-semibold text-warn">MetaMask not detected</p>
          <p className="mt-1 text-sm text-muted">
            Install MetaMask to settle live on Sepolia, or watch the simulated settlement.
          </p>
        </div>
        <button
          onClick={onFallback}
          className="w-full rounded-pill bg-ink py-3 text-sm font-semibold text-white"
        >
          Watch simulated settlement
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-brand-2/10 p-3 text-xs text-ink/80">
        Live settlement on <span className="font-semibold">Sepolia testnet</span> via MetaMask. You
        need a little test ETH for gas —{" "}
        <a className="underline" href="https://sepoliafaucet.com" target="_blank" rel="noreferrer">
          sepoliafaucet.com
        </a>
        .
      </div>

      <StepRow n={1} title="Connect wallet" status={st.connect}>
        {st.connect === "done" && address ? (
          <p className="text-xs text-muted">Connected · {short(address)}</p>
        ) : (
          <ActionButton onClick={handleConnect} status={st.connect}>
            Connect MetaMask
          </ActionButton>
        )}
      </StepRow>

      <StepRow n={2} title="Provision mock HKDAP" status={st.provision} enabled={st.connect === "done"}>
        {st.provision === "done" && contract ? (
          <p className="text-xs text-muted">
            Token{" "}
            <a className="underline" href={explorerAddress(contract)} target="_blank" rel="noreferrer">
              {short(contract)}
            </a>{" "}
            {deployHash ? "deployed" : "reused"} ·{" "}
            <button onClick={handleRedeploy} className="underline">
              redeploy
            </button>
          </p>
        ) : (
          <ActionButton onClick={handleProvision} status={st.provision} enabled={st.connect === "done"}>
            {getStoredContract() ? "Use saved token" : "Deploy + mint 1,000,000"}
          </ActionButton>
        )}
      </StepRow>

      <StepRow n={3} title={`Settle ${decision.invoice.currency} ${amount}`} status={st.settle} enabled={st.provision === "done"}>
        {st.settle === "done" && txHash ? (
          <p className="text-xs text-muted">
            Sent ·{" "}
            <a className="underline" href={explorerTx(txHash)} target="_blank" rel="noreferrer">
              view tx
            </a>
          </p>
        ) : (
          <div className="space-y-2">
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x recipient (defaults to your wallet)"
              className="w-full rounded-xl bg-white px-3 py-2 text-xs outline-none ring-1 ring-line"
            />
            <ActionButton onClick={handleSettle} status={st.settle} enabled={st.provision === "done" && recipient.trim().length === 42}>
              Send {amount} HKDAP
            </ActionButton>
          </div>
        )}
      </StepRow>

      <StepRow n={4} title="Verify on Sepolia" status={st.verify} enabled={st.settle === "done"}>
        {st.verify === "done" && balances ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="ETH" value={balances.eth} />
            <Stat label="HKDAP" value={balances.hkdap} />
            <Stat label="Supply" value={balances.totalSupply} />
          </div>
        ) : (
          <ActionButton onClick={handleVerify} status={st.verify} enabled={st.settle === "done"}>
            Read live balances
          </ActionButton>
        )}
      </StepRow>

      {error && <p className="text-xs text-danger">{error}</p>}

      {st.verify === "done" && txHash && contract && (
        <button
          onClick={() => onComplete({ txHash, recipient: recipient.trim(), contractAddress: contract })}
          className="w-full rounded-pill bg-ink py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          Generate compliance receipt
        </button>
      )}
    </div>
  );
}

function StepRow({
  n,
  title,
  status,
  enabled = true,
  children,
}: {
  n: number;
  title: string;
  status: Status;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const icon =
    status === "done" ? "✓" : status === "running" ? "" : status === "error" ? "!" : String(n);
  const bg =
    status === "done"
      ? "bg-brand-2 text-white"
      : status === "error"
        ? "bg-danger text-white"
        : enabled
          ? "bg-ink text-white"
          : "bg-line text-muted";
  return (
    <div className={`rounded-2xl border border-line bg-white p-3 ${!enabled && status === "idle" ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${bg}`}>
          {status === "running" ? (
            <motion.span
              className="block h-3 w-3 rounded-full border-2 border-white border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
          ) : (
            icon
          )}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="mt-2 pl-8">{children}</div>
    </div>
  );
}

function ActionButton({
  onClick,
  status,
  enabled = true,
  children,
}: {
  onClick: () => void;
  status: Status;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled || status === "running"}
      className="rounded-pill bg-ink px-4 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
    >
      {status === "running" ? "Confirm in MetaMask…" : status === "error" ? "Retry" : children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg px-2 py-1.5">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
