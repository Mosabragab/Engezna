import type { RetentionSettings } from './types';
import { getDefaultSettings } from './helpers';

export interface MysteryBoxPrize {
  type: 'discount_code' | 'free_delivery' | 'golden_box';
  value_piasters: number;
  weight: number;
  label_ar: string;
  label_en: string;
  is_rare: boolean;
}

const DEFAULT_PRIZES: MysteryBoxPrize[] = [
  {
    type: 'discount_code',
    value_piasters: 500,
    weight: 40,
    label_ar: 'خصم ٥ ج.م',
    label_en: '5 EGP Discount',
    is_rare: false,
  },
  {
    type: 'discount_code',
    value_piasters: 1000,
    weight: 25,
    label_ar: 'خصم ١٠ ج.م',
    label_en: '10 EGP Discount',
    is_rare: false,
  },
  {
    type: 'free_delivery',
    value_piasters: 1000,
    weight: 20,
    label_ar: 'توصيل مجاني',
    label_en: 'Free Delivery',
    is_rare: false,
  },
  {
    type: 'discount_code',
    value_piasters: 1500,
    weight: 10,
    label_ar: 'خصم ١٥ ج.م',
    label_en: '15 EGP Discount',
    is_rare: true,
  },
  {
    type: 'discount_code',
    value_piasters: 2000,
    weight: 4,
    label_ar: 'خصم ٢٠ ج.م 🎉',
    label_en: '20 EGP Discount 🎉',
    is_rare: true,
  },
  {
    type: 'golden_box',
    value_piasters: 5000,
    weight: 1,
    label_ar: 'الصندوق الذهبي! 🏆',
    label_en: 'Golden Box! 🏆',
    is_rare: true,
  },
];

export function getDefaultPrizes(): MysteryBoxPrize[] {
  return [...DEFAULT_PRIZES];
}

export function pickWeightedRandom(prizes: MysteryBoxPrize[]): MysteryBoxPrize {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const prize of prizes) {
    random -= prize.weight;
    if (random <= 0) return prize;
  }

  return prizes[0];
}

export function calculateExpectedCost(prizes: MysteryBoxPrize[]): number {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  return prizes.reduce((cost, p) => cost + (p.value_piasters * p.weight) / totalWeight, 0);
}
