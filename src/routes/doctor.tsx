import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, query as fsQuery, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

import { motion, AnimatePresence } from "framer-motion";

function AnimatedWrapper({ children }: { children: React.ReactNode, index?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {children}
    </div>
  );
}
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusColor, statusLabel, doctorName, CaseStatus, calculateAge, parseCaseNotes, getDoctorDeduplicationKey, DOSE_CODES, COMMON_MEDICINES } from "@/lib/case-utils";
import type { DoseMedicine } from "@/lib/case-utils";
import { generatePDFFromElementId } from "@/lib/pdf";
import { 
  Search, 
  FileText, 
  Send, 
  ClipboardList, 
  Clock, 
  Activity, 
  CheckCircle2, 
  Menu, 
  X, 
  ArrowUpDown, 
  Phone, 
  User, 
  MapPin, 
  Calendar,
  Stethoscope,
  TrendingUp,
  AlertCircle,
  Trash2,
  Download,
  Printer,
  Loader2,
  Pill,
  Sun,
  Moon,
  Sunrise,
  Plus,
  Edit2,
  Info,
  Check,
  RotateCcw
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";

const LOGO_SVG_STRING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" font-family="sans-serif">
  <circle cx="50" cy="50" r="48" fill="#fbbd08" />
  <circle cx="50" cy="50" r="36" fill="black" />
  <circle cx="50" cy="50" r="34" fill="none" stroke="#fbbd08" stroke-width="1" />
  <path id="curve-top" d="M 8 50 A 42 42 0 1 1 92 50" fill="none" />
  <text fill="black" font-weight="bold" font-size="10.5px" letter-spacing="0.8">
    <textPath href="#curve-top" startOffset="50%" text-anchor="middle">MOOLATVAM AYURVED</textPath>
  </text>
  <path id="curve-bottom" d="M 92 50 A 42 42 0 0 1 8 50" fill="none" />
  <text fill="black" font-weight="bold" font-size="4.8px" letter-spacing="0.5">
    <textPath href="#curve-bottom" startOffset="50%" text-anchor="middle">स्वास्थ्यरक्षणार्थं...व्याधिमोक्षणार्थं...</textPath>
  </text>
  <path d="M 50 63 L 50 39 A 10 10 0 0 1 70 39 L 70 63 Z" fill="none" stroke="#fbbd08" stroke-width="2.5" />
  <path d="M 50 44 L 70 44" stroke="#fbbd08" stroke-width="2.5" />
  <path d="M 50 49 L 70 49" stroke="#fbbd08" stroke-width="2.5" />
  <path d="M 50 54 L 70 54" stroke="#fbbd08" stroke-width="2.5" />
  <path d="M 42 69 C 38 69 36 65 36 65" stroke="#fbbd08" stroke-width="2" fill="none" stroke-linecap="round" />
  <path d="M 42 67 C 26 67 26 47 30 43 C 38 47 42 59 42 67 Z" fill="#fbbd08" />
  <path d="M 42 67 C 34 63 30 43 30 43" stroke="black" stroke-width="1.2" fill="none" stroke-linecap="round" />
  <path d="M 42 67 C 30 51 42 35 46 35 C 50 47 46 63 42 67 Z" fill="#fbbd08" />
  <path d="M 42 67 C 40 55 46 35 46 35" stroke="black" stroke-width="1.2" fill="none" stroke-linecap="round" />
  <path d="M 42 67 C 58 71 70 59 70 51 C 62 47 50 59 42 67 Z" fill="#fbbd08" />
  <path d="M 42 67 C 54 65 70 51 70 51" stroke="black" stroke-width="1.2" fill="none" stroke-linecap="round" />
</svg>`;

const LogoSVG = ({ idPrefix = "doc-logo" }: { idPrefix?: string }) => {
  return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG_STRING)}`} className="w-full h-full drop-shadow-lg" alt="Logo" />;
};

export const Route = createFileRoute("/doctor")({
  component: () => (
    <RequireRole allow={["doctor1", "doctor2"]}>
      <AppShell title="Doctor Dashboard" fullWidth={true}><DoctorPage /></AppShell>
    </RequireRole>
  ),
});

// Clinical doctor metadata themes for rich aesthetics
const DOCTOR_THEMES = [
  {
    bgClass: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border-teal-500/20",
    colorClass: "text-teal-600 dark:text-teal-400",
    glowClass: "shadow-teal-500/10 dark:shadow-teal-500/5",
  },
  {
    bgClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    glowClass: "shadow-indigo-500/10 dark:shadow-indigo-500/5",
  },
  {
    bgClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    glowClass: "shadow-emerald-500/10 dark:shadow-emerald-500/5",
  },
  {
    bgClass: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20",
    colorClass: "text-purple-600 dark:text-purple-400",
    glowClass: "shadow-purple-500/10 dark:shadow-purple-500/5",
  },
];

export type DoctorItem = {
  id: string;
  name: string;
  specialty: string;
  initials: string;
  bgClass: string;
  colorClass: string;
  glowClass: string;
};

function DoctorPage() {
  const { role, profileName, user } = useAuth();
  
  // Doctors list state containing strictly database doctors
  const [doctorsList, setDoctorsList] = useState<DoctorItem[]>([]);

  // Active doctor dashboard state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  const [allCases, setAllCases] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "reviewing" | "completed">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch all doctors strictly from Firestore
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "user_roles"));
        const profilesSnap = await getDocs(collection(db, "profiles"));
        
        const rolesMap = new Map();
        rolesSnap.forEach(d => rolesMap.set(d.id, d.data().role));
        
        const dynamicList: DoctorItem[] = [];

        profilesSnap.forEach(d => {
          const r = rolesMap.get(d.id) || d.data().role;
          const fullName = d.data().full_name;
          if ((r === "doctor1" || r === "doctor2" || r === "doctor") && fullName) {
            const docKey = getDoctorDeduplicationKey(fullName);
            const exists = dynamicList.some(m => m.id === d.id || (docKey && getDoctorDeduplicationKey(m.name) === docKey));
            if (!exists) {
              const themeIndex = dynamicList.length % DOCTOR_THEMES.length;
              const theme = DOCTOR_THEMES[themeIndex];
              const initials = fullName
                .replace(/^Dr\.?\s*/i, "")
                .split(" ")
                .filter(Boolean)
                .map((n: string) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "DR";

              dynamicList.push({
                id: d.id,
                name: fullName,
                specialty: d.data().specialty || "Ayurvedic Physician",
                initials: initials,
                ...theme,
              });
            }
          }
        });

        rolesSnap.forEach(d => {
          const r = d.data().role;
          if (r === "doctor1" || r === "doctor2" || r === "doctor") {
            const name = d.data().full_name || d.data().name;
            const docKey = getDoctorDeduplicationKey(name || "");
            const exists = dynamicList.some(m => m.id === d.id || (docKey && getDoctorDeduplicationKey(m.name) === docKey));
            if (!exists && name) {
              const themeIndex = dynamicList.length % DOCTOR_THEMES.length;
              const theme = DOCTOR_THEMES[themeIndex];
              dynamicList.push({
                id: d.id,
                name: name,
                specialty: "Ayurvedic Physician",
                initials: "DR",
                ...theme,
              });
            }
          }
        });
        
        setDoctorsList(dynamicList);

        // Auto-select doctor matching logged-in user or first doctor
        if (dynamicList.length > 0) {
          setSelectedDoctorId(prev => {
            if (prev && (prev === "all" || dynamicList.some(d => d.id === prev))) {
              return prev;
            }
            const emailLower = user?.email?.toLowerCase() || "";
            const matched = dynamicList.find(d => 
              d.id === user?.uid || 
              (emailLower && d.name.toLowerCase().includes(emailLower.split("@")[0])) ||
              (profileName && d.name.toLowerCase().includes(profileName.toLowerCase()))
            );
            return matched ? matched.id : dynamicList[0].id;
          });
        }
      } catch (err) {
        console.error("Error fetching doctors for doctor dashboard", err);
      }
    };
    fetchDoctors();
  }, [user, profileName]);

  // Subscribe to case papers in real-time
  useEffect(() => {
    const q = fsQuery(collection(db, "case_papers"));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      setAllCases(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })).map(parseCaseNotes));
    }, (err: any) => {
      console.error("Doctor cases fetch error:", err);
      toast.error("Failed to load cases: " + err.message);
    });
    return () => unsubscribe();
  }, []);

  // Resolve current active doctor profile
  const activeDoctor = useMemo(() => {
    if (selectedDoctorId === "all") {
      return {
        id: "all",
        name: "All Doctors Queue",
        specialty: "Combined Consultation View",
        initials: "ALL",
        bgClass: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20",
        colorClass: "text-blue-600 dark:text-blue-400",
        glowClass: "shadow-blue-500/10 dark:shadow-blue-500/5",
      };
    }
    return doctorsList.find(d => d.id === selectedDoctorId) || doctorsList[0] || {
      id: "",
      name: "Doctor",
      specialty: "Ayurvedic Physician",
      initials: "DR",
      bgClass: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border-teal-500/20",
      colorClass: "text-teal-600 dark:text-teal-400",
      glowClass: "shadow-teal-500/10 dark:shadow-teal-500/5",
    };
  }, [doctorsList, selectedDoctorId]);

  // Filter cases specific to the active doctor dashboard
  const doctorCases = useMemo(() => {
    if (selectedDoctorId === "all") return allCases;
    if (!activeDoctor.name && !activeDoctor.id) return allCases;

    const docNameLower = activeDoctor.name.toLowerCase().replace(/^dr\.?\s*/i, "").trim();
    
    return allCases.filter(c => {
      const assigned = (c.assigned_doctor || "").toLowerCase().trim();
      const assignedName = (c.assigned_doctor_name || "").toLowerCase().replace(/^dr\.?\s*/i, "").trim();
      
      // Match ID directly
      if (activeDoctor.id && assigned === activeDoctor.id.toLowerCase()) return true;

      // Match legacy or role IDs
      if (activeDoctor.name.toLowerCase().includes("kadambari") && (assigned === "doctor1" || assignedName.includes("kadambari"))) {
        return true;
      }
      if (activeDoctor.name.toLowerCase().includes("omprasad") && (assigned === "doctor2" || assignedName.includes("omprasad"))) {
        return true;
      }
      
      // Match by doctor name
      if (docNameLower && (assignedName.includes(docNameLower) || docNameLower.includes(assignedName))) {
        return true;
      }
      
      return false;
    });
  }, [allCases, selectedDoctorId, activeDoctor]);

  // Sidebar Counts for the active doctor
  const counts = useMemo(() => {
    return {
      all: doctorCases.length,
      pending: doctorCases.filter(c => c.status === "sent_to_doctor").length,
      reviewing: doctorCases.filter(c => c.status === "under_review").length,
      completed: doctorCases.filter(c => ["completed", "returned_to_nurse", "billed"].includes(c.status)).length,
    };
  }, [doctorCases]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = doctorCases;

    // Sidebar Category Filter
    if (activeTab === "pending") {
      result = result.filter(c => c.status === "sent_to_doctor");
    } else if (activeTab === "reviewing") {
      result = result.filter(c => c.status === "under_review");
    } else if (activeTab === "completed") {
      result = result.filter(c => ["completed", "returned_to_nurse", "billed"].includes(c.status));
    }

    // Text search query
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(c => 
        c.full_name.toLowerCase().includes(q) || 
        (c.mobile && c.mobile.includes(q))
      );
    }

    // Sort options
    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "name") {
        return a.full_name.localeCompare(b.full_name);
      }
      return 0;
    });
  }, [doctorCases, activeTab, query, sortBy]);

  // Group case papers by day (date only)
  const casesGroupedByDay = useMemo(() => {
    const groups: { dateLabel: string; items: any[] }[] = [];

    filteredAndSorted.forEach((c) => {
      const date = new Date(c.created_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateLabel = "";
      if (date.toDateString() === today.toDateString()) {
        dateLabel = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateLabel = "Yesterday";
      } else {
        dateLabel = date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      const existingGroup = groups.find(g => g.dateLabel === dateLabel);
      if (existingGroup) {
        existingGroup.items.push(c);
      } else {
        groups.push({ dateLabel, items: [c] });
      }
    });

    return groups;
  }, [filteredAndSorted]);

  const accept = async (c: any) => {
    if (c.status !== "sent_to_doctor") return;
    try {
      await updateDoc(doc(db, "case_papers", c.id), { status: "under_review" });
      toast.success("Case started successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteCase = async (c: any) => {
    if (!window.confirm("Are you sure you want to delete this case paper? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "case_papers", c.id));
      toast.success("Case paper deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="relative flex w-full min-h-[calc(100vh-76px)]">
      {/* Background Soft Decoration */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* 1. Sidebar Column (Desktop Static Glass Panel, Mobile Overlay Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-card p-6 border-r flex flex-col gap-5 transition-transform duration-300 ease-in-out
        md:sticky md:top-[76px] md:h-[calc(100vh-76px)] md:shrink-0 md:bg-card/75 md:backdrop-blur-md md:z-20 md:translate-x-0 md:rounded-none md:border-t-0 md:border-b-0 md:border-l-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Header (Unified on Mobile & Desktop) */}
        <div className="flex items-center justify-between border-b dark:border-white/5 pb-4">
          <span className="font-bold tracking-tight text-primary flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-serif text-base tracking-wide text-foreground">Moolatvam EMR</span>
          </span>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full md:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Integrated Doctor Profile Details & Switcher */}
        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest px-1">Active Doctor Console</label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-full rounded-2xl border-teal-500/30 bg-teal-500/10 dark:bg-teal-950/40 text-xs font-bold h-10 px-3">
                <div className="flex items-center gap-2 truncate">
                  <Stethoscope className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {doctorsList.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id} className="font-semibold text-xs py-2">
                    <div className="flex flex-col">
                      <span className="font-bold">{doc.name}</span>
                      <span className="text-[10px] text-muted-foreground">{doc.specialty}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="all" className="font-bold text-xs text-blue-600 dark:text-blue-400">
                  🌐 All Doctors (Combined Queue)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 bg-muted/40 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 p-3 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl grid place-items-center font-bold text-sm border shrink-0 ${activeDoctor.bgClass || 'bg-teal-500/10 text-teal-600 border-teal-500/20'}`}>
              {activeDoctor.initials || "DR"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xs truncate leading-snug text-foreground">{activeDoctor.name}</h2>
              <p className="text-[10px] text-muted-foreground truncate font-medium">{activeDoctor.specialty}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" /> Active Online
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono font-bold">
              {counts.pending} pending
            </span>
          </div>
        </div>

        {/* Navigation Links (Categories) */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
            Case Categories
          </p>
          
          <SidebarNavItem 
            icon={ClipboardList} 
            label="All Assigned" 
            count={counts.all} 
            active={activeTab === "all"} 
            onClick={() => { setActiveTab("all"); setSidebarOpen(false); }}
            colorClass="text-slate-500 dark:text-slate-400"
          />
          
          <SidebarNavItem 
            icon={Clock} 
            label="Pending Review" 
            count={counts.pending} 
            active={activeTab === "pending"} 
            onClick={() => { setActiveTab("pending"); setSidebarOpen(false); }}
            colorClass="text-amber-500"
            glow={counts.pending > 0}
          />
          
          <SidebarNavItem 
            icon={Activity} 
            label="Under Review" 
            count={counts.reviewing} 
            active={activeTab === "reviewing"} 
            onClick={() => { setActiveTab("reviewing"); setSidebarOpen(false); }}
            colorClass="text-violet-500"
          />
          
          <SidebarNavItem 
            icon={CheckCircle2} 
            label="Completed & Billed" 
            count={counts.completed} 
            active={activeTab === "completed"} 
            onClick={() => { setActiveTab("completed"); setSidebarOpen(false); }}
            colorClass="text-emerald-500"
          />
        </div>

        {/* Clinician Quotes Panel */}
        <div className="mt-auto">
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-4 bg-muted/20 text-center">
            <p className="text-[11px] italic text-muted-foreground leading-normal">
              "स्वास्थ्यरक्षणार्थं व्याधिमोक्षणार्थं च"
            </p>
            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mt-2">
              Moolatvam Ayurved
            </p>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile View */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Main Content Column */}
      <div className="flex-1 p-6 md:p-8 min-w-0">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Mobile Sidebar Trigger / Top stats display helper */}
          <div className="md:hidden flex items-center justify-between p-3 glass rounded-2xl mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl grid place-items-center font-bold text-xs ${activeDoctor.bgClass || 'bg-teal-500/10 text-teal-600'}`}>
                {activeDoctor.initials || "DR"}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Doctor Console</div>
                <div className="font-semibold text-sm leading-none">{activeDoctor.name}</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Welcome Dashboard Banner Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dashboard:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  {activeDoctor.name}
                </span>
                <span className="text-[11px] text-muted-foreground">({activeDoctor.specialty})</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-primary via-teal-500 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
                  Hello, <span className={activeDoctor.colorClass || "text-teal-600 dark:text-teal-400"}>{activeDoctor.name}</span>!
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {counts.pending > 0 
                  ? `You have ${counts.pending} patient case papers waiting for your diagnosis.` 
                  : "All patient checkups are completed. Great job!"}
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Doctor Switcher in Top Bar */}
              <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm">
                <Stethoscope className="h-4 w-4 text-teal-600 ml-1" />
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger className="h-8 border-0 bg-transparent font-bold text-xs focus:ring-0 gap-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {doctorsList.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id} className="font-semibold text-xs">
                        {doc.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="all" className="font-bold text-xs text-blue-600 dark:text-blue-400">
                      🌐 All Doctors
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Metrics mini card */}
              <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm max-w-fit">
                <TrendingUp className="h-4 w-4" />
                <span>Progress: {counts.completed} / {counts.all}</span>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AnimatedWrapper index={0}>
              <StatCard 
                label="Total Cases" 
                value={counts.all} 
                icon={ClipboardList} 
                color="from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400"
              />
            </AnimatedWrapper>
            <AnimatedWrapper index={1}>
              <StatCard 
                label="Pending" 
                value={counts.pending} 
                icon={Clock} 
                color="from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400"
                pulse={counts.pending > 0}
              />
            </AnimatedWrapper>
            <AnimatedWrapper index={2}>
              <StatCard 
                label="Under Review" 
                value={counts.reviewing} 
                icon={Activity} 
                color="from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400"
              />
            </AnimatedWrapper>
            <AnimatedWrapper index={3}>
              <StatCard 
                label="Completed" 
                value={counts.completed} 
                icon={CheckCircle2} 
                color="from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              />
            </AnimatedWrapper>
          </div>

          {/* Search, Filter & Sort Controls Toolbar */}
          <div className="glass border-0 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3 justify-between shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by patient name or phone number..." 
                className="pl-10 pr-4 bg-background/50 border-slate-200/60 dark:border-white/5 rounded-xl h-10 w-full focus-visible:ring-primary focus-visible:border-primary" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
              />
              {query && (
                <button 
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sorting Dropdown & Reset Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <div className="flex items-center gap-1.5 bg-background/40 border dark:border-white/5 rounded-xl px-2.5 py-1 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Sort by:</span>
                <select 
                  className="bg-transparent border-0 font-medium text-foreground focus:ring-0 cursor-pointer pr-1"
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Patient name</option>
                </select>
              </div>

              {(query || activeTab !== "all") && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setQuery(""); setActiveTab("all"); }}
                  className="rounded-xl text-xs h-8 border-dashed"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Case Papers Cards Grid Grouped Day by Day */}
          {casesGroupedByDay.length === 0 ? (
            <AnimatedWrapper>
              <Card className="glass border-0 p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 grid place-items-center text-slate-400">
                  <ClipboardList className="h-6 w-6 opacity-70" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">No case papers found</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Try adjusting your text search query or selected case category.
                  </p>
                </div>
              </Card>
            </AnimatedWrapper>
          ) : (
            <div className="space-y-8">
              {(() => {
                let globalCardIndex = 0;
                return casesGroupedByDay.map(({ dateLabel, items }) => (
                  <motion.div 
                    key={dateLabel} 
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Date Heading Divider */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl border dark:border-white/5 select-none">
                        {dateLabel} ({items.length} {items.length === 1 ? "case" : "cases"})
                      </span>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                    </div>
                    
                    {/* Cards Grid for this day */}
                    <AnimatePresence mode="popLayout">
                      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2" style={{ gridAutoRows: "1fr" }}>
                        {items.map((c) => {
                          const cardIdx = globalCardIndex++;
                          return (
                            <AnimatedWrapper key={c.id} index={cardIdx}>
                              <PatientCaseCard 
                                c={c} 
                                onAccept={() => accept(c)} 
                                onSaved={() => {}} 
                                meta={activeDoctor}
                                onDelete={deleteCase}
                              />
                            </AnimatedWrapper>
                          );
                        })}
                      </div>
                    </AnimatePresence>
                  </motion.div>
                ));
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUBCOMPONENTS
// ----------------------------------------------------

interface SidebarNavItemProps {
  icon: any;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
  glow?: boolean;
}

function SidebarNavItem({ icon: Icon, label, count, active, onClick, colorClass = "", glow = false }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 hover:bg-muted/65 group
        ${active 
          ? "bg-primary/10 text-primary dark:bg-primary/20 font-semibold shadow-sm border-l-2 border-primary" 
          : "text-muted-foreground hover:text-foreground"}
      `}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-primary" : colorClass} transition-colors group-hover:scale-105`} />
        <span>{label}</span>
      </div>
      <span className={`
        px-2 py-0.5 font-mono text-[10px] rounded-full shrink-0 font-bold
        ${active ? "bg-primary/25 text-primary-foreground dark:bg-primary/30" : "bg-muted text-muted-foreground"}
        ${glow ? "animate-pulse bg-amber-500/20 text-amber-700 dark:text-amber-400" : ""}
      `}>
        {count}
      </span>
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color, pulse = false }: { label: string; value: number; icon: any; color: string; pulse?: boolean }) {
  const textColorClass = color.split(' ').find(c => c.startsWith('text-')) || "text-primary";
  return (
    <Card className={`relative overflow-hidden bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 transition-all duration-300 hover:-translate-y-1.5 shadow-md hover:shadow-xl ${pulse ? "ring-2 ring-amber-400/50 shadow-amber-500/10" : ""}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-30 dark:opacity-20 pointer-events-none`} />
      <CardContent className="flex items-center gap-4 p-5 relative z-10">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100/50 dark:border-white/5 shrink-0 transition-transform group-hover:scale-110`}>
          <Icon className={`h-6 w-6 ${textColorClass} ${pulse ? "animate-bounce" : ""}`} />
        </div>
        <div className="min-w-0">
          <div className="text-3xl font-black tracking-tight leading-none text-slate-800 dark:text-white drop-shadow-sm">{value}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1.5 truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientCaseCard({ c, onAccept, onSaved, meta, onDelete }: { c: any; onAccept: () => void; onSaved: () => void; meta: any; onDelete?: (c: any) => void }) {
  const [complaintExpanded, setComplaintExpanded] = useState(false);
  const initials = c.full_name ? c.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "PT";

  const isPending = c.status === "sent_to_doctor";
  const isReviewing = c.status === "under_review";

  const relativeTime = useMemo(() => {
    const elapsed = Date.now() - new Date(c.created_at).getTime();
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(c.created_at).toLocaleDateString();
  }, [c.created_at]);

  const complaintPreview = c.notes && c.notes.length > 90 
    ? `${c.notes.substring(0, 90)}...` 
    : c.notes;

  return (
    <Card 
      style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1, width: "100%" }}
      className={`
      relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${isPending ? "border-l-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]" : ""}
      ${isReviewing ? "border-l-4 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]" : ""}
    `}
    >
      <CardContent style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }} className="p-5 gap-4">
        
        {/* Card Header Profile & Status */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border dark:border-white/5 font-bold text-xs grid place-items-center">
              {initials}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wide leading-tight">{c.full_name}</h3>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{relativeTime}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusColor[c.status as CaseStatus] || ""} text-[10px] font-semibold border`} variant="outline">
              {statusLabel[c.status as CaseStatus] || c.status}
            </Badge>
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(c)} className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Info Grid details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Age / Gender</span>
            <span className="font-semibold text-foreground mt-0.5 truncate">{String(c.age ?? calculateAge(c.dob))} Y {c.gender ? `/ ${c.gender}` : ''}</span>
          </div>
          <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Mobile Contact</span>
            <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{c.mobile || "—"}</span>
            </span>
          </div>
          <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col col-span-2">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Address</span>
            <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
              <span>{c.address || "—"}</span>
            </span>
          </div>
        </div>

        {/* Full patient details expandable section */}
        <div className="border border-slate-100 dark:border-white/5 rounded-xl p-3 bg-muted/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-primary block">
              Patient History & Details
            </span>
            <button onClick={() => setComplaintExpanded(!complaintExpanded)} className="text-[10px] text-primary hover:underline font-bold">
              {complaintExpanded ? "Hide Details" : "Show Full Details"}
            </button>
          </div>
          
          {complaintExpanded && (
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs mt-3 border-t dark:border-white/5 pt-3">
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Marital Status</span>
                <span className="font-semibold text-foreground">{c.marital_status || "—"}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Weight</span>
                <span className="font-semibold text-foreground">{c.weight || "—"}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Education</span>
                <span className="font-semibold text-foreground">{c.education || "—"}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Occupation</span>
                <span className="font-semibold text-foreground">{c.occupation || "—"}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Parent's Occu.</span>
                <span className="font-semibold text-foreground">{c.parents_occupation || "—"}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Past History</span>
                <span className="font-semibold text-foreground">{c.past_history || "—"}</span>
              </div>
              {c.gender === "Female" && (
                <div className="col-span-2">
                  <span className="text-[9px] uppercase text-muted-foreground block text-pink-600 dark:text-pink-400">Menstrual History</span>
                  <span className="font-semibold text-foreground">{c.menstrual_history || "—"}</span>
                </div>
              )}
            </div>
          )}

          {c.notes && (
             <div className="mt-3 border-t dark:border-white/5 pt-3">
               <span className="text-[9px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 block mb-1">
                 Chief Complaints / Notes:
               </span>
               <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line italic">
                 {c.notes}
               </p>
             </div>
          )}
        </div>

        {/* Doctor clinical summary previews if any */}
        {(c.prescription || c.medical_notes) && (
          <div className="border border-emerald-500/10 bg-emerald-500/[0.02] rounded-xl p-3 text-xs space-y-1.5">
            {c.medical_notes && (
              <div>
                <span className="font-semibold text-[9px] uppercase text-emerald-600 dark:text-emerald-400">Diagnosis:</span>
                <p className="text-muted-foreground truncate">{c.medical_notes}</p>
              </div>
            )}
            {c.prescription && (
              <div>
                <span className="font-semibold text-[9px] uppercase text-emerald-600 dark:text-emerald-400">Prescription:</span>
                <p className="text-muted-foreground truncate">{c.prescription}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button Area */}
        <div className="mt-auto pt-2 flex flex-wrap gap-2">
          {isPending && (
            <Button 
              size="sm" 
              onClick={onAccept}
              className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 animate-pulse border-0 h-9"
            >
              <Stethoscope className="h-4 w-4" /> Start Consultation
            </Button>
          )}
          {!isPending && (
            <CaseEditor caseRow={c} onSaved={onSaved} />
          )}
        </div>

      </CardContent>
    </Card>
  );
}

function CaseEditor({ caseRow, onSaved }: { caseRow: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeCaseTab, setActiveCaseTab] = useState<"case_paper" | "dose_code">("case_paper");
  
  const [notes, setNotes] = useState(caseRow.notes || "");
  const [pastHistory, setPastHistory] = useState(caseRow.past_history || "");
  const [menstrualHistory, setMenstrualHistory] = useState(caseRow.menstrual_history || "");
  const [weight, setWeight] = useState(caseRow.weight || "");
  const [medicalNotes, setMedicalNotes] = useState(caseRow.medical_notes || "");
  const [prescription, setPrescription] = useState(caseRow.prescription || "");
  const [medicines, setMedicines] = useState(caseRow.medicines || "");
  const [tests, setTests] = useState(caseRow.tests || "");
  
  // Dose code medicines state
  const [doseMedicines, setDoseMedicines] = useState<DoseMedicine[]>(caseRow.dose_medicines || []);
  
  // Medicine prescription form inputs
  const [medName, setMedName] = useState("");
  const [medStrength, setMedStrength] = useState("");
  const [doseCode, setDoseCode] = useState<string>("101");
  const [duration, setDuration] = useState("5 Days");
  const [instructions, setInstructions] = useState("After food (जेवणानंतर)");
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  const [consultationCharge, setConsultationCharge] = useState(Number(caseRow.consultation_charge ?? 0));
  const [medicineCharge, setMedicineCharge] = useState(Number(caseRow.medicine_charge ?? 0));
  const [testCharge, setTestCharge] = useState(Number(caseRow.test_charge ?? 0));
  const [otherCharge, setOtherCharge] = useState(Number(caseRow.other_charge ?? 0));

  // Calculated doses based on 3-digit binary dose code
  const currentMorningDose = doseCode[0] === "1" ? "1 Tablet" : "0 Tablet";
  const currentAfternoonDose = doseCode[1] === "1" ? "1 Tablet" : "0 Tablet";
  const currentEveningDose = doseCode[2] === "1" ? "1 Tablet" : "0 Tablet";

  // Re-sync data when dialog opens
  useEffect(() => {
    if (open) {
      setNotes(caseRow.notes || "");
      setPastHistory(caseRow.past_history || "");
      setMenstrualHistory(caseRow.menstrual_history || "");
      setWeight(caseRow.weight || "");
      setMedicalNotes(caseRow.medical_notes || "");
      setPrescription(caseRow.prescription || "");
      setMedicines(caseRow.medicines || "");
      setTests(caseRow.tests || "");
      setDoseMedicines(caseRow.dose_medicines || []);
      setConsultationCharge(Number(caseRow.consultation_charge ?? 0));
      setMedicineCharge(Number(caseRow.medicine_charge ?? 0));
      setTestCharge(Number(caseRow.test_charge ?? 0));
      setOtherCharge(Number(caseRow.other_charge ?? 0));
      setActiveCaseTab("case_paper");
      // Reset med form
      setMedName("");
      setMedStrength("");
      setDoseCode("101");
      setDuration("5 Days");
      setInstructions("After food (जेवणानंतर)");
      setEditingMedId(null);
    }
  }, [open, caseRow]);

  const total = Number(consultationCharge || 0) + Number(medicineCharge || 0) + Number(testCharge || 0) + Number(otherCharge || 0);

  // Add or update medicine in list
  const handleAddOrUpdateMedicine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingMed) return;

    if (!medName.trim()) {
      toast.error("Please enter medicine name (कृपया औषधाचे नाव प्रविष्ट करा)");
      return;
    }
    if (!duration.trim()) {
      toast.error("Please specify duration (कृपया कालावधी प्रविष्ट करा)");
      return;
    }

    setIsSubmittingMed(true);
    try {
      const morning = doseCode[0] === "1" ? "1 Tablet" : "0 Tablet";
      const afternoon = doseCode[1] === "1" ? "1 Tablet" : "0 Tablet";
      const evening = doseCode[2] === "1" ? "1 Tablet" : "0 Tablet";

      const newMed: DoseMedicine = {
        id: editingMedId || `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: medName.trim(),
        strength: medStrength.trim() || undefined,
        dose_code: doseCode,
        morning_dose: morning,
        afternoon_dose: afternoon,
        evening_dose: evening,
        duration: duration.trim(),
        instructions: instructions.trim() || undefined,
      };

      let updatedList: DoseMedicine[];
      if (editingMedId) {
        updatedList = doseMedicines.map(m => m.id === editingMedId ? newMed : m);
        setDoseMedicines(updatedList);
        toast.success(`Updated "${newMed.name}"`);
        setEditingMedId(null);
      } else {
        updatedList = [...doseMedicines, newMed];
        setDoseMedicines(updatedList);
        toast.success(`Added "${newMed.name}" (Code: ${doseCode})`);
      }

      // Automatically sync formatted list into medicines box if doctor hasn't typed custom notes
      const autoText = updatedList.map(m => 
        `• ${m.name}${m.strength ? ` ${m.strength}` : ''} [${m.dose_code}] (${m.morning_dose.replace(' Tablet','')}-${m.afternoon_dose.replace(' Tablet','')}-${m.evening_dose.replace(' Tablet','')}) × ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`
      ).join('\n');
      
      if (!medicines.trim() || medicines.includes("•")) {
        setMedicines(autoText);
      }

      // Reset form
      setMedName("");
      setMedStrength("");
      setDoseCode("101");
      setDuration("5 Days");
      setInstructions("After food (जेवणानंतर)");
    } finally {
      setIsSubmittingMed(false);
    }
  };

  const handleEditMedicine = (med: DoseMedicine) => {
    setEditingMedId(med.id);
    setMedName(med.name);
    setMedStrength(med.strength || "");
    setDoseCode(med.dose_code);
    setDuration(med.duration);
    setInstructions(med.instructions || "");
    setActiveCaseTab("dose_code");
    toast.info(`Editing "${med.name}"`);
  };

  const handleDeleteMedicine = (id: string) => {
    const updated = doseMedicines.filter(m => m.id !== id);
    setDoseMedicines(updated);
    if (editingMedId === id) {
      setEditingMedId(null);
      setMedName("");
      setMedStrength("");
      setDoseCode("101");
      setDuration("5 Days");
      setInstructions("After food (जेवणानंतर)");
    }
    
    // Refresh medicines text box
    const autoText = updated.map(m => 
      `• ${m.name}${m.strength ? ` ${m.strength}` : ''} [${m.dose_code}] (${m.morning_dose.replace(' Tablet','')}-${m.afternoon_dose.replace(' Tablet','')}-${m.evening_dose.replace(' Tablet','')}) × ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`
    ).join('\n');
    if (!medicines.trim() || medicines.includes("•")) {
      setMedicines(autoText);
    }
    toast.info("Medicine removed from prescription");
  };

  const handleCancelEdit = () => {
    setEditingMedId(null);
    setMedName("");
    setMedStrength("");
    setDoseCode("101");
    setDuration("5 Days");
    setInstructions("After food (जेवणानंतर)");
  };

  const save = async (sendBack: boolean) => {
    setSaving(true);
    try {
      const updatedNotesJson = JSON.stringify({
        notes: notes.trim(),
        marital_status: caseRow.marital_status || "",
        education: caseRow.education || "",
        occupation: caseRow.occupation || "",
        parents_occupation: caseRow.parents_occupation || "",
        menstrual_history: menstrualHistory.trim(),
        past_history: pastHistory.trim(),
        weight: weight.trim(),
        gender: caseRow.gender || "",
      });

      // Prepare synced medicines text
      const doseSummary = doseMedicines.map(m => 
        `• ${m.name}${m.strength ? ` ${m.strength}` : ''} [${m.dose_code}] (${m.morning_dose.replace(' Tablet','')}-${m.afternoon_dose.replace(' Tablet','')}-${m.evening_dose.replace(' Tablet','')}) × ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`
      ).join('\n');

      const finalMedicinesText = medicines.trim() || doseSummary;

      await updateDoc(doc(db, "case_papers", caseRow.id), {
        notes: updatedNotesJson,
        medical_notes: medicalNotes.trim(),
        prescription: prescription.trim(),
        medicines: finalMedicinesText,
        dose_medicines: doseMedicines,
        tests: tests.trim(),
        consultation_charge: Number(consultationCharge || 0),
        medicine_charge: Number(medicineCharge || 0),
        test_charge: Number(testCharge || 0),
        other_charge: Number(otherCharge || 0),
        total_bill: total,
        ...(sendBack ? { status: "returned_to_nurse" } : { status: "under_review" }),
        updated_at: new Date().toISOString()
      });
      toast.success(sendBack ? "Case sent back to nurse successfully" : "Case saved successfully");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await generatePDFFromElementId(`case-paper-${caseRow.id}`, `Case-Paper-${caseRow.full_name}`);
      toast.success("PDF Downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full rounded-xl flex items-center justify-center gap-1.5 h-9 font-medium hover:bg-primary/5 hover:text-primary transition-colors border-slate-200 dark:border-white/10 bg-background">
          <FileText className="h-4 w-4 text-muted-foreground" /> Open clinical record
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto rounded-3xl p-4 sm:p-6 bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl">
        
        {/* Top Header & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-[#fbbd08]"></span>
              Electronic Case Paper — Moolatvam Ayurved
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Patient: <span className="font-bold text-foreground uppercase">{caseRow.full_name}</span> | Case Paper #{caseRow.id.substring(0,8).toUpperCase()}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="rounded-xl h-9 text-xs gap-1.5 border-amber-500/50 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-amber-600" />}
              PDF Download
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl h-9 text-xs gap-1.5 font-semibold"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => save(false)}
              disabled={saving}
              className="rounded-xl h-9 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save Record (जतन करा)
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => save(true)}
              disabled={saving}
              className="rounded-xl h-9 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-md"
            >
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Save & Send to Nurse
            </Button>
          </div>
        </div>

        {/* Case Paper Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl w-full max-w-md mx-auto border border-slate-300/60 dark:border-white/10 my-3 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveCaseTab("case_paper")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeCaseTab === "case_paper"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Case Paper (केस पेपर)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCaseTab("dose_code")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeCaseTab === "dose_code"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Pill className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>Medicine Dose Code</span>
            {doseMedicines.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-teal-600 text-white font-black leading-none">
                {doseMedicines.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Authentic A4 Case Paper View */}
        {activeCaseTab === "case_paper" && (
          <div className="w-full overflow-x-auto p-2 sm:p-4 flex justify-start lg:justify-center custom-scrollbar">
            <div
              id={`case-paper-${caseRow.id}`}
              className="bg-white relative flex flex-col overflow-hidden text-black font-serif shadow-xl border border-slate-200 shrink-0 w-[794px] min-w-[794px] min-h-[1123px] rounded-sm"
            >
              {/* Top Header Background SVG */}
              <div className="absolute top-0 left-0 w-full h-[180px] z-0 pointer-events-none">
                <svg preserveAspectRatio="none" viewBox="0 0 1000 200" className="w-full h-full">
                  <path d="M0,0 L1000,0 L1000,160 Q500,200 0,120 Z" fill="#fbbd08" />
                </svg>
              </div>

              {/* Top Header Content */}
              <div className="relative z-10 w-full px-12 pt-8 pb-4 flex justify-between items-start">
                {/* Left: Doctor 1 */}
                <div className="flex-1 mt-1">
                  <div className="font-bold text-black text-[16px] tracking-wide">Dr. Kadambari Jagtap</div>
                  <div className="text-[11px] text-black font-semibold mt-0.5 text-right w-[145px]">MD Ayu. Sch.</div>
                </div>

                {/* Center: Doctor 2 & Quote */}
                <div className="flex-1 flex flex-col items-center -mt-2">
                  <div className="text-[14px] font-bold text-black mb-1">॥ श्रीः ॥</div>
                  <div className="font-bold text-black text-[16px] tracking-wide">Dr. Omprasad Jagtap</div>
                  <div className="text-[11px] text-black font-semibold mt-0.5 text-right w-[140px]">MD Ayu.</div>
                  <div className="text-[12px] text-black font-bold mt-4 tracking-wider">स्वास्थ्यरक्षणार्थं...व्याधिमोक्षणार्थं...</div>
                </div>

                {/* Right: Logo */}
                <div className="flex-1 flex justify-end">
                  <div className="relative flex items-center justify-center w-[120px] h-[120px] -mt-2">
                    <LogoSVG idPrefix={`doctor-case-${caseRow.id}`} />
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="relative z-10 px-12 py-8 flex-1 flex flex-col text-[14px] font-medium leading-relaxed">
                {/* Name */}
                <div className="flex mb-6">
                  <span className="font-bold mr-2 whitespace-nowrap">Name :</span>
                  <span className="flex-1 font-semibold uppercase">{caseRow.full_name}</span>
                </div>

                {/* Grid layout matching official format */}
                <div className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-x-4 gap-y-6 w-full">
                  {/* Row 1 */}
                  <div className="flex">
                    <span className="font-bold mr-2">Date Of Birth:</span>
                    <span className="flex-1 font-semibold">{caseRow.dob ? new Date(caseRow.dob).toLocaleDateString("en-IN") : ""}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">Age & Gender :</span>
                    <span className="flex-1 font-semibold">{caseRow.age ?? calculateAge(caseRow.dob)} {caseRow.gender ? `/ ${caseRow.gender}` : ""}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">Date :</span>
                    <span className="flex-1 font-semibold">{new Date(caseRow.created_at).toLocaleDateString("en-IN")}</span>
                  </div>

                  {/* Row 2 */}
                  <div className="flex">
                    <span className="font-bold mr-2">Phone No. :</span>
                    <span className="flex-1 font-semibold">{caseRow.mobile || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">Married/Unmarried :</span>
                    <span className="flex-1 font-semibold">{caseRow.marital_status || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">Education :</span>
                    <span className="flex-1 font-semibold">{caseRow.education || "-"}</span>
                  </div>

                  {/* Row 3 & 4 (Address spanning 2 rows on left) */}
                  <div className="col-span-2 row-span-2 flex items-start">
                    <span className="font-bold mr-2 mt-0.5">Address :</span>
                    <span className="flex-1 font-semibold pr-4 whitespace-pre-wrap leading-relaxed">{caseRow.address || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">Occupation :</span>
                    <span className="flex-1 font-semibold">{caseRow.occupation || "-"}</span>
                  </div>

                  {/* Row 4 right side */}
                  <div className="flex">
                    <span className="font-bold mr-2">Parent's Occu. :</span>
                    <span className="flex-1 font-semibold">{caseRow.parents_occupation || "-"}</span>
                  </div>
                </div>

                {/* History Section - 4 labels spread horizontally (Exact Image 1 Layout) */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-4 w-full mt-10 mb-2">
                  <div className="flex">
                    <span className="font-bold mr-2">History of present illness :</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">पाळीचा इतिहास</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">मागील इतिहास</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2">वजन :</span>
                  </div>
                </div>

                {/* Actual interactive data inputs for History */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-4 w-full mb-4">
                  <div className="relative">
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="तक्रारी / लक्षणे (Symptoms & Complaints)"
                      className="w-full text-xs font-serif p-2 rounded-lg border border-amber-300/80 bg-amber-50/20 text-black pr-8 resize-none focus:bg-white"
                    />
                    <VoiceButton onTranscript={(val) => setNotes((prev: string) => prev ? prev + " " + val : val)} positionClassName="top-2 right-1.5" />
                  </div>

                  <div className="relative">
                    <Input
                      value={menstrualHistory}
                      onChange={(e) => setMenstrualHistory(e.target.value)}
                      placeholder="पाळीचा इतिहास..."
                      className="w-full text-xs font-serif p-2 rounded-lg border border-amber-300/80 bg-amber-50/20 text-black pr-8 h-9 focus:bg-white"
                    />
                    <VoiceButton onTranscript={(val) => setMenstrualHistory((prev: string) => prev ? prev + " " + val : val)} positionClassName="top-1.5 right-1.5" />
                  </div>

                  <div className="relative">
                    <Input
                      value={pastHistory}
                      onChange={(e) => setPastHistory(e.target.value)}
                      placeholder="मागील आजार/इतिहास..."
                      className="w-full text-xs font-serif p-2 rounded-lg border border-amber-300/80 bg-amber-50/20 text-black pr-8 h-9 focus:bg-white"
                    />
                    <VoiceButton onTranscript={(val) => setPastHistory((prev: string) => prev ? prev + " " + val : val)} positionClassName="top-1.5 right-1.5" />
                  </div>

                  <div>
                    <Input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 65 kg"
                      className="w-full text-xs font-serif p-2 rounded-lg border border-amber-300/80 bg-amber-50/20 text-black h-9 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Doctor's Observations & Treatment Section matching Image 3 */}
                <div className="mt-4 pt-3 border-t border-slate-300">
                  <div className="grid grid-cols-[1fr_1.1fr] gap-4 items-start">
                    
                    {/* LEFT COLUMN: Observations & Diagnosis */}
                    <div className="flex flex-col">
                      <div className="font-bold text-[13px] text-black mb-1 flex items-center justify-between">
                        <span>Diagnosis & Clinical Notes :</span>
                        <span className="text-[10px] text-slate-500 font-normal">निदान व तपासणी</span>
                      </div>
                      <div className="relative">
                        <Textarea
                          rows={4}
                          value={medicalNotes}
                          onChange={(e) => setMedicalNotes(e.target.value)}
                          placeholder="Enter diagnosis findings, clinical checks, observations..."
                          className="w-full text-xs font-serif p-2.5 rounded-lg border border-amber-300/80 bg-white text-black pr-8 resize-none h-[130px] min-h-[110px] sm:min-h-[125px] leading-relaxed"
                        />
                        <VoiceButton onTranscript={(val) => setMedicalNotes((prev: string) => prev ? prev + " " + val : val)} positionClassName="top-2.5 right-2" />
                      </div>
                    </div>

                    {/* RIGHT COLUMN: 2 Clean Sections (Unified Rx & Clinical Tests) */}
                    <div className="flex flex-col gap-3">
                      
                      {/* Section 1: Unified Rx Prescription & Medicines */}
                      <div>
                        <div className="font-bold text-[13px] text-black mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="font-serif font-bold text-base text-[#b45309]">Rx</span>
                            <span>Prescription & Medicines (औषधोपचार) :</span>
                          </span>
                          {doseMedicines.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveCaseTab("dose_code")}
                              className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Pill className="h-3 w-3 text-amber-700" />
                              <span>{doseMedicines.length} Medicines</span>
                              <Edit2 className="h-2.5 w-2.5 ml-0.5 text-amber-700" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-normal">Dosage / Timings</span>
                          )}
                        </div>

                        {doseMedicines.length > 0 ? (
                          <div className="rounded-lg border border-amber-300 bg-white overflow-hidden shadow-xs">
                            {/* Clean, authentic medical prescription table */}
                            <table className="w-full text-[11.5px] text-left border-collapse font-sans">
                              <thead>
                                <tr className="bg-amber-100/70 border-b border-amber-200 text-black font-bold text-[11px]">
                                  <th className="py-1 px-2 w-6 text-center">#</th>
                                  <th className="py-1 px-2">औषध (Medicine)</th>
                                  <th className="py-1 px-1.5 text-center w-28">डोस (स-दु-रा)</th>
                                  <th className="py-1 px-2 text-center w-16">कालावधी</th>
                                  <th className="py-1 px-2">सूचना</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100/80">
                                {doseMedicines.map((m, idx) => (
                                  <tr key={m.id || idx} className={idx % 2 === 1 ? "bg-amber-50/30" : "bg-white"}>
                                    <td className="py-1.5 px-2 text-center font-bold text-amber-800 text-[11px] align-top">
                                      {idx + 1}
                                    </td>
                                    <td className="py-1.5 px-2 font-serif font-bold text-black align-top">
                                      <div>{m.name}</div>
                                      {m.strength && (
                                        <span className="inline-block text-[9.5px] font-sans font-normal text-slate-600 bg-slate-100 px-1 rounded border border-slate-200 mt-0.5">
                                          {m.strength}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center align-top whitespace-nowrap">
                                      <span className="inline-block font-mono font-bold text-xs bg-amber-50 text-amber-950 px-1.5 py-0.5 rounded border border-amber-300">
                                        {m.morning_dose.replace(' Tablet', '')} - {m.afternoon_dose.replace(' Tablet', '')} - {m.evening_dose.replace(' Tablet', '')}
                                      </span>
                                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">[{m.dose_code}]</div>
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-semibold text-slate-800 align-top whitespace-nowrap">
                                      {m.duration}
                                    </td>
                                    <td className="py-1.5 px-2 text-slate-700 italic text-[10.5px] font-serif align-top">
                                      {m.instructions || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* Freeform prescription / dietary advice if provided */}
                            {prescription && (
                              <div className="p-2 bg-amber-50/50 border-t border-amber-200 text-xs font-serif text-black">
                                <span className="font-bold mr-1 text-[#b45309]">विशेष सूचना / पथ्य (Advice):</span>
                                <span className="whitespace-pre-wrap">{prescription}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <Textarea
                              rows={5}
                              value={prescription}
                              onChange={(e) => setPrescription(e.target.value)}
                              placeholder="Enter patient Rx dosage & instructions (किंवा वरील Medicine Dose Code टॅब वापरा)..."
                              className="w-full text-xs font-serif p-2.5 rounded-lg border border-amber-300/80 bg-white text-black pr-8 resize-none min-h-[120px]"
                            />
                            <VoiceButton onTranscript={(val) => setPrescription((prev: string) => prev ? prev + "\n" + val : val)} positionClassName="top-2.5 right-2" />
                          </div>
                        )}
                      </div>

                      {/* Section 2: Clinical Tests */}
                      <div>
                        <div className="font-bold text-[13px] text-black mb-1 flex items-center justify-between">
                          <span>Clinical Tests (तपासण्या / लॅब टेस्ट) :</span>
                          <span className="text-[10px] text-slate-500 font-normal">Lab / radiology</span>
                        </div>
                        <div className="relative">
                          <Textarea
                            rows={3}
                            value={tests}
                            onChange={(e) => setTests(e.target.value)}
                            placeholder="Enter required lab test names..."
                            className="w-full text-xs font-serif p-2 rounded-lg border border-amber-300/80 bg-white text-black pr-8 resize-none h-[60px]"
                          />
                          <VoiceButton onTranscript={(val) => setTests((prev: string) => prev ? prev + "\n" + val : val)} positionClassName="top-2 right-2" />
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              </div>

              {/* Faint Swoosh Background */}
              <div className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] bg-[#fbbd08] opacity-[0.04] rounded-full z-0 pointer-events-none"></div>

              {/* Solid Yellow Footer */}
              <div className="absolute bottom-0 left-0 w-full h-[90px] z-0 pointer-events-none overflow-hidden">
                <svg preserveAspectRatio="none" viewBox="0 0 1000 100" className="w-full h-full">
                  <path d="M0,100 L0,70 Q500,90 1000,10 L1000,100 Z" fill="#fbbd08" />
                </svg>
              </div>

              {/* Consent & Bottom Signatures */}
              <div className="relative z-10 px-12 pb-16 mt-auto flex flex-col justify-end min-h-[220px]">
                <div className="text-center font-bold text-[12px] text-black">Concent</div>
                <div className="text-[10px] text-black leading-tight text-justify mt-1.5 mb-8 font-medium">
                  I, hereby consent to the collection of personal information for medical purposes. This includes demographic details, medical history, and contact information. I understand that this information is essential for accurate diagnosis and treatment planning. I authorize healthcare professionals to administer necessary treatments based on this collected information.I also grant permission for the collection of photos for medical records, research, and promotional activities related to healthcare. These images may be used anonymously to enhance medical understanding, contribute to research initiatives, and for promotional materials. I acknowledge that my personal information and images will be handled with utmost confidentiality and in compliance with applicable privacy laws.
                </div>

                <div className="flex flex-col mb-2 gap-3">
                  <div className="flex items-end">
                    <span className="font-bold text-[13px] text-black w-[80px]">Name :</span>
                    <span className="font-semibold uppercase text-[13px]">{caseRow.full_name}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold text-[13px] text-black w-[80px]">Signature :</span>
                  </div>
                </div>
              </div>

              {/* Bottom Yellow Footer Content overlay */}
              <div className="absolute bottom-3 left-0 w-full z-10 px-12 flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-black font-bold text-[12px] mb-1.5 mr-6">
                  <Phone className="h-3 w-3 text-black shrink-0" />
                  9404306548 | 8867303202
                </div>
                <div className="text-[11px] text-black font-semibold">
                  Address : Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli. 416416
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Medicine Dose Code Tab */}
        {activeCaseTab === "dose_code" && (
          <div className="space-y-6 py-2">
            
            {/* Informational Guidance Banner */}
            <div className="bg-gradient-to-r from-teal-500/10 via-amber-500/10 to-indigo-500/10 border border-teal-500/20 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 shrink-0">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  3-Digit Binary Medicine Dose Code System
                  <Badge variant="outline" className="text-[10px] bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-500/30">
                    String Encoded
                  </Badge>
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The 3 digits correspond to <strong className="text-foreground">Morning (1st)</strong>, <strong className="text-foreground">Afternoon (2nd)</strong>, and <strong className="text-foreground">Evening (3rd)</strong>. Value <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-foreground">1</code> = 1 Tablet, and <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-foreground">0</code> = 0 Tablet (No tablet).
                </p>
              </div>
            </div>

            {/* Medicine Prescription Form & Live Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Form: Medicine Details (7 cols on lg) */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    {editingMedId ? "Edit Medicine Dose" : "Add Medicine Prescription"}
                  </h3>
                  {editingMedId && (
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                      Editing Mode
                    </Badge>
                  )}
                </div>

                <form onSubmit={handleAddOrUpdateMedicine} className="space-y-4">
                  
                  {/* Row 1: Medicine Selection Dropdown & Strength */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                          Medicine Dropdown (औषध यादीतून निवडा) <span className="text-red-500">*</span>
                        </span>
                      </Label>
                      <Select
                        value={medName || undefined}
                        onValueChange={(val) => {
                          const found = COMMON_MEDICINES.find(m => m.name === val);
                          if (found) {
                            setMedName(found.name);
                            setMedStrength(found.strength || "");
                          } else {
                            setMedName(val);
                          }
                        }}
                      >
                        <SelectTrigger className="rounded-xl text-xs h-9 bg-slate-50 dark:bg-slate-800/50 border-teal-500/30 font-medium text-foreground">
                          <SelectValue placeholder="📋 Select Medicine (येथून औषध निवडा)..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[320px]">
                          {Array.from(new Set(COMMON_MEDICINES.map(m => m.category))).map(category => (
                            <div key={category} className="py-1">
                              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 rounded-md my-1">
                                {category}
                              </div>
                              {COMMON_MEDICINES.filter(m => m.category === category).map(med => (
                                <SelectItem key={med.name} value={med.name} className="text-xs py-1.5 cursor-pointer font-medium">
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span className="font-semibold">{med.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">({med.strength})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground mb-1 block">
                        Strength <span className="text-muted-foreground text-[10px]">(Optional)</span>
                      </Label>
                      <Input
                        value={medStrength}
                        onChange={(e) => setMedStrength(e.target.value)}
                        placeholder="e.g. 500mg, 250mg"
                        className="rounded-xl text-xs h-9 bg-slate-50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>

                  {/* Row 2: Dose Code Select */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Dose Code (3-Digit String) <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400">
                        Selected: [{doseCode}] — {DOSE_CODES[doseCode]?.summary || ""}
                      </span>
                    </div>

                    <Select value={doseCode} onValueChange={(val) => setDoseCode(val)}>
                      <SelectTrigger className="rounded-xl text-xs h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 font-mono font-medium">
                        <SelectValue placeholder="Select Dose Code" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-[300px]">
                        {Object.entries(DOSE_CODES).map(([code, details]) => (
                          <SelectItem key={code} value={code} className="text-xs font-mono py-2 cursor-pointer">
                            <span className="font-bold text-teal-700 dark:text-teal-300">[{code}]</span> — {details.label.split('—')[1]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 3: Auto-computed Schedule Breakdown (Read-Only fields as requested) */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                        <Sunrise className="h-3 w-3 text-amber-500" /> Morning
                      </div>
                      <div className="text-xs font-bold text-foreground mt-0.5">
                        {currentMorningDose}
                      </div>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-white/10">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                        <Sun className="h-3 w-3 text-orange-500" /> Afternoon
                      </div>
                      <div className="text-xs font-bold text-foreground mt-0.5">
                        {currentAfternoonDose}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                        <Moon className="h-3 w-3 text-indigo-500" /> Evening
                      </div>
                      <div className="text-xs font-bold text-foreground mt-0.5">
                        {currentEveningDose}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Duration & Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground mb-1 block">
                        Duration (Days) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 5 Days, 7 Days, 15 Days"
                        className="rounded-xl text-xs h-9 bg-slate-50 dark:bg-slate-800/50"
                        required
                      />
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {["3 Days", "5 Days", "7 Days", "15 Days", "30 Days"].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDuration(d)}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/60 transition-colors border border-slate-200 dark:border-white/5 font-medium"
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <Label className="text-xs font-semibold text-foreground mb-1 block">
                        Additional Instructions
                      </Label>
                      <Input
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="e.g. After food, with warm water..."
                        className="rounded-xl text-xs h-9 pr-8 bg-slate-50 dark:bg-slate-800/50"
                      />
                      <VoiceButton 
                        onTranscript={(val) => setInstructions(prev => prev ? prev + " " + val : val)} 
                        positionClassName="top-6 right-1.5" 
                      />
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {["After food", "Before food", "With warm water", "At bedtime"].map((inst) => (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => setInstructions(inst)}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/60 transition-colors border border-slate-200 dark:border-white/5 font-medium"
                          >
                            {inst}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmittingMed}
                      className="rounded-xl text-xs h-9 bg-teal-600 hover:bg-teal-700 text-white font-bold flex-1 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {editingMedId ? (
                        <>
                          <Check className="h-4 w-4" /> Update Medicine (बदल जतन करा)
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Add Medicine (औषध जोडा)
                        </>
                      )}
                    </Button>

                    {editingMedId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="rounded-xl text-xs h-9 font-semibold"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                </form>
              </div>

              {/* Right: Live 3-Card Dose Schedule Preview (5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        Live Dose Schedule Preview
                      </h4>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                        Code: {doseCode}
                      </span>
                    </div>

                    {/* 3 Live Dose Preview Cards */}
                    <div className="space-y-2.5">
                      
                      {/* Card 1: Morning */}
                      <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        doseCode[0] === "1"
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-sm"
                          : "bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 dark:border-white/5 text-muted-foreground opacity-60"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${doseCode[0] === "1" ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                            <Sunrise className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              Morning (सकाळ)
                            </div>
                            <div className="text-[11px] font-medium opacity-80">
                              Time: 08:00 AM – 09:00 AM
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs font-bold ${
                            doseCode[0] === "1" 
                              ? "bg-amber-500 hover:bg-amber-600 text-white" 
                              : "bg-slate-200 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200"
                          }`}>
                            {currentMorningDose}
                          </Badge>
                          <div className="text-[10px] mt-0.5 font-semibold">
                            {doseCode[0] === "1" ? "✓ Scheduled" : "— None"}
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Afternoon */}
                      <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        doseCode[1] === "1"
                          ? "bg-orange-500/10 border-orange-500/40 text-orange-950 dark:text-orange-100 shadow-sm"
                          : "bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 dark:border-white/5 text-muted-foreground opacity-60"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${doseCode[1] === "1" ? "bg-orange-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                            <Sun className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              Afternoon (दुपार)
                            </div>
                            <div className="text-[11px] font-medium opacity-80">
                              Time: 01:00 PM – 02:00 PM
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs font-bold ${
                            doseCode[1] === "1" 
                              ? "bg-orange-500 hover:bg-orange-600 text-white" 
                              : "bg-slate-200 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200"
                          }`}>
                            {currentAfternoonDose}
                          </Badge>
                          <div className="text-[10px] mt-0.5 font-semibold">
                            {doseCode[1] === "1" ? "✓ Scheduled" : "— None"}
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Evening */}
                      <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        doseCode[2] === "1"
                          ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-950 dark:text-indigo-100 shadow-sm"
                          : "bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 dark:border-white/5 text-muted-foreground opacity-60"
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${doseCode[2] === "1" ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                            <Moon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1.5">
                              Evening (रात्र / संध्याकाळ)
                            </div>
                            <div className="text-[11px] font-medium opacity-80">
                              Time: 08:00 PM – 09:00 PM
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-xs font-bold ${
                            doseCode[2] === "1" 
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                              : "bg-slate-200 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200"
                          }`}>
                            {currentEveningDose}
                          </Badge>
                          <div className="text-[10px] mt-0.5 font-semibold">
                            {doseCode[2] === "1" ? "✓ Scheduled" : "— None"}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{medName ? `Selected for "${medName}"` : "Live preview"}</span>
                    <span className="font-bold text-foreground">
                      {(Number(doseCode[0]) + Number(doseCode[1]) + Number(doseCode[2]))} Tablet(s) / Day
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Prescribed Medicines List for this Case Paper */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Prescribed Medicines in this Case Paper
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total {doseMedicines.length} medicine(s) configured with binary dose codes
                  </p>
                </div>

                {doseMedicines.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveCaseTab("case_paper")}
                    className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300"
                  >
                    <FileText className="h-3.5 w-3.5" /> View on A4 Case Paper
                  </Button>
                )}
              </div>

              {doseMedicines.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <Pill className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-medium">No medicines added to this prescription yet.</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Fill the form above, select a dose code (000 - 111), and click "Add Medicine".
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {doseMedicines.map((med, index) => (
                    <div
                      key={med.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-teal-600/10 text-teal-700 dark:text-teal-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{med.name}</span>
                            {med.strength && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                {med.strength}
                              </Badge>
                            )}
                            <Badge className="bg-teal-600 text-white font-mono text-[10px] px-1.5 py-0">
                              Code: {med.dose_code}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-slate-300 dark:border-slate-700">
                              {med.duration}
                            </Badge>
                          </div>

                          {/* Dose timing breakdown tags */}
                          <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-muted-foreground flex-wrap">
                            <span className={`flex items-center gap-1 ${med.morning_dose !== "0 Tablet" ? "text-amber-700 dark:text-amber-300 font-semibold" : ""}`}>
                              <Sunrise className="h-3 w-3" /> Morning: {med.morning_dose}
                            </span>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${med.afternoon_dose !== "0 Tablet" ? "text-orange-700 dark:text-orange-300 font-semibold" : ""}`}>
                              <Sun className="h-3 w-3" /> Afternoon: {med.afternoon_dose}
                            </span>
                            <span>•</span>
                            <span className={`flex items-center gap-1 ${med.evening_dose !== "0 Tablet" ? "text-indigo-700 dark:text-indigo-300 font-semibold" : ""}`}>
                              <Moon className="h-3 w-3" /> Evening: {med.evening_dose}
                            </span>
                          </div>

                          {med.instructions && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                              Instructions: {med.instructions}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMedicine(med)}
                          className="h-8 px-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg gap-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMedicine(med.id)}
                          className="h-8 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Doctor Billing Charges Breakdown Card */}
        <div className="bg-slate-50/90 dark:bg-black/25 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4 my-4 max-w-[800px] mx-auto w-full shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/5 pb-2.5">
            <AlertCircle className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">Billing Charges Breakdown (बिलिंग तपशील)</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Consultation (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={consultationCharge} 
                onChange={(e) => setConsultationCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Medicines (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={medicineCharge} 
                onChange={(e) => setMedicineCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tests (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={testCharge} 
                onChange={(e) => setTestCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Other (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={otherCharge} 
                onChange={(e) => setOtherCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          {/* Total Calculation Row */}
          <div className="flex items-center justify-between rounded-xl border bg-white dark:bg-slate-900/60 px-4 py-3 border-slate-200/60 dark:border-white/10">
            <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Estimated Consultation Total</span>
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">₹ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions panel */}
        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
          <Button 
            variant="outline" 
            onClick={() => save(false)} 
            disabled={saving}
            className="rounded-xl text-xs h-9 font-semibold"
          >
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save Record (जतन करा)
          </Button>
          <Button 
            onClick={() => save(true)} 
            disabled={saving}
            className="rounded-xl text-xs bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-md h-9"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Save & Send to Nurse
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
