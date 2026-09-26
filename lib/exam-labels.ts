export const EXAM_LABELS: Record<string, string> = {
  "cet-grad": "CET Graduate",
  "cet-senior": "CET Sr. Secondary",
  "patwari": "Patwari",
  "ldc": "LDC / Jr. Assistant",
  "computer-instructor": "Computer Instructor",
  "informatic-assistant": "Informatic Assistant",
  "junior-accountant": "Jr. Accountant",
  "police-constable": "Police Constable",
  "police-si": "Police SI",
  "home-guard": "Home Guard",
  "forest-guard": "Forest Guard",
  "reet-level1": "REET Level 1",
  "reet-level2": "REET Level 2",
  "bstc": "BSTC",
  "school-lecturer": "School Lecturer",
  "college-lecturer": "College Lecturer",
  "ssc-cgl": "SSC CGL",
  "ssc-chsl": "SSC CHSL",
  "ssc-mts": "SSC MTS",
  "ssc-gd": "SSC GD",
  "railway-ntpc": "Railway NTPC",
  "railway-group-d": "Railway Group D",
  "upsc-cse": "UPSC CSE",
  "rpsc-ras": "RPSC RAS",
  "mppsc": "MPPSC",
  "uppsc": "UPPSC",
  "bpsc": "BPSC",
  "ibps-po": "IBPS PO",
  "ibps-clerk": "IBPS Clerk",
  "sbi-po": "SBI PO",
  "sbi-clerk": "SBI Clerk",
  "rbi-grade-b": "RBI Grade B",
  "lic-aao": "LIC AAO",
};

export function getExamLabel(examId: string): string {
  if (!examId) return "";
  const trimmed = String(examId).trim();
  if (EXAM_LABELS[trimmed]) return EXAM_LABELS[trimmed];

  // If examId is purely numeric or internal ID, do not return the raw number
  if (/^\d+$/.test(trimmed)) {
    return "";
  }

  // If it's a slug, format nicely e.g. "rajasthan-police" -> "Rajasthan Police"
  const formatted = trimmed
    .replace(/^exam[-_]/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  if (/^\d+$/.test(formatted.trim())) return "";
  return formatted;
}