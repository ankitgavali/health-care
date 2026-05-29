export interface ServiceItem {
  id: string;
  iconName: string;
  label: string;
  desc: string;
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
}

export interface DoctorItem {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  experience: string;
  desc: string;
  image: string;
}

export interface HomepageSettings {
  hospitalName: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText1: string;
  aboutText2: string;
  contactEmail: string;
  contactPhone: string;
  contactEmergency: string;
  contactAddress: string;
  services: ServiceItem[];
  stats: StatItem[];
  doctors: DoctorItem[];
}

export const defaultSettings: HomepageSettings = {
  hospitalName: "MediCare",
  heroSubtitle: "Personalized medical care for the whole family",
  aboutTitle: "About MediCare",
  aboutText1: "Welcome to MediCare General Hospital. We are a state-of-the-art facility dedicated to providing comprehensive and compassionate healthcare to all our patients.",
  aboutText2: "Our mission is to bridge the gap between advanced medical technology and human empathy. Our digital platform seamlessly connects patients, nurses, and doctors to ensure a fast, efficient, and transparent medical experience from diagnosis to billing.",
  contactEmail: "support@medicare.local",
  contactPhone: "+91 98765 43210",
  contactEmergency: "108",
  contactAddress: "123 Health Avenue, Wellness City, MH 400001",
  services: [
    { id: "s1", iconName: "FileText", label: "Digital Case Papers", desc: "Submit and track case papers digitally with real-time updates across the care team." },
    { id: "s2", iconName: "ShieldCheck", label: "Role-Based Access", desc: "Secure, role-based access ensures the right people see the right information." },
    { id: "s3", iconName: "Activity", label: "End-to-End Workflow", desc: "Seamless handoffs from patient intake to doctor consultation to billing." },
    { id: "s4", iconName: "HeartPulse", label: "Instant Billing", desc: "Automated invoice generation with prescription details and PDF exports." },
  ],
  stats: [
    { id: "st1", value: "10K+", label: "Patients Served" },
    { id: "st2", value: "15+", label: "Years Experience" },
    { id: "st3", value: "50+", label: "Medical Staff" },
    { id: "st4", value: "24/7", label: "Emergency Care" },
  ],
  doctors: [
    {
      id: "d1",
      name: "Dr. Aarav Mehta",
      role: "Senior Consulting Physician",
      specialties: ["Cardiology", "Internal Medicine"],
      experience: "12+ Yrs Exp",
      desc: "Dedicated to providing high-quality cardiac and general medical care with compassion.",
      image: "/dr_aarav_mehta.png"
    },
    {
      id: "d2",
      name: "Dr. Priya Sharma",
      role: "Chief Pediatrician",
      specialties: ["Child Care", "Women's Health"],
      experience: "8+ Yrs Exp",
      desc: "Focuses on pediatric wellness, neonatal support, and family medicine.",
      image: "/dr_priya_sharma.png"
    }
  ]
};

const STORAGE_KEY = "medicare_homepage_settings";

export function getHomepageSettings(): HomepageSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load homepage settings", e);
  }
  return defaultSettings;
}

export function saveHomepageSettings(settings: HomepageSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save homepage settings", e);
  }
}
