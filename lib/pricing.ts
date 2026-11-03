export const PRICES = {
  RWF: {
    monthly: '100 RWF',
    annual: '100 RWF',
    monthlySub: '/month',
    annualSub: '/year · save 100 RWF',
    save: 'Save 100 RWF vs monthly',
  },
  USDT: {
    monthly: '$10',
    annual: '$99',
    monthlySub: '/month',
    annualSub: '/year · save $21',
    save: 'Save $21 USDT vs monthly',
  },
} as const;

export type Currency = keyof typeof PRICES;
