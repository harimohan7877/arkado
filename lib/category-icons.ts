import type { ComponentType, SVGProps } from "react";
import {
  BookOpenIcon,
  FileTextIcon,
  GraduationCapIcon,
  HeartIcon,
  LandmarkIcon,
  MapPinIcon,
  PackageIcon,
  SettingsIcon,
  ShieldIcon,
  TrainIcon,
} from "@/components/icons";

/**
 * Phase 1 (item 6): one small line icon per exam category, shared by the
 * hero's POPULAR CHOICES chips and the CategoriesSection cards. Icons come
 * from the house library (components/icons.tsx) only — no new dependency,
 * no emoji. Unknown ids fall back to FileTextIcon (exam papers).
 */
export type CategoryIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number }
>;

export const CATEGORY_ICONS: Record<string, CategoryIconComponent> = {
  // National exams
  ssc: BookOpenIcon,
  railways: TrainIcon,
  banking: LandmarkIcon,
  upsc: FileTextIcon,
  defence: ShieldIcon,
  // Teaching
  central_teaching: GraduationCapIcon,
  // States — one map pin for every state category
  rajasthan: MapPinIcon,
  uttar_pradesh: MapPinIcon,
  bihar: MapPinIcon,
  madhya_pradesh: MapPinIcon,
  delhi: MapPinIcon,
  haryana: MapPinIcon,
  maharashtra: MapPinIcon,
  gujarat: MapPinIcon,
  jharkhand: MapPinIcon,
  uttarakhand: MapPinIcon,
  chhattisgarh: MapPinIcon,
  // Other services
  engineering_psu: SettingsIcon,
  medical_nursing: HeartIcon,
  postal_fci: PackageIcon,
  epfo_esic_courts: LandmarkIcon,
};

export function categoryIconFor(categoryId: string): CategoryIconComponent {
  return CATEGORY_ICONS[categoryId] ?? FileTextIcon;
}
