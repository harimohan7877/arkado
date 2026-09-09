import examsData from "@/data/exams.json";

export interface UserProfile {
  name?: string;
  state: string;
  age: number | string;
  education: 'eighth' | 'tenth' | 'twelfth' | 'graduation' | 'post_graduation' | string;
  category: 'general' | 'ews' | 'obc' | 'sbc' | 'sc' | 'st' | string;
  gender?: 'male' | 'female';
  hasRSCIT?: boolean;
  hasCET_graduate?: boolean;
  hasCET_senior?: boolean;
  isWidowDivorced?: boolean;
  isPwD?: boolean;
  hasPhysicalFitness?: boolean;
}

export interface Exam {
  id: string;
  group?: string;
  logo_url?: string;
  name: string;
  name_hindi?: string;
  short_name?: string;
  board: string;
  board_full?: string;
  status: 'open' | 'upcoming' | 'expected' | 'closed' | string;
  last_date?: string | null;
  form_start?: string | null;
  total_posts?: string;
  expected_vacancies?: string;
  prestige?: string;
  official_url: string;
  apply_url?: string;
  sso_login_required?: boolean;
  sso_url?: string;
  fee: {
    general_ews?: number;
    general_OBC_creamy?: number;
    general?: number;
    obc_sbc?: number;
    sc_st?: number;
    [key: string]: number | undefined;
  };
  eligibility: {
    nationality?: string;
    domicile?: string;
    education: string;
    education_note?: string;
    computer?: string;
    CET?: string;
    CET_note?: string;
    min_age: number;
    max_age: number;
    age_cutoff_date?: string;
    attempt_limit?: string;
    states?: string[];
    [key: string]: string | number | string[] | undefined | boolean | null;
  };
  age_relaxation?: {
    [key: string]: string;
  };
  selection_process?: string[];
  subjects?: string[];
  step_by_step_form_guide?: string[];
  common_mistakes?: string[];
  free_youtube?: Array<{
    channel: string;
    url: string;
    best_for: string;
    language: string;
  }>;
  last_verified: string;
  guide_available?: boolean;
  disclaimer: string;
}

export interface EligibilityResult extends Exam {
  eligible: boolean;
  reasons_eligible: string[];
  reasons_ineligible: string[];
  warnings: string[];
  effective_max_age?: number;
}

export function checkEligibility(user: UserProfile, exams: Exam[]): EligibilityResult[] {
  const userAge = typeof user.age === 'string' ? parseInt(user.age) : user.age;
  const userGender = user.gender || 'male';
  const userCategory = (user.category || '').toLowerCase();

  // Map education values
  const eduLevel: Record<string, number> = {
    '8th': 1,
    'eighth': 1,
    '10th': 2,
    'tenth': 2,
    '12th': 3,
    'twelfth': 3,
    'graduation': 4,
    'pg': 5,
    'post_graduation': 5
  };

  const userEduLevel = eduLevel[user.education] || 0;
  const isRajasthan = (user.state || '').toLowerCase() === 'rajasthan' || user.state === 'राजस्थान';

  return (exams as Exam[]).map((exam: Exam) => {
    const reasons_eligible: string[] = [];
    const reasons_ineligible: string[] = [];
    const warnings: string[] = [];

    // Calculate effective max age with relaxation
    let effectiveMaxAge = exam.eligibility.max_age;

    if (exam.age_relaxation) {
      // Build key for age relaxation lookup
      let key = '';

      if (user.isWidowDivorced && userGender === 'female') {
        key = 'widow_divorced_female';
      } else if (user.isPwD) {
        if (userCategory === 'general' || userCategory === 'ews') {
          key = 'PwD_general';
        } else if (userCategory === 'obc' || userCategory === 'sbc') {
          key = 'PwD_OBC';
        } else if (userCategory === 'sc' || userCategory === 'st') {
          key = 'PwD_SC_ST';
        }
      } else {
        // Normal category-based relaxation
        const catKey = userCategory === 'obc' || userCategory === 'sbc' ? 'obc' :
                       userCategory === 'ews' ? 'ews' :
                       userCategory === 'sc' ? 'sc' :
                       userCategory === 'st' ? 'st' : 'general';

        key = `${catKey}_${userGender}_rajasthan`;
      }

      const relaxation = exam.age_relaxation[key];
      if (relaxation) {
        const match = relaxation.match(/(\d+)/);
        if (match) {
          const years = parseInt(match[1]);
          if (!isNaN(years)) effectiveMaxAge += years;
        }
      }
    }

    // Age check
    if (isNaN(userAge) || userAge < exam.eligibility.min_age) {
      reasons_ineligible.push(`Umar kam hai — minimum ${exam.eligibility.min_age} saal chahiye, tumhari ${userAge} hai`);
    } else if (userAge > effectiveMaxAge) {
      reasons_ineligible.push(`Umar zyada hai — tumhari category mein maximum ${effectiveMaxAge} saal hai`);
    } else {
      reasons_eligible.push(`✅ Umar sahi hai (${userAge} saal)`);
    }

    // Education check
    const reqEdu = exam.eligibility.education;
    if (reqEdu.includes('Graduation') && userEduLevel < 4) {
      reasons_ineligible.push(`Padhai: Graduation chahiye — tumhari padhai ${user.education} tak hai`);
    } else if (reqEdu.includes('12th') && userEduLevel < 3) {
      reasons_ineligible.push(`Padhai: 12th pass chahiye`);
    } else if (reqEdu.includes('10th') && userEduLevel < 2) {
      reasons_ineligible.push(`Padhai: 10th pass chahiye`);
    } else {
      reasons_eligible.push(`✅ Padhai sahi hai`);
    }

    // CET check for RSMSSB exams
    if (exam.eligibility.CET) {
      if (exam.eligibility.CET.includes('Graduate') && !user.hasCET_graduate) {
        warnings.push(`⚠️ CET Graduate Level MANDATORY hai — bina CET ke apply invalid hoga`);
      } else if (exam.eligibility.CET.includes('Senior Secondary') && !user.hasCET_senior) {
        warnings.push(`⚠️ CET Senior Secondary Level MANDATORY hai`);
      }
    }

    // Computer check
    if (exam.eligibility.computer && !user.hasRSCIT) {
      warnings.push(`⚠️ RS-CIT ya equivalent computer certificate chahiye`);
    }

    // Physical check for Police
    if (exam.id === 'rajasthan-police-constable-2026' && !user.hasPhysicalFitness) {
      warnings.push(`⚠️ Physical fitness test hoga — height, chest, running check karo`);
    }

    // State check
    if (!isRajasthan && userCategory !== 'general' && userCategory !== 'ews') {
      warnings.push(`⚠️ Doosre state ke candidates General category mein treat honge — reservation benefit nahi milega`);
    }

    return {
      ...exam,
      eligible: reasons_ineligible.length === 0,
      reasons_eligible,
      reasons_ineligible,
      warnings,
      effective_max_age: effectiveMaxAge
    };
  });
}

// Legacy function for backward compatibility
export function getEligibleExams(profile: UserProfile): Exam[] {
  const examsList = (Array.isArray(examsData) ? examsData : (examsData as any).exams || []) as unknown as Exam[];
  const results = checkEligibility(profile, examsList);
  return results.filter(r => r.eligible).map(r => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { eligible, reasons_eligible, reasons_ineligible, warnings, effective_max_age, ...exam } = r;
    return exam as Exam;
  });
}

export function getDaysRemaining(lastDate: string | null | undefined): number {
  if (!lastDate) return -1;
  const today = new Date();
  const lastDateObj = new Date(lastDate);
  const diffTime = lastDateObj.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getFeeByCategory(exam: Exam, category: string): number {
  const cat = category.toLowerCase();
  if (cat === 'general' || cat === 'ews') return exam.fee.general_ews || exam.fee.general || 600;
  if (cat === 'obc' || cat === 'sbc') return exam.fee.obc_sbc || exam.fee.general_OBC_creamy || 400;
  if (cat === 'sc' || cat === 'st') return exam.fee.sc_st || exam.fee.SC_ST_OBC_non_creamy_EWS_PwD || 400;
  return exam.fee.general_ews || 600;
}

export function getAllExams(): Exam[] {
  return examsData.exams as unknown as Exam[];
}

export function getExamById(id: string): Exam | undefined {
  return (examsData.exams as unknown as Exam[]).find((e: Exam) => e.id === id);
}