"use client";

import { getExamLabel } from "@/lib/exam-labels";

interface CategoryTabsProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  counts: Record<string, number>;
}

const EXAM_IDS = [
  "cet-grad", "cet-senior", "patwari", "ldc", "computer-instructor",
  "informatic-assistant", "junior-accountant", "police-constable", "police-si",
  "home-guard", "forest-guard", "reet-level1", "reet-level2", "bstc",
  "school-lecturer", "college-lecturer", "ssc-cgl", "ssc-chsl", "ssc-mts",
  "ssc-gd", "railway-ntpc", "railway-group-d", "upsc-cse", "rpsc-ras",
  "mppsc", "uppsc", "bpsc", "ibps-po", "ibps-clerk", "sbi-po", "sbi-clerk",
  "rbi-grade-b", "lic-aao",
];

export default function CategoryTabs({
  selectedCategory,
  onSelectCategory,
  counts,
}: CategoryTabsProps) {
  const tabs = [
    { id: "all", label: "All Bundles" },
    ...EXAM_IDS.map(id => ({ id, label: getExamLabel(id) })),
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {tabs.map((tab) => {
        const isSelected = selectedCategory === tab.id;
        const count = counts[tab.id] ?? (tab.id === "all" ? counts.total : 0);

        return (
          <button
            key={tab.id}
            onClick={() => onSelectCategory(tab.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              isSelected
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}