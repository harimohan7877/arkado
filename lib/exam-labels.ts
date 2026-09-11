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
  if (!examId) return "Exam Kit";
  if (EXAM_LABELS[examId]) return EXAM_LABELS[examId];

  // If it's a slug, format nicely e.g. "rajasthan-police" -> "Rajasthan Police"
  const formatted = examId
    .replace(/^exam[-_]/i, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return formatted || examId;
}