export interface CreditPack {
  id: string;
  label: string;
  credits: number;
  /** Amount in paise (INR × 100). Razorpay requires paise. */
  amountPaise: number;
  /** Human-readable price, e.g. "₹99" */
  displayPrice: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_1",
    label: "Starter",
    credits: 1,
    amountPaise: 9_900,
    displayPrice: "₹99",
  },
  {
    id: "pack_5",
    label: "Creator",
    credits: 5,
    amountPaise: 39_900,
    displayPrice: "₹399",
  },
  {
    id: "pack_10",
    label: "Pro",
    credits: 10,
    amountPaise: 69_900,
    displayPrice: "₹699",
  },
  {
    id: "pack_20",
    label: "Agency",
    credits: 20,
    amountPaise: 1_19_900,
    displayPrice: "₹1199",
  },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
