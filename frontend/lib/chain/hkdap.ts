import {
  BrowserProvider,
  Contract,
  ContractFactory,
  formatEther,
  formatUnits,
  parseUnits,
  type InterfaceAbi,
} from "ethers";
import { HKDAP_ABI, HKDAP_BYTECODE } from "./hkdapArtifact";

export const SEPOLIA_CHAIN_ID = BigInt(11155111);
export const SEPOLIA_HEX = "0xaa36a7";
// The compiled ABI JSON has a wider inferred type than InterfaceAbi; safe at runtime.
const ABI = HKDAP_ABI as unknown as InterfaceAbi;
const STORE_KEY = "payrouter.hkdap.contract";

export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export function explorerTx(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
export function explorerAddress(addr: string): string {
  return `https://sepolia.etherscan.io/address/${addr}`;
}

export function getStoredContract(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORE_KEY);
}
export function storeContract(address: string): void {
  window.localStorage.setItem(STORE_KEY, address);
}
export function clearStoredContract(): void {
  window.localStorage.removeItem(STORE_KEY);
}

function provider(): BrowserProvider {
  if (!window.ethereum) throw new Error("No wallet found");
  return new BrowserProvider(window.ethereum);
}

export interface Connection {
  address: string;
}

/** Prompt the wallet and ensure we're on Sepolia. */
export async function connect(): Promise<Connection> {
  const p = provider();
  await p.send("eth_requestAccounts", []);
  await ensureSepolia();
  const signer = await p.getSigner();
  return { address: await signer.getAddress() };
}

export async function ensureSepolia(): Promise<void> {
  const p = provider();
  const net = await p.getNetwork();
  if (net.chainId === SEPOLIA_CHAIN_ID) return;
  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX }],
    });
  } catch (err: unknown) {
    // 4902 = chain not added to wallet
    if (typeof err === "object" && err && (err as { code?: number }).code === 4902) {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export interface DeployResult {
  address: string;
  txHash?: string;
}

/** Deploy the mock HKDAP token (constructor mints 1,000,000 to deployer). */
export async function deployAndMint(): Promise<DeployResult> {
  const p = provider();
  const signer = await p.getSigner();
  const factory = new ContractFactory(ABI, HKDAP_BYTECODE, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  storeContract(address);
  return { address, txHash: contract.deploymentTransaction()?.hash };
}

/** Owner faucet — mint `amount` (human units) to `to`. */
export async function mint(contractAddress: string, to: string, amount: string): Promise<string> {
  const p = provider();
  const signer = await p.getSigner();
  const c = new Contract(contractAddress, ABI, signer);
  const tx = await c.mint(to, parseUnits(amount, 18));
  await tx.wait();
  return tx.hash;
}

/** Transfer `amount` (human units) of HKDAP to `to`. Returns the tx hash. */
export async function transfer(
  contractAddress: string,
  to: string,
  amount: string,
): Promise<string> {
  const p = provider();
  const signer = await p.getSigner();
  const c = new Contract(contractAddress, ABI, signer);
  const tx = await c.transfer(to, parseUnits(amount, 18));
  await tx.wait();
  return tx.hash;
}

export interface Balances {
  eth: string;
  hkdap: string;
  totalSupply: string;
}

/** Read live balances from Sepolia via the wallet provider. */
export async function getBalances(contractAddress: string, address: string): Promise<Balances> {
  const p = provider();
  const c = new Contract(contractAddress, ABI, p);
  const [eth, bal, supply] = await Promise.all([
    p.getBalance(address),
    c.balanceOf(address) as Promise<bigint>,
    c.totalSupply() as Promise<bigint>,
  ]);
  return {
    eth: Number(formatEther(eth)).toFixed(4),
    hkdap: Number(formatUnits(bal, 18)).toLocaleString("en-HK"),
    totalSupply: Number(formatUnits(supply, 18)).toLocaleString("en-HK"),
  };
}
