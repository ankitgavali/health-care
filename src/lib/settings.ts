import { db } from "@/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface ServiceItem {
  id: string;
  iconName: string;
  label: string;
  desc: string;
  image?: string;
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
  headerTagline?: string;
  heroBadgeText?: string;
  aboutTitle: string;
  aboutText1: string;
  aboutText2: string;
  contactEmail: string;
  contactPhone: string;
  contactEmergency: string;
  contactAddress: string;
  socialInstagram?: string;
  socialWhatsApp?: string;
  socialFacebook?: string;
  services: ServiceItem[];
  stats: StatItem[];
  doctors: DoctorItem[];
}

export const defaultSettings: HomepageSettings = {
  hospitalName: "Moolatvam Ayurved",
  heroSubtitle: "Personalized Ayurvedic & Clinical Healthcare for Complete Wellness",
  headerTagline: "स्वास्थ्यरक्षणार्थं...व्याधिमोक्षणार्थं...",
  heroBadgeText: "Authentic Ayurveda & Clinical Excellence",
  aboutTitle: "About Moolatvam Ayurved",
  aboutText1: "Welcome to Moolatvam Ayurved Hospital & Vaidyatvam Pharmacy. We are a state-of-the-art Ayurvedic healthcare facility dedicated to holistic healing, authentic Panchakarma, and specialized clinical care.",
  aboutText2: "Our mission is to bridge traditional Ayurvedic wisdom with advanced patient care workflows. Under the expert guidance of Dr. Kadambari Jagtap and Dr. Omprasad Jagtap, we provide personalized treatment plans from diagnosis to recovery.",
  contactEmail: "contact@moolatvam.com",
  contactPhone: "+91 98765 43210",
  contactEmergency: "+91 98765 43210",
  contactAddress: "Moolatvam Ayurved Hospital, Sangli, Maharashtra",
  socialInstagram: "https://www.instagram.com/moolatvam",
  socialWhatsApp: "+919876543210",
  socialFacebook: "https://facebook.com",
  services: [
    { id: "s1", iconName: "FileText", label: "Digital Case Papers", desc: "Submit and track case papers digitally with real-time updates across the care team.", image: "/hero_bg_write.png" },
    { id: "s2", iconName: "ShieldCheck", label: "Role-Based Access", desc: "Secure, role-based access ensures the right people see the right information.", image: "/hospital_bg_2.png" },
    { id: "s3", iconName: "Activity", label: "End-to-End Workflow", desc: "Seamless handoffs from patient intake to doctor consultation to billing.", image: "/hero_bg_care.png" },
    { id: "s4", iconName: "HeartPulse", label: "Instant Billing", desc: "Automated invoice generation with prescription details and PDF exports.", image: "/premium_bg.png" },
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
    console.error("Failed to load homepage settings from cache", e);
  }
  return defaultSettings;
}

export function saveHomepageSettings(settings: HomepageSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save homepage settings to cache", e);
  }
}

export async function saveHomepageSettingsToFirestore(settings: HomepageSettings): Promise<void> {
  saveHomepageSettings(settings);
  try {
    await setDoc(doc(db, "settings", "homepage"), settings, { merge: true });
  } catch (e) {
    console.error("Failed to save homepage settings to Firestore", e);
    throw e;
  }
}

export function subscribeHomepageSettings(onUpdate: (settings: HomepageSettings) => void): () => void {
  // First emit from local cache for instantaneous rendering without flicker
  const cached = getHomepageSettings();
  onUpdate(cached);

  try {
    const docRef = doc(db, "settings", "homepage");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<HomepageSettings>;
        const merged: HomepageSettings = {
          ...defaultSettings,
          ...data,
          services: data.services || defaultSettings.services,
          stats: data.stats || defaultSettings.stats,
          doctors: data.doctors || defaultSettings.doctors,
        };
        saveHomepageSettings(merged);
        onUpdate(merged);
      } else {
        // If not initialized in Firestore yet, initialize it
        setDoc(docRef, defaultSettings, { merge: true }).catch(console.error);
      }
    }, (err) => {
      console.warn("Firestore settings subscription warning:", err);
    });

    return unsubscribe;
  } catch (err) {
    console.error("Failed to subscribe to homepage settings:", err);
    return () => {};
  }
}
