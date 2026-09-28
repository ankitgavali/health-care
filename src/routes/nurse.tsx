import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, query as fsQuery, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, addDoc, serverTimestamp, where } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusColor, statusLabel, doctorName, CaseStatus, calculateAge, parseCaseNotes, convertLeadToPatient, getDoctorDeduplicationKey } from "@/lib/case-utils";
import { generateInvoicePDF, generatePDFFromElementId } from "@/lib/pdf";
import { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";
import { 
  Search, Send, Receipt, Download, Users, ClipboardList, CheckCircle2, 
  Plus, Loader2, FileText, Menu, X, ArrowUpDown, Phone, User, MapPin, 
  Calendar, Stethoscope, TrendingUp, AlertCircle, Clock, Activity, History, Trash2,
  Layers, MessageSquare, Edit3, Printer, ZoomIn
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { VoiceButton } from "@/components/VoiceButton";

import { motion, AnimatePresence } from "framer-motion";

function AnimatedWrapper({ children }: { children: React.ReactNode, index?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {children}
    </div>
  );
}
import { z } from "zod";

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

const LogoSVG = ({ idPrefix = "logo" }: { idPrefix?: string }) => {
  return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG_STRING)}`} className="w-full h-full drop-shadow-lg" alt="Logo" />;
};

export const Route = createFileRoute("/nurse")({
  component: () => (
    <RequireRole allow={["nurse"]}>
      <AppShell title="Nurse Dashboard" fullWidth={true}><NursePage /></AppShell>
    </RequireRole>
  ),
});

const caseSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(500),
  mobile: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "Invalid mobile"),
  dob: z.string().min(1, "DOB required"),
  notes: z.string().max(2000).optional(),
});

function NursePage() {
  const { user, profileName } = useAuth();
  const currentNurseName = profileName || "Clinic Nurse";
  const initials = currentNurseName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const [cases, setCases] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "returned" | "billed" | "leads">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorPick, setDoctorPick] = useState<Record<string, string>>({});
  const [doctorsList, setDoctorsList] = useState<{id: string, name: string}[]>([]);
  
  const casesRef = useRef<any[]>([]);
  useEffect(() => { casesRef.current = cases; }, [cases]);

  useEffect(() => {
    if (!user) return;
    const q = fsQuery(collection(db, "leads"), where("assigned_nurse_id", "==", user.uid));
    const unsubscribeLeads = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Failed to load nurse leads", err);
    });
    return () => unsubscribeLeads();
  }, [user]);

  useEffect(() => {
    const q = fsQuery(collection(db, "case_papers"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const fetched = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      // Check for accepted cases toast
      fetched.forEach((newCase: any) => {
        const oldCase = casesRef.current.find(c => c.id === newCase.id);
        if (oldCase && oldCase.status === "sent_to_doctor" && newCase.status === "under_review") {
          const docName = doctorName[newCase.assigned_doctor as keyof typeof doctorName] || "Doctor";
          toast.success(`Dr. ${docName} has started the consultation for Patient ${newCase.full_name}. Please guide the patient to the doctor's consultation room.`, {
            duration: 8000,
          });
        }
      });
      
      setCases(fetched.map(parseCaseNotes));
    });

    // Fetch dynamic doctors list strictly from database
    const fetchDoctors = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "user_roles"));
        const profilesSnap = await getDocs(collection(db, "profiles"));
        
        const rolesMap = new Map();
        rolesSnap.forEach(d => rolesMap.set(d.id, d.data().role));
        
        const dynamicDocs: { id: string; name: string }[] = [];

        profilesSnap.forEach(d => {
          const r = rolesMap.get(d.id) || d.data().role;
          const fullName = d.data().full_name;
          if ((r === "doctor1" || r === "doctor2" || r === "doctor") && fullName) {
            const docKey = getDoctorDeduplicationKey(fullName);
            const exists = dynamicDocs.some(m => m.id === d.id || (docKey && getDoctorDeduplicationKey(m.name) === docKey));
            if (!exists) {
              dynamicDocs.push({ id: d.id, name: fullName });
            }
          }
        });

        // Also check any doctor in user_roles that might not have a profile doc yet
        rolesSnap.forEach(d => {
          const r = d.data().role;
          if (r === "doctor1" || r === "doctor2" || r === "doctor") {
            const name = d.data().full_name || d.data().name;
            const docKey = getDoctorDeduplicationKey(name || "");
            const exists = dynamicDocs.some(m => m.id === d.id || (docKey && getDoctorDeduplicationKey(m.name) === docKey));
            if (!exists && name) {
              dynamicDocs.push({ id: d.id, name });
            }
          }
        });
        
        setDoctorsList(dynamicDocs);
      } catch (err) {
        console.error("Error fetching doctors", err);
        setDoctorsList([]);
      }
    };
    fetchDoctors();

    return () => unsubscribe();
  }, []);

  // Sidebar Counts
  const counts = useMemo(() => {
    return {
      all: cases.length,
      pending: cases.filter(c => c.status === "submitted").length, // waiting for doctor assignment
      withDoctor: cases.filter(c => ["sent_to_doctor", "under_review"].includes(c.status)).length,
      returned: cases.filter(c => c.status === "returned_to_nurse").length, // consultation done, wait for bill
      billed: cases.filter(c => c.status === "billed").length,
    };
  }, [cases]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = cases;

    // Sidebar Category Filter
    if (activeTab === "pending") {
      result = result.filter(c => c.status === "submitted");
    } else if (activeTab === "returned") {
      result = result.filter(c => c.status === "returned_to_nurse");
    } else if (activeTab === "billed") {
      result = result.filter(c => c.status === "billed");
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
  }, [cases, activeTab, query, sortBy]);

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

  const sendToDoctor = async (c: any) => {
    const docPick = doctorPick[c.id] ?? c.assigned_doctor;
    if (!docPick) return toast.error("Pick a doctor first");
    
    const docObj = doctorsList.find(d => d.id === docPick);
    const assignedDocName = docObj ? docObj.name : (doctorName[docPick as "doctor1" | "doctor2"] || "Doctor");

    try {
      await updateDoc(doc(db, "case_papers", c.id), {
        assigned_doctor: docPick, 
        assigned_doctor_name: assignedDocName,
        status: "sent_to_doctor",
        updated_at: serverTimestamp()
      });
      toast.success("Sent to doctor");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [form, setForm] = useState({ full_name: "", address: "", mobile: "", dob: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const age = useMemo(() => calculateAge(form.dob), [form.dob]);

  const submitNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = caseSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    if (!user) return toast.error("Authentication required");
    setBusy(true);
    try {
      await addDoc(collection(db, "case_papers"), {
        patient_id: user.uid,
        full_name: form.full_name.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        dob: form.dob,
        age,
        notes: JSON.stringify({
          notes: form.notes?.trim() || "",
          marital_status: "",
          education: "",
          occupation: "",
          parents_occupation: "",
          menstrual_history: "",
          past_history: "",
          weight: "",
          gender: "",
        }),
        status: "submitted",
        created_at: new Date().toISOString(),
      });
      toast.success("Patient Case Paper created successfully");
      setForm({ full_name: "", address: "", mobile: "", dob: "", notes: "" });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this case paper?")) return;
    try {
      await deleteDoc(doc(db, "case_papers", id));
      toast.success("Case deleted successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="relative flex w-full min-h-[calc(100vh-76px)]">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed inset-0 -z-20 overflow-hidden">
         <img src="/heart_hologram_bg.png" alt="Nurse Background" className="h-full w-full object-cover opacity-60" />
         <div className="absolute inset-0 bg-white/85 backdrop-blur-[4px] dark:bg-slate-950/85" />
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-card/80 backdrop-blur-xl p-6 border-r flex flex-col gap-5 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        md:sticky md:top-[76px] md:h-[calc(100vh-76px)] md:shrink-0 md:z-20 md:translate-x-0 md:rounded-none md:border-t-0 md:border-b-0 md:border-l-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between border-b dark:border-white/5 pb-4">
          <span className="font-bold tracking-tight text-primary flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <span className="font-serif text-base tracking-wide text-foreground">Moolatvam EMR</span>
          </span>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full md:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-muted/40 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 p-3 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl grid place-items-center font-bold text-sm border shrink-0 bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xs truncate leading-snug text-foreground">{currentNurseName}</h2>
              <p className="text-[10px] text-muted-foreground truncate font-medium">Head Nurse Station</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" /> Active Online
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono font-bold">
              {counts.pending} new
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
            Case Categories
          </p>
          
          <SidebarNavItem 
            icon={ClipboardList} 
            label="All Cases" 
            count={counts.all} 
            active={activeTab === "all"} 
            onClick={() => { setActiveTab("all"); setSidebarOpen(false); }}
            colorClass="text-slate-500 dark:text-slate-400"
          />
          
          <SidebarNavItem 
            icon={User} 
            label="New / Pending" 
            count={counts.pending} 
            active={activeTab === "pending"} 
            onClick={() => { setActiveTab("pending"); setSidebarOpen(false); }}
            colorClass="text-amber-500"
            glow={counts.pending > 0}
          />
          
          <SidebarNavItem 
            icon={Activity} 
            label="Returned from Dr." 
            count={counts.returned} 
            active={activeTab === "returned"} 
            onClick={() => { setActiveTab("returned"); setSidebarOpen(false); }}
            colorClass="text-emerald-500"
            glow={counts.returned > 0}
          />
          
          <SidebarNavItem 
            icon={Receipt} 
            label="Completed & Billed" 
            count={counts.billed} 
            active={activeTab === "billed"} 
            onClick={() => { setActiveTab("billed"); setSidebarOpen(false); }}
            colorClass="text-violet-500"
          />

          <SidebarNavItem 
            icon={Layers} 
            label="My Leads" 
            count={leads.filter(l => !["Converted", "Closed"].includes(l.status)).length} 
            active={activeTab === "leads"} 
            onClick={() => { setActiveTab("leads"); setSidebarOpen(false); }}
            colorClass="text-teal-500"
            glow={leads.filter(l => l.status === "New Lead").length > 0}
          />
        </div>

        <div className="mt-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
               <Button className="w-full gap-2 shadow-md rounded-xl"><Plus className="h-4 w-4" /> New Case Paper</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
               <DialogHeader>
                  <DialogTitle>Create New Case Paper</DialogTitle>
                  <DialogDescription>Register a new patient visit and generate their case paper.</DialogDescription>
               </DialogHeader>
               <form onSubmit={submitNewCase} className="space-y-4 pt-4">
                  <div>
                    <Label>Patient Full Name</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Mobile</Label>
                      <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
                    </div>
                  </div>
                  {form.dob && (
                    <div className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm">
                      Age: <span className="font-semibold">{age}</span> years
                    </div>
                  )}
                  <div>
                    <Label>Chief Complaints / Notes</Label>
                    <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Case Paper
                  </Button>
               </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-auto hidden md:block">
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-4 bg-muted/20 text-center">
            <p className="text-[11px] italic text-muted-foreground leading-normal">
              "Dedicated to serving our patients with care."
            </p>
            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mt-2">
              Moolatvam Ayurved
            </p>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 p-6 md:p-8 min-w-0">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div className="md:hidden flex items-center justify-between p-3 glass rounded-2xl mb-4 border dark:border-white/5">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl grid place-items-center font-bold text-xs bg-rose-500/10 text-rose-600`}>
                {initials}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Logged in as</div>
                <div className="font-semibold text-sm leading-none">{currentNurseName}</div>
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-primary via-teal-500 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
                  {activeTab === "leads" ? "My Leads" : "Nurse Station"}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeTab === "leads" 
                  ? "Manage and follow up on patient leads assigned to you."
                  : counts.pending > 0 
                    ? `You have ${counts.pending} new patient visits waiting to be assigned.` 
                    : "All patients are assigned to doctors. Great job!"}
              </p>
            </div>
            {activeTab !== "leads" && (
              <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm max-w-fit">
                <TrendingUp className="h-4 w-4" />
                <span>Today's Progress: {counts.billed} Billed</span>
              </div>
            )}
          </div>

          {activeTab === "leads" ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-fr items-stretch">
              <AnimatedWrapper index={0}><StatCard label="Total Assigned" value={leads.length} icon={Users} color="from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400" /></AnimatedWrapper>
              <AnimatedWrapper index={1}><StatCard label="Pending" value={leads.filter(l => !["Converted", "Closed"].includes(l.status)).length} icon={Clock} color="from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400" pulse={leads.filter(l => l.status === "New Lead").length > 0} /></AnimatedWrapper>
              <AnimatedWrapper index={2}><StatCard label="Converted" value={leads.filter(l => l.status === "Converted").length} icon={CheckCircle2} color="from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" /></AnimatedWrapper>
              <AnimatedWrapper index={3}><StatCard label="Closed" value={leads.filter(l => l.status === "Closed").length} icon={X} color="from-slate-500/15 to-slate-500/5 text-slate-700 dark:text-slate-400" /></AnimatedWrapper>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-fr items-stretch">
              <AnimatedWrapper index={0}><StatCard label="Total Cases" value={counts.all} icon={Users} color="from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400" /></AnimatedWrapper>
              <AnimatedWrapper index={1}><StatCard label="New / Pending" value={counts.pending} icon={User} color="from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400" pulse={counts.pending > 0} /></AnimatedWrapper>
              <AnimatedWrapper index={2}><StatCard label="Returned" value={counts.returned} icon={Activity} color="from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" pulse={counts.returned > 0} /></AnimatedWrapper>
              <AnimatedWrapper index={3}><StatCard label="Completed" value={counts.billed} icon={Receipt} color="from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400" /></AnimatedWrapper>
            </div>
          )}

          {activeTab === "leads" ? (
            <MyLeadsSection 
              leads={leads} 
              doctorsList={doctorsList} 
              user={user} 
              profileName={currentNurseName} 
            />
          ) : (
            <>
              <div className="glass border dark:border-white/5 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3 justify-between shadow-sm">
                <div className="relative w-full sm:max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search patient name or mobile..." 
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

              {casesGroupedByDay.length === 0 ? (
                <AnimatedWrapper>
                  <Card className="glass border-0 p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 grid place-items-center text-slate-400">
                      <ClipboardList className="h-6 w-6 opacity-70" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">No case papers found</h3>
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
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl border dark:border-white/5 select-none">
                            {dateLabel} ({items.length})
                          </span>
                          <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                        </div>
                        <AnimatePresence mode="popLayout">
                          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2" style={{ gridAutoRows: "1fr", alignItems: "stretch" }}>
                            {items.map((c) => {
                              const cardIdx = globalCardIndex++;
                              return (
                                <AnimatedWrapper key={c.id} index={cardIdx}>
                                  <PatientCaseCard 
                                    c={c} 
                                    doctorPick={doctorPick} 
                                    setDoctorPick={setDoctorPick} 
                                    sendToDoctor={sendToDoctor} 
                                    onDelete={deleteCase}
                                    doctorsList={doctorsList}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  // Extract text color class for the icon
  const textColorClass = color.split(' ').find(c => c.startsWith('text-')) || "text-primary";
  return (
    <Card className={`relative overflow-hidden bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 transition-all duration-300 shadow-md hover:shadow-xl h-full flex flex-col justify-between flex-1 ${pulse ? "ring-2 ring-amber-400/50 shadow-amber-500/10" : ""}`}>
      {/* Subtle colorful glow background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-30 dark:opacity-20 pointer-events-none`} />
      
      <CardContent className="flex items-center gap-4 p-5 relative z-10 h-full flex-1 min-h-[96px]">
        <div className={`grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-100/50 dark:border-white/5 shrink-0 transition-transform group-hover:scale-110`}>
          <Icon className={`h-6 w-6 ${textColorClass} ${pulse ? "animate-bounce" : ""}`} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-slate-800 dark:text-white drop-shadow-sm">{value}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1.5 truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NurseClinicalEditDialog({
  caseRow,
  doctorPick,
  setDoctorPick,
  sendToDoctor,
  doctorsList,
  trigger
}: {
  caseRow: any;
  doctorPick?: Record<string, string>;
  setDoctorPick?: any;
  sendToDoctor?: (c: any) => Promise<void>;
  doctorsList?: { id: string; name: string }[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notes, setNotes] = useState(caseRow.notes || "");
  const [pastHistory, setPastHistory] = useState(caseRow.past_history || "");
  const [menstrualHistory, setMenstrualHistory] = useState(caseRow.menstrual_history || "");
  const [weight, setWeight] = useState(caseRow.weight || "");
  const [consultationCharge, setConsultationCharge] = useState(Number(caseRow.consultation_charge ?? 0));
  const [medicineCharge, setMedicineCharge] = useState(Number(caseRow.medicine_charge ?? 0));
  const [testCharge, setTestCharge] = useState(Number(caseRow.test_charge ?? 0));
  const [otherCharge, setOtherCharge] = useState(Number(caseRow.other_charge ?? 0));

  useEffect(() => {
    if (open) {
      setNotes(caseRow.notes || "");
      setPastHistory(caseRow.past_history || "");
      setMenstrualHistory(caseRow.menstrual_history || "");
      setWeight(caseRow.weight || "");
      setConsultationCharge(Number(caseRow.consultation_charge ?? 0));
      setMedicineCharge(Number(caseRow.medicine_charge ?? 0));
      setTestCharge(Number(caseRow.test_charge ?? 0));
      setOtherCharge(Number(caseRow.other_charge ?? 0));
    }
  }, [open, caseRow]);

  const totalFee = Number(consultationCharge || 0) + Number(medicineCharge || 0) + Number(testCharge || 0) + Number(otherCharge || 0);

  const handleSave = async (andSendDoctor = false) => {
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

      const updatePayload: any = {
        notes: updatedNotesJson,
        consultation_charge: Number(consultationCharge || 0),
        medicine_charge: Number(medicineCharge || 0),
        test_charge: Number(testCharge || 0),
        other_charge: Number(otherCharge || 0),
        total_bill: totalFee,
        updated_at: serverTimestamp()
      };

      await updateDoc(doc(db, "case_papers", caseRow.id), updatePayload);
      toast.success("रुग्ण तक्रारी व इतिहास सेव्ह झाला (Saved successfully!)");
      
      if (andSendDoctor && sendToDoctor) {
        await sendToDoctor({
          ...caseRow,
          notes: notes.trim(),
          past_history: pastHistory.trim(),
          menstrual_history: menstrualHistory.trim(),
          weight: weight.trim(),
        });
      }
      setOpen(false);
    } catch (err: any) {
      toast.error("Failed to save clinical details: " + err.message);
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
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs h-9 gap-1.5 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 font-bold shadow-sm"
          >
            <FileText className="h-3.5 w-3.5 text-amber-600" />
            <span>केस पेपर (Case Paper)</span>
          </Button>
        )}
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
              Patient: <span className="font-bold text-foreground uppercase">{caseRow.full_name}</span> | Visit Date: {new Date(caseRow.created_at).toLocaleDateString("en-IN")}
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
              onClick={() => handleSave(false)}
              disabled={saving}
              className="rounded-xl h-9 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save Details (जतन करा)
            </Button>

            {caseRow.status === "submitted" && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="rounded-xl h-9 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-xs shadow-md"
              >
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Save & Send to Doctor
              </Button>
            )}
          </div>
        </div>

        {/* The Exact A4 Case Paper Layout Container matching Image 3 */}
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
                  <LogoSVG idPrefix={`nurse-case-${caseRow.id}`} />
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

              {/* History Section - 4 labels spread horizontally (Exact Image 3 Layout) */}
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

              {/* Actual interactive data inputs for History & Clinical details */}
              <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-4 w-full mb-6">
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

              {/* Doctor's Notes & Prescription (If available) */}
              {(caseRow.prescription || caseRow.medical_notes) && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  {caseRow.medical_notes && (
                    <div className="mb-4">
                      <div className="font-bold mb-1 underline">Diagnosis:</div>
                      <div className="whitespace-pre-wrap font-medium">{caseRow.medical_notes}</div>
                    </div>
                  )}
                  {caseRow.prescription && (
                    <div>
                      <div className="font-serif font-bold text-2xl mb-1 text-[#b45309]">Rx</div>
                      <div className="whitespace-pre-wrap font-medium">{caseRow.prescription}</div>
                    </div>
                  )}
                </div>
              )}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                9404306548 | 8867303202
              </div>
              <div className="text-[11px] text-black font-semibold">
                Address : Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli. 416416
              </div>
            </div>
          </div>
        </div>

        {/* Nurse Direct Billing Charges Breakdown Card */}
        <div className="bg-slate-50/90 dark:bg-black/25 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4 my-4 max-w-[800px] mx-auto w-full shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/5 pb-2.5">
            <AlertCircle className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">Billing Charges Breakdown (बिलिंग तपशील)</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Consultation (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={consultationCharge} 
                onChange={(e) => setConsultationCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Medicines (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={medicineCharge} 
                onChange={(e) => setMedicineCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Tests (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={testCharge} 
                onChange={(e) => setTestCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Other (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={otherCharge} 
                onChange={(e) => setOtherCharge(Number(e.target.value) || 0)} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          {/* Total Calculation Preview */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/10">
            <span className="font-extrabold text-foreground tracking-wide uppercase text-[11px]">Estimated Consultation Total</span>
            <span className="font-black text-base sm:text-lg text-teal-600 dark:text-teal-400">₹ {totalFee.toFixed(2)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PatientCaseCard({ c, doctorPick, setDoctorPick, sendToDoctor, onDelete, doctorsList }: any) {
  const [expanded, setExpanded] = useState(false);
  const isPending = c.status === "submitted";
  const initials = c.full_name ? c.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "PT";
  const hasClinicalDetails = Boolean(c.notes || c.past_history || c.menstrual_history);

  const relativeTime = useMemo(() => {
    if (!c.created_at) return "Unknown";
    const date = c.created_at.toDate ? c.created_at.toDate() : new Date(c.created_at);
    const elapsed = Date.now() - date.getTime();
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }, [c.created_at]);

  return (
    <Card 
      style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", minHeight: 0 }}
      className={`
      relative bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl overflow-hidden h-full flex flex-col flex-1 justify-between
      ${isPending ? "border-l-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]" : ""}
    `}
    >
      <CardContent style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }} className="p-5 gap-4 justify-between">
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
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <NurseClinicalEditDialog
              caseRow={c}
              doctorPick={doctorPick}
              setDoctorPick={setDoctorPick}
              sendToDoctor={sendToDoctor}
              doctorsList={doctorsList}
              trigger={
                <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 rounded-xl border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 font-bold gap-1 shadow-2xs">
                  <FileText className="h-3 w-3 text-amber-600" /> Case Paper
                </Button>
              }
            />
            <Badge className={`${statusColor[c.status as CaseStatus] || ""} text-[10px] font-semibold border`} variant="outline">
              {statusLabel[c.status as CaseStatus] || c.status}
            </Badge>
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)} className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Age / Gender</span>
            <span className="font-semibold text-foreground mt-0.5 truncate">{String(c.age ?? calculateAge(c.dob))} Y {c.gender ? `/ ${c.gender}` : ''}</span>
          </div>
          <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Mobile Contact</span>
            <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1 truncate">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{c.mobile || "—"}</span>
            </span>
          </div>
          <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col col-span-2">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Address</span>
            <span className="font-semibold text-foreground mt-0.5 truncate">{c.address || "—"}</span>
          </div>
        </div>

        {/* Patient Details & Clinical History */}
        <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-3.5 bg-muted/10 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-primary flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              तक्रारी व इतिहास (Complaints & History)
            </span>
            <div className="flex items-center gap-2">
              <NurseClinicalEditDialog
                caseRow={c}
                doctorPick={doctorPick}
                setDoctorPick={setDoctorPick}
                sendToDoctor={sendToDoctor}
                doctorsList={doctorsList}
                trigger={
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 font-bold">
                    <Edit3 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                }
              />
              <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-muted-foreground hover:text-foreground font-semibold">
                {expanded ? "Less" : "Details"}
              </button>
            </div>
          </div>

          {/* Notice if complaints & past history not yet entered */}
          {!hasClinicalDetails && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>तक्रारी व इतिहास नोंदवलेले नाहीत</span>
              </div>
              <NurseClinicalEditDialog
                caseRow={c}
                doctorPick={doctorPick}
                setDoctorPick={setDoctorPick}
                sendToDoctor={sendToDoctor}
                doctorsList={doctorsList}
                trigger={
                  <Button size="sm" className="h-7 text-[11px] px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm">
                    + नोंदवा (Add)
                  </Button>
                }
              />
            </div>
          )}

          {/* Chief Complaints Display */}
          {c.notes && (
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-xl p-2.5">
              <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                Chief Complaints / लक्षणे:
              </span>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line font-medium">
                {c.notes}
              </p>
            </div>
          )}

          {/* Past History Display */}
          {c.past_history && (
            <div className="bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/15 rounded-xl p-2.5">
              <span className="text-[9px] uppercase tracking-wider font-bold text-teal-700 dark:text-teal-400 block mb-0.5">
                मागील इतिहास (Past History):
              </span>
              <p className="text-xs text-foreground leading-relaxed font-medium">
                {c.past_history}
              </p>
            </div>
          )}

          {/* Menstrual History Display if any */}
          {c.menstrual_history && (
            <div className="bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/15 rounded-xl p-2.5">
              <span className="text-[9px] uppercase tracking-wider font-bold text-pink-700 dark:text-pink-400 block mb-0.5">
                पाळीचा इतिहास:
              </span>
              <p className="text-xs text-foreground leading-relaxed font-medium">
                {c.menstrual_history}
              </p>
            </div>
          )}

          {expanded && (
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs pt-2 border-t dark:border-white/5">
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
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <NurseClinicalEditDialog
              caseRow={c}
              doctorPick={doctorPick}
              setDoctorPick={setDoctorPick}
              sendToDoctor={sendToDoctor}
              doctorsList={doctorsList}
            />
            <BillingDialog caseRow={c} />
            {c.total_bill ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                ₹ {Number(c.total_bill).toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-2 flex flex-col gap-2">
          {c.status === "submitted" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={doctorPick[c.id] || c.assigned_doctor || ""}
                onValueChange={(val) => setDoctorPick((p: any) => ({ ...p, [c.id]: val }))}
              >
                <SelectTrigger className="w-full sm:w-[200px] h-9 rounded-xl"><SelectValue placeholder="Pick doctor" /></SelectTrigger>
                <SelectContent>
                  {doctorsList.map((doc: any) => (
                    <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={() => sendToDoctor(c)}
                className="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 h-9 font-semibold text-xs"
              >
                <Send className="mr-1.5 h-4 w-4" /> Send to Dr.
              </Button>
            </div>
          )}

          {["returned_to_nurse", "billed", "completed"].includes(c.status) && (
            <div className="flex flex-wrap gap-2">
              <InvoicePreviewDialog
                caseRow={c}
                trigger={
                  <Button size="sm" variant="outline" className="rounded-xl h-9 text-xs">
                    <Download className="mr-1.5 h-4 w-4" /> Download Bill
                  </Button>
                }
              />
              <Button size="sm" variant="outline" onClick={() => {
                const tId = toast.loading("Preparing Print...");
                try {
                  generateInvoicePDF(c, "print");
                  toast.success("Print dialog opened!", { id: tId });
                } catch (e: any) {
                  toast.error(`Failed to print Invoice`, { id: tId });
                }
              }} className="rounded-xl h-9 text-xs">
                <Printer className="mr-1.5 h-4 w-4" /> Print Bill
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BillingDialog({ caseRow }: { caseRow: any }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bill, setBill] = useState({
    consultation_charge: Number(caseRow.consultation_charge ?? 0),
    medicine_charge: Number(caseRow.medicine_charge ?? 0),
    test_charge: Number(caseRow.test_charge ?? 0),
    other_charge: Number(caseRow.other_charge ?? 0),
  });

  useEffect(() => {
    if (open) {
      setBill({
        consultation_charge: Number(caseRow.consultation_charge ?? 0),
        medicine_charge: Number(caseRow.medicine_charge ?? 0),
        test_charge: Number(caseRow.test_charge ?? 0),
        other_charge: Number(caseRow.other_charge ?? 0),
      });
    }
  }, [open, caseRow]);

  const total = Number(bill.consultation_charge || 0) + Number(bill.medicine_charge || 0) + Number(bill.test_charge || 0) + Number(bill.other_charge || 0);

  const saveBill = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "case_papers", caseRow.id), {
        consultation_charge: Number(bill.consultation_charge || 0),
        medicine_charge: Number(bill.medicine_charge || 0),
        test_charge: Number(bill.test_charge || 0),
        other_charge: Number(bill.other_charge || 0),
        total_bill: total,
        status: "billed",
        updated_at: serverTimestamp()
      });
      toast.success("Bill generated & saved successfully!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm">
          <Receipt className="mr-1.5 h-3.5 w-3.5" /> Billing / Checkout
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl w-[94vw] rounded-3xl p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl">
        <DialogHeader className="border-b border-slate-200/60 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground">Billing & Checkout (बिलिंग)</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Patient: <span className="font-bold text-foreground uppercase">{caseRow.full_name}</span> | Doctor: {caseRow.assigned_doctor_name || "Doctor"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Fees and Billing Card style matching screenshot */}
        <div className="bg-white dark:bg-black/25 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4 my-2 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/5 pb-2.5">
            <AlertCircle className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">Billing Charges Breakdown</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Consultation (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={bill.consultation_charge} 
                onChange={(e) => setBill({ ...bill, consultation_charge: Number(e.target.value) || 0 })} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Medicines (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={bill.medicine_charge} 
                onChange={(e) => setBill({ ...bill, medicine_charge: Number(e.target.value) || 0 })} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Tests (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={bill.test_charge} 
                onChange={(e) => setBill({ ...bill, test_charge: Number(e.target.value) || 0 })} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Other (₹)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={bill.other_charge} 
                onChange={(e) => setBill({ ...bill, other_charge: Number(e.target.value) || 0 })} 
                className="rounded-xl text-xs h-9 focus-visible:ring-teal-500 bg-background border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          {/* Total Calculation Preview */}
          <div className="flex items-center justify-between bg-slate-100/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/10">
            <span className="font-extrabold text-foreground tracking-wide uppercase text-[11px]">Estimated Consultation Total</span>
            <span className="font-black text-base sm:text-lg text-teal-600 dark:text-teal-400">₹ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-10 text-xs font-semibold">
            Cancel
          </Button>
          <Button onClick={saveBill} disabled={saving} className="rounded-xl h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            Save & Mark as Billed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MyLeadsSection({ leads, doctorsList, user, profileName }: { leads: any[]; doctorsList: any[]; user: any; profileName: string }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [newFollowupText, setNewFollowupText] = useState("");
  const [busy, setBusy] = useState(false);

  // local state for editing within dialog
  const [editStatus, setEditStatus] = useState("");
  const [editDoctor, setEditDoctor] = useState("");
  const [editDate, setEditDate] = useState("");

  useEffect(() => {
    if (selectedLead) {
      setEditStatus(selectedLead.status || "New Lead");
      setEditDoctor(selectedLead.preferred_doctor || "");
      setEditDate(selectedLead.appointment_date || "");
      setNewFollowupText("");
    }
  }, [selectedLead]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const patientName = l.patient_name || "";
      const mobile = l.mobile || "";
      const matchesSearch =
        patientName.toLowerCase().includes(query.toLowerCase()) ||
        mobile.includes(query);
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || l.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [leads, query, statusFilter, priorityFilter]);

  const priorityColor = (p: string) => {
    switch (p) {
      case "High": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
      case "Medium": return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      default: return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50";
    }
  };

  const statusColorMap = (s: string) => {
    switch (s) {
      case "New Lead": return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
      case "Contacted": return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30";
      case "Appointment Scheduled": return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "Patient Visited": return "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30";
      case "Converted": return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      default: return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50";
    }
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    setBusy(true);
    try {
      const selectedDocObj = doctorsList.find(d => d.id === editDoctor);
      const docNameStr = selectedDocObj ? selectedDocObj.name : (doctorName[editDoctor as "doctor1" | "doctor2"] || "");

      let followups = selectedLead.followups || [];
      if (newFollowupText.trim()) {
        followups = [
          ...followups,
          {
            note: newFollowupText.trim(),
            date: new Date().toISOString(),
            nurse_name: profileName || "Nurse"
          }
        ];
      }

      const updateData: any = {
        status: editStatus,
        preferred_doctor: editDoctor,
        preferred_doctor_name: docNameStr,
        appointment_date: editDate,
        followups,
        updated_at: new Date().toISOString()
      };

      if (editStatus === "Converted" && selectedLead.status !== "Converted") {
        const leadWithUpdates = { ...selectedLead, ...updateData };
        await convertLeadToPatient(leadWithUpdates);
        toast.success("Lead converted to patient profile successfully!");
      } else {
        await updateDoc(doc(db, "leads", selectedLead.id), updateData);
        toast.success("Lead updated successfully!");
      }

      setIsActionOpen(false);
      setSelectedLead(null);
    } catch (err: any) {
      toast.error("Failed to update lead: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickConvert = async (lead: any) => {
    setBusy(true);
    const toastId = toast.loading("Converting lead to patient profile...");
    try {
      await convertLeadToPatient(lead);
      toast.success("Lead converted to patient profile successfully!", { id: toastId });
    } catch (err: any) {
      toast.error("Conversion failed: " + err.message, { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  const handleQuickMarkVisited = async (lead: any) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, "leads", lead.id), {
        status: "Patient Visited",
        updated_at: new Date().toISOString()
      });
      toast.success("Lead marked as Patient Visited!");
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="glass border dark:border-white/5 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-3 justify-between shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patient name or mobile..."
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
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end text-xs">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-background/50 w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New Lead">New Lead</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Appointment Scheduled">Appointment Scheduled</SelectItem>
              <SelectItem value="Patient Visited">Patient Visited</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={priorityFilter => setPriorityFilter(priorityFilter)}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-background/50 w-[120px]">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          {(query || statusFilter !== "all" || priorityFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
              className="rounded-xl text-xs h-8 border-dashed"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Leads Grid */}
      {filteredLeads.length === 0 ? (
        <Card className="glass border-0 p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 grid place-items-center text-slate-400">
            <Layers className="h-6 w-6 opacity-70" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">No leads found</h3>
            <p className="text-xs text-muted-foreground mt-1">There are no leads assigned to you matching the criteria.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2" style={{ gridAutoRows: "1fr", alignItems: "stretch" }}>
          {filteredLeads.map((l, index) => {
            const initials = l.patient_name ? l.patient_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "LD";
            const dateStr = l.appointment_date 
              ? new Date(l.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "Unscheduled";

            return (
              <AnimatedWrapper key={l.id} index={index}>
                <Card 
                  style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", minHeight: 0 }}
                  className={`glass border-0 rounded-2xl overflow-hidden flex flex-col h-full flex-1 w-full border-l-4 ${
                    l.status === "New Lead" ? "border-blue-500 bg-blue-500/[0.01]" : 
                    l.status === "Converted" ? "border-emerald-500 bg-emerald-500/[0.01]" : 
                    "border-slate-200 dark:border-slate-800"
                  }`}
                >
                <CardContent style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }} className="p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border dark:border-white/5 font-bold text-xs grid place-items-center">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wide leading-tight">{l.patient_name}</h3>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>Assigned: {l.created_at ? new Date(l.created_at).toLocaleDateString("en-IN") : "Just now"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`${statusColorMap(l.status)} text-[10px] font-semibold border`} variant="outline">
                        {l.status}
                      </Badge>
                      <Badge className={`${priorityColor(l.priority)} text-[10px] font-semibold border`} variant="outline">
                        {l.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Mobile Contact</span>
                      <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{l.mobile || "—"}</span>
                      </span>
                    </div>
                    <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Age / Gender</span>
                      <span className="font-semibold text-foreground mt-0.5 truncate">{l.age} Y / {l.gender}</span>
                    </div>
                    <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Preferred Doctor</span>
                      <span className="font-semibold text-foreground mt-0.5 truncate">{l.preferred_doctor_name || "Any Doctor"}</span>
                    </div>
                    <div className="bg-muted/30 border border-muted/50 rounded-xl px-3 py-2 flex flex-col">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Appt Date</span>
                      <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1 truncate">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  {l.problem && (
                    <div className="border border-slate-100 dark:border-white/5 rounded-xl p-3 bg-muted/10">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-primary block mb-1">
                        Reason for Visit / Problem:
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        {l.problem}
                      </p>
                    </div>
                  )}

                  {/* Followups timeline if present */}
                  {l.followups && l.followups.length > 0 && (
                    <div className="border border-slate-100 dark:border-white/5 rounded-xl p-3 bg-muted/5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                        Latest Follow-up:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        "{l.followups[l.followups.length - 1].note}"
                      </p>
                      <span className="text-[9px] text-muted-foreground mt-0.5 block">
                        — By {l.followups[l.followups.length - 1].nurse_name} on {new Date(l.followups[l.followups.length - 1].date).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t dark:border-white/5">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { setSelectedLead(l); setIsActionOpen(true); }}
                      className="rounded-xl flex-1 text-xs h-9 bg-background hover:bg-muted"
                    >
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Action / Notes
                    </Button>

                    {l.status !== "Converted" && l.status !== "Closed" && (
                      <div className="flex gap-2">
                        {l.status !== "Patient Visited" && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleQuickMarkVisited(l)}
                            disabled={busy}
                            className="rounded-xl text-xs h-9"
                          >
                            Mark Visited
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => handleQuickConvert(l)}
                          disabled={busy}
                          className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          Convert
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </AnimatedWrapper>
            );
          })}
        </div>
      )}

      {/* Action / Notes Dialog */}
      <Dialog open={isActionOpen} onOpenChange={(open) => { setIsActionOpen(open); if(!open) setSelectedLead(null); }}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle>Lead Follow-up & Actions</DialogTitle>
            <DialogDescription>Update lead details, add timeline comments, or convert to a patient.</DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 border rounded-2xl p-3.5">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Patient Name</span>
                  <span className="font-bold text-sm text-foreground">{selectedLead.patient_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Mobile Contact</span>
                  <span className="font-bold text-sm text-foreground">{selectedLead.mobile}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Age & Gender</span>
                  <span className="font-semibold text-foreground">{selectedLead.age} Y / {selectedLead.gender}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-muted-foreground block uppercase font-medium">Source & Priority</span>
                  <span className="font-semibold text-foreground">{selectedLead.source} ({selectedLead.priority})</span>
                </div>
              </div>

              {/* Status Update */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Lead Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-9 text-xs rounded-xl mt-1.5 bg-background">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Lead">New Lead</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Appointment Scheduled">Appointment Scheduled</SelectItem>
                      <SelectItem value="Patient Visited">Patient Visited</SelectItem>
                      <SelectItem value="Converted">Converted</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Preferred Doctor</Label>
                  <Select value={editDoctor} onValueChange={setEditDoctor}>
                    <SelectTrigger className="h-9 text-xs rounded-xl mt-1.5 bg-background">
                      <SelectValue placeholder="Any Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctorsList.map((doc: any) => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Appt Date */}
              <div>
                <Label className="text-xs">Appointment Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-9 text-xs rounded-xl mt-1.5 bg-background"
                />
              </div>

              {/* Followups History */}
              {selectedLead.followups && selectedLead.followups.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Follow-up Timeline</Label>
                  <div className="max-h-[120px] overflow-y-auto border rounded-xl p-3 bg-muted/20 space-y-3.5">
                    {selectedLead.followups.map((f: any, idx: number) => (
                      <div key={idx} className="text-xs border-b dark:border-white/5 last:border-0 pb-2 last:pb-0">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium mb-1">
                          <span>{f.nurse_name}</span>
                          <span>{new Date(f.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-normal font-medium">"{f.note}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Followup Text */}
              <div>
                <Label className="text-xs">Add Follow-up Remark / Note</Label>
                <Textarea
                  placeholder="Enter patient response, follow-up status, or notes..."
                  value={newFollowupText}
                  onChange={(e) => setNewFollowupText(e.target.value)}
                  rows={2}
                  className="text-xs mt-1.5 rounded-xl resize-none"
                />
              </div>

              <Button
                onClick={handleUpdateLead}
                disabled={busy}
                className="w-full rounded-xl h-11 bg-primary text-white font-semibold shadow-md mt-2"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span>{editStatus === "Converted" ? "Convert & Save Lead" : "Save Changes"}</span>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
