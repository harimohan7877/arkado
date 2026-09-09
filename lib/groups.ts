import groupsData from "@/data/groups.json";
import examsData from "@/data/exams.json";
import type { Exam } from "./eligibility";

export interface Group {
  id: string;
  name: string;
  name_hi: string;
  meta_title: string;
  meta_description: string;
  logo_url: string;
  board: string;
  color: string;
  priority?: number;
  is_active?: boolean;
  exam_ids: string[];
}

const groups = groupsData as Group[];

export function getGroupById(id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}

export function getGroupByBoard(board: string): Group | undefined {
  return groups.find((g) => g.board === board);
}

export function getGroupByExamId(examId: string): Group | undefined {
  const examsList = (Array.isArray(examsData) ? examsData : (examsData as any).exams || []) as unknown as Exam[];
  const exam = examsList.find((e) => e.id === examId);
  if (!exam?.group) return;
  return getGroupById(exam.group);
}

export function getAllGroups(): Group[] {
  return groups;
}

export function getExamsByGroup(groupId: string): Exam[] {
  const group = getGroupById(groupId);
  if (!group) return [];
  const examsList = (Array.isArray(examsData) ? examsData : (examsData as any).exams || []) as unknown as Exam[];
  return examsList.filter((e) =>
    group.exam_ids.includes(e.id)
  );
}

export function getGroupInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const marketplaceGroupToId: Record<string, string> = {
  "Rajasthan RSMSSB Exams": "rsmssb",
  "Rajasthan Police & Security Exams": "rajasthan-police",
  "Rajasthan Teaching & School Exams": "rajasthan-teaching",
  "Rajasthan General Government Exams": "rpsc",
  "Rajasthan High Court & Court Exams": "rajasthan-high-court",
};

export function getGroupIdByMarketplaceName(name: string): string | undefined {
  return marketplaceGroupToId[name];
}

export function getMarketplaceGroups(): string[] {
  return Object.keys(marketplaceGroupToId);
}

export function findExamByMarketplaceName(marketplaceName: string): string | undefined {
  const exams = examsData.exams as unknown as Exam[];
  const lower = marketplaceName.toLowerCase();
  const exam = exams.find((e) =>
    lower.includes(e.short_name?.toLowerCase() ?? '') ||
    lower.includes(e.name.toLowerCase().replace("recruitment 2026", "").trim()) ||
    e.name.toLowerCase().includes(lower) ||
    e.name_hindi?.toLowerCase().includes(lower) ||
    e.short_name?.toLowerCase() === lower
  );
  return exam?.id;
}
