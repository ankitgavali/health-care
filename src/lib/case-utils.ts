import type { AppRole } from "@/hooks/use-auth";

export type CaseRow = {
  id: string;
  patient_id: string;
  full_name: string;
  address: string;
  mobile: string;
  dob: string;
  age: number;
  notes: string;
  marital_status: string | null;
  education: string | null;
  occupation: string | null;
  parents_occupation: string | null;
  menstrual_history: string | null;
  past_history: string | null;
  weight: string | null;
  gender: string | null;
  status: string;
  assigned_doctor: string | null;
  assigned_doctor_name?: string | null;
  prescription: string | null;
  medical_notes: string | null;
  medicines: string | null;
  tests: string | null;
  consultation_charge: number | null;
  medicine_charge: number | null;
  test_charge: number | null;
  other_charge: number | null;
  total_bill: number | null;
  created_at: string;
  updated_at: string;
};

export type CaseStatus =
  | "submitted"
  | "sent_to_doctor"
  | "under_review"
  | "completed"
  | "returned_to_nurse"
  | "billed";

export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}

export const statusLabel: Record<CaseStatus, string> = {
  submitted: "Submitted",
  sent_to_doctor: "Pending with Doctor",
  under_review: "Under Review",
  completed: "Completed",
  returned_to_nurse: "Returned to Nurse",
  billed: "Billed",
};

export const statusColor: Record<CaseStatus, string> = {
  submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  sent_to_doctor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  under_review: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  returned_to_nurse: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  billed: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
};

export const doctorName: Record<"doctor1" | "doctor2", string> = {
  doctor1: "Dr. Kadambari Jagtap",
  doctor2: "Dr. Omprasad Jagtap",
};

export const roleHome: Record<AppRole, string> = {
  patient: "/patient",
  nurse: "/nurse",
  doctor1: "/doctor",
  doctor2: "/doctor",
  admin: "/admin",
};

export const HOSPITAL_NAME = "MediCare General Hospital";

export function parseCaseNotes(c: any): any {
  if (!c) return {};
  try {
    const parsed = JSON.parse(c.notes || "{}");
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        ...c,
        notes: parsed.notes || "",
        marital_status: parsed.marital_status || "",
        education: parsed.education || "",
        occupation: parsed.occupation || "",
        parents_occupation: parsed.parents_occupation || "",
        menstrual_history: parsed.menstrual_history || "",
        past_history: parsed.past_history || "",
        weight: parsed.weight || "",
        gender: parsed.gender || "",
      };
    }
  } catch (e) {
    // Not JSON, just plain string
  }
  return c;
}
