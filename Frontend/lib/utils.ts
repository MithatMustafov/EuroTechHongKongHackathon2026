import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HKD = new Intl.NumberFormat("en-HK", { maximumFractionDigits: 0 });

export function formatAmount(amount: number, currency: string) {
  return `${currency} ${HKD.format(amount)}`;
}
