import React from "react";
import { AlertTriangle } from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const styles = {
  yellow: "border-yellow-400 bg-yellow-100 text-yellow-900 dark:bg-yellow-400/15 dark:text-yellow-200",
  orange: "border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200",
  red: "border-red-600 bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200",
};

export default function LossFlagBadge({ flag, compact = false }) {
  const { isArabic } = usePreferences();
  if (!styles[flag]) return null;
  const names = isArabic
    ? { yellow: "خسائر 20%–35%", orange: "خسائر 35%–50%", red: "خسائر 50% فأكثر" }
    : { yellow: "Losses 20%–35%", orange: "Losses 35%–50%", red: "Losses 50%+" };
  return <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-1 font-bold " + (compact ? "text-[10px] " : "text-xs ") + styles[flag]}><AlertTriangle size={compact ? 11 : 13} />{names[flag]}</span>;
}
