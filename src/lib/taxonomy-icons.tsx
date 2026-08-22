import {
  Utensils,
  Sparkles,
  Stethoscope,
  ShoppingBag,
  Coffee,
  Camera,
  MapPin,
  Car,
  Hotel,
  type LucideIcon,
} from "lucide-react";
import type { CategoryValue } from "./taxonomy";

export const CATEGORY_ICONS: Record<CategoryValue, LucideIcon> = {
  gourmet: Utensils,
  beauty: Sparkles,
  medical: Stethoscope,
  shopping: ShoppingBag,
  cafe: Coffee,
  tour: Camera,
  transport: Car,
  hotel: Hotel,
};

export const AreaIcon = MapPin;
