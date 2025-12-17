// lib/category-icons.tsx
import { 
  ShoppingBag, 
  Home, 
  Car, 
  Coffee, 
  Utensils,
  DollarSign,
  Briefcase,
  Heart,
  Book,
  Film,
  Gift,
  TrendingUp,
  ArrowRightLeft,
  Circle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  // Food & Dining
  'utensils': Utensils,
  'coffee': Coffee,
  
  // Shopping
  'shopping-bag': ShoppingBag,
  
  // Transportation
  'car': Car,
  
  // Housing
  'home': Home,
  
  // Income
  'dollar-sign': DollarSign,
  'briefcase': Briefcase,
  'trending-up': TrendingUp,
  
  // Others
  'heart': Heart,
  'book': Book,
  'film': Film,
  'gift': Gift,
  
  // Transfer
  'arrow-right': ArrowRightLeft,
  
  // Default
  'circle': Circle
}

export function getCategoryIcon(iconName?: string): LucideIcon {
  if (!iconName) return Circle
  return iconMap[iconName] || Circle
}