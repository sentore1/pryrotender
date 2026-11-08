export const PRICES = {
  RWF: {
    monthly: '15,000 RWF',
    annual: '165,000 RWF',
    monthlySub: '/month',
    annualSub: '/year · save 15,000 RWF',
    save: 'Save 15,000 RWF (1 month free)',
  },
  USDT: {
    monthly: '$10',
    annual: '$112',
    monthlySub: '/month',
    annualSub: '/year · save $8',
    save: 'Save $8 vs monthly',
  },
} as const;

export type Currency = keyof typeof PRICES;
