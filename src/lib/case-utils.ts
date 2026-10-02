import type { AppRole } from "@/hooks/use-auth";
import { db } from "@/firebase";
import { collection, query, where, getDocs, setDoc, doc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export type DoseMedicine = {
  id: string;
  name: string;
  strength?: string;
  dose_code: string; // "000" | "100" | "010" | "001" | "110" | "101" | "011" | "111"
  morning_dose: string;
  afternoon_dose: string;
  evening_dose: string;
  duration: string;
  instructions?: string;
};

export const DOSE_CODES: Record<string, { label: string; morning: string; afternoon: string; evening: string; summary: string }> = {
  "000": { label: "000 — No Tablet (0-0-0)", morning: "0 Tablet", afternoon: "0 Tablet", evening: "0 Tablet", summary: "No tablet scheduled" },
  "100": { label: "100 — Morning Only (1-0-0)", morning: "1 Tablet", afternoon: "0 Tablet", evening: "0 Tablet", summary: "Morning only" },
  "010": { label: "010 — Afternoon Only (0-1-0)", morning: "0 Tablet", afternoon: "1 Tablet", evening: "0 Tablet", summary: "Afternoon only" },
  "001": { label: "001 — Evening Only (0-0-1)", morning: "0 Tablet", afternoon: "0 Tablet", evening: "1 Tablet", summary: "Evening only" },
  "110": { label: "110 — Morning & Afternoon (1-1-0)", morning: "1 Tablet", afternoon: "1 Tablet", evening: "0 Tablet", summary: "Morning and Afternoon" },
  "101": { label: "101 — Morning & Evening (1-0-1)", morning: "1 Tablet", afternoon: "0 Tablet", evening: "1 Tablet", summary: "Morning and Evening" },
  "011": { label: "011 — Afternoon & Evening (0-1-1)", morning: "0 Tablet", afternoon: "1 Tablet", evening: "1 Tablet", summary: "Afternoon and Evening" },
  "111": { label: "111 — Morning, Afternoon & Evening (1-1-1)", morning: "1 Tablet", afternoon: "1 Tablet", evening: "1 Tablet", summary: "Morning, Afternoon, Evening" },
};

export const COMMON_MEDICINES = [
  // Vati / Ras / Gutika (Tablets)
  { name: "Tab. Tribhuvan Kirti Ras", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Mahasudarshan Ghanvati", strength: "500mg", category: "Vati / Ras" },
  { name: "Tab. Arogyavardhini Vati", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Chandraprabha Vati", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Sanjivani Vati", strength: "125mg", category: "Vati / Ras" },
  { name: "Tab. Sutshekhar Ras", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Kamdudha Ras", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Gandhak Rasayan", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Shankh Vati", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Punarnavadi Mandur", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Laxmivilas Ras", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Brahmi Vati", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Agnitundi Vati", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Chitrakadi Vati", strength: "250mg", category: "Vati / Ras" },
  { name: "Tab. Kutajghan Vati", strength: "250mg", category: "Vati / Ras" },

  // Guggulu
  { name: "Tab. Yograj Guggulu", strength: "500mg", category: "Guggulu" },
  { name: "Tab. Kaishore Guggulu", strength: "500mg", category: "Guggulu" },
  { name: "Tab. Triphala Guggulu", strength: "500mg", category: "Guggulu" },
  { name: "Tab. Gokshuradi Guggulu", strength: "500mg", category: "Guggulu" },
  { name: "Tab. Kanchnar Guggulu", strength: "500mg", category: "Guggulu" },
  { name: "Tab. Singhnad Guggulu", strength: "500mg", category: "Guggulu" },
  { name: "Tab. Trayodashang Guggulu", strength: "500mg", category: "Guggulu" },

  // Churna & Kalpa (Powders)
  { name: "Sitopaladi Churna", strength: "3g", category: "Churna / Kalpa" },
  { name: "Triphala Churna", strength: "5g", category: "Churna / Kalpa" },
  { name: "Avipattikar Churna", strength: "3g", category: "Churna / Kalpa" },
  { name: "Hingwashtak Churna", strength: "2g", category: "Churna / Kalpa" },
  { name: "Trikatu Churna", strength: "2g", category: "Churna / Kalpa" },
  { name: "Talishadi Churna", strength: "3g", category: "Churna / Kalpa" },
  { name: "Yashtimadhu Churna", strength: "3g", category: "Churna / Kalpa" },
  { name: "Shatavari Kalpa", strength: "5g", category: "Churna / Kalpa" },
  { name: "Ashwagandha Churna", strength: "3g", category: "Churna / Kalpa" },

  // Asava / Arishta / Syrups
  { name: "Syp. Ashwagandhadishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Dashmoolarishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Amritarishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Punarnavarishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Drakshasava", strength: "20ml", category: "Asava / Arishta" },
  { name: "Syp. Saraswatarishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Arjunarishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Khadirarishta", strength: "15ml", category: "Asava / Arishta" },
  { name: "Syp. Vasavaleha", strength: "10ml", category: "Asava / Arishta" },

  // Taila & Ghrita (Oils & Medicated Ghee)
  { name: "Mahanarayan Taila", strength: "Ext. App.", category: "Taila / Ghrita" },
  { name: "Dhanwantaram Taila", strength: "Ext. App.", category: "Taila / Ghrita" },
  { name: "Kshirabala Taila", strength: "Ext. App.", category: "Taila / Ghrita" },
  { name: "Brahmi Ghrita", strength: "5g", category: "Taila / Ghrita" },
  { name: "Panchatikta Ghrita", strength: "5g", category: "Taila / Ghrita" },

  // General & Allopathic Formulations
  { name: "Tab. Liv-52", strength: "1 Tab", category: "General / Modern" },
  { name: "Tab. Paracetamol", strength: "500mg", category: "General / Modern" },
  { name: "Tab. Pantoprazole", strength: "40mg", category: "General / Modern" },
  { name: "Tab. Cetirizine", strength: "10mg", category: "General / Modern" },
  { name: "Tab. Azithromycin", strength: "500mg", category: "General / Modern" },
  { name: "Tab. Multivitamin", strength: "1 Tab", category: "General / Modern" },
  { name: "Tab. Calcium + D3", strength: "500mg", category: "General / Modern" },
];

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
  dose_medicines?: DoseMedicine[] | null;
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

export function getDoctorDeduplicationKey(name: string): string {
  if (!name) return "";
  const clean = name.toLowerCase().replace(/^(dr\.?|doctor)\s+/i, "").trim();
  if (clean.includes("kadambari")) return "kadambari";
  if (clean.includes("omprasad")) return "omprasad";
  
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  
  const normalizedWords = parts.map(word => {
    if (word.length <= 2) return word;
    return word[0] + word.slice(1).replace(/[aeiou]/gi, "");
  });
  
  return normalizedWords.join("_");
}

export const roleHome: Record<AppRole, string> = {
  patient: "/patient",
  nurse: "/nurse",
  doctor: "/doctor",
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

export async function convertLeadToPatient(lead: any) {
  // 1. Search for existing patient profile with the same mobile number
  const q = query(collection(db, "profiles"), where("mobile", "==", lead.mobile));
  const snap = await getDocs(q);
  
  let patientId = "";
  if (!snap.empty) {
    patientId = snap.docs[0].id;
  } else {
    // Create new patient profile
    const newPatientRef = doc(collection(db, "profiles"));
    patientId = newPatientRef.id;
    await setDoc(newPatientRef, {
      full_name: lead.patient_name,
      mobile: lead.mobile,
      gender: lead.gender || null,
      age: Number(lead.age || 0),
      role: "patient",
      created_at: new Date().toISOString()
    });
    
    // Also ensure they have a row in user_roles
    await setDoc(doc(db, "user_roles", patientId), {
      role: "patient"
    });
  }
  
  // 2. Generate a birth year placeholder DOB based on age
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - (Number(lead.age) || 30);
  const dobPlaceholder = `${birthYear}-01-01`;
  
  // 3. Create Case Paper
  const casePaperRef = await addDoc(collection(db, "case_papers"), {
    patient_id: patientId,
    full_name: lead.patient_name,
    address: "Davangere", // Default placeholder address
    mobile: lead.mobile,
    dob: dobPlaceholder,
    age: Number(lead.age || 0),
    notes: `Lead Reason for Visit: ${lead.problem || "N/A"}\nLead Source: ${lead.source || "N/A"}`,
    assigned_doctor: lead.preferred_doctor || "doctor1",
    assigned_doctor_name: lead.preferred_doctor_name || "Dr. Kadambari Jagtap",
    status: "submitted",
    created_at: serverTimestamp()
  });
  
  // 4. Update Lead status to Converted and link Case Paper ID
  await updateDoc(doc(db, "leads", lead.id), {
    status: "Converted",
    converted_patient_id: patientId,
    converted_case_id: casePaperRef.id,
    updated_at: new Date().toISOString()
  });
  
  return { patientId, casePaperId: casePaperRef.id };
}
