import { GraduationCap, LayoutDashboard, Library, Sparkles, type LucideIcon } from "lucide-react";
import type { Screen } from "@/types/navigation";

export interface NavItem {
  key: Extract<Screen, "today" | "scheduled" | "library" | "import">;
  icon: LucideIcon;
  label: string;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { key: "today", icon: LayoutDashboard, label: "Trang chủ" },
  { key: "scheduled", icon: GraduationCap, label: "Ôn tập" },
  { key: "library", icon: Library, label: "Bộ thẻ" },
  { key: "import", icon: Sparkles, label: "Nhập nhanh" },
];
