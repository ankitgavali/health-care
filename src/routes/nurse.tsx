import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, query as fsQuery, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
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
import { statusColor, statusLabel, doctorName, CaseStatus, calculateAge, parseCaseNotes } from "@/lib/case-utils";
import { generateInvoicePDF } from "@/lib/pdf";
import { 
  Search, Send, Receipt, Download, Users, ClipboardList, CheckCircle2, 
  Plus, Loader2, FileText, Menu, X, ArrowUpDown, Phone, User, MapPin, 
  Calendar, Stethoscope, TrendingUp, AlertCircle, Clock, Activity, History, Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

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
  const { user } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "returned" | "billed">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorPick, setDoctorPick] = useState<Record<string, "doctor1" | "doctor2">>({});
  
  const casesRef = useRef<any[]>([]);
  useEffect(() => { casesRef.current = cases; }, [cases]);

  useEffect(() => {
    const q = fsQuery(collection(db, "case_papers"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const fetched = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      // Check for accepted cases toast
      fetched.forEach((newCase: any) => {
        const oldCase = casesRef.current.find(c => c.id === newCase.id);
        if (oldCase && oldCase.status === "sent_to_doctor" && newCase.status === "under_review") {
          toast.success(`Doctor has accepted the case for ${newCase.full_name}`);
        }
      });
      
      setCases(fetched.map(parseCaseNotes));
    });
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
    try {
      await updateDoc(doc(db, "case_papers", c.id), {
        assigned_doctor: docPick, status: "sent_to_doctor",
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
        notes: form.notes?.trim() || null,
        status: "submitted",
        created_at: serverTimestamp(),
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
              NR
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xs truncate leading-snug text-foreground">Clinic Nurse</h2>
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
                NR
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Logged in as</div>
                <div className="font-semibold text-sm leading-none">Clinic Nurse</div>
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
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                Nurse Station
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {counts.pending > 0 
                  ? `You have ${counts.pending} new patient visits waiting to be assigned.` 
                  : "All patients are assigned to doctors. Great job!"}
              </p>
            </div>
            <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm max-w-fit">
              <TrendingUp className="h-4 w-4" />
              <span>Today's Progress: {counts.billed} Billed</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Cases" value={counts.all} icon={Users} color="from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400" />
            <StatCard label="New / Pending" value={counts.pending} icon={User} color="from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400" pulse={counts.pending > 0} />
            <StatCard label="Returned" value={counts.returned} icon={Activity} color="from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" pulse={counts.returned > 0} />
            <StatCard label="Completed" value={counts.billed} icon={Receipt} color="from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400" />
          </div>

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
            <Card className="glass border-0 p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 grid place-items-center text-slate-400">
                <ClipboardList className="h-6 w-6 opacity-70" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">No case papers found</h3>
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {casesGroupedByDay.map(({ dateLabel, items }) => (
                <div key={dateLabel} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl border dark:border-white/5 select-none">
                      {dateLabel} ({items.length})
                    </span>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                    {items.map((c) => (
                      <PatientCaseCard 
                        key={c.id} 
                        c={c} 
                        doctorPick={doctorPick}
                        setDoctorPick={setDoctorPick}
                        sendToDoctor={sendToDoctor}
                        onDelete={deleteCase}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
  return (
    <Card className={`glass border-0 bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md ${pulse ? "ring-1 ring-amber-500/30" : ""} ${color}`}>
      <CardContent className="flex items-center gap-3.5 p-4.5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-background/80 shadow-sm border border-black/5 dark:border-white/5 shrink-0">
          <Icon className={`h-5.5 w-5.5 ${pulse ? "animate-bounce" : ""}`} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold tracking-tight leading-none text-foreground">{value}</div>
          <div className="text-[11px] text-muted-foreground font-medium mt-1 truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientCaseCard({ c, doctorPick, setDoctorPick, sendToDoctor, onDelete }: any) {
  const [expanded, setExpanded] = useState(false);
  const isPending = c.status === "submitted";
  const initials = c.full_name ? c.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "PT";

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
    <Card className={`
      glass border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col h-full
      ${isPending ? "border-l-4 border-amber-500 bg-amber-500/[0.01]" : ""}
    `}>
      <CardContent className="p-5 flex flex-col gap-4 flex-grow">
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

        <div className="border border-slate-100 dark:border-white/5 rounded-xl p-3 bg-muted/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-primary block">
              Patient History & Details
            </span>
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary hover:underline font-bold">
              {expanded ? "Hide Details" : "Show Full Details"}
            </button>
          </div>
          {expanded && (
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

        <div className="mt-auto pt-2 flex flex-col gap-2">
          {c.status === "submitted" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={doctorPick[c.id] ?? c.assigned_doctor ?? ""}
                onValueChange={(v) => setDoctorPick({ ...doctorPick, [c.id]: v as "doctor1" | "doctor2" })}
              >
                <SelectTrigger className="w-full sm:w-[200px] h-9 rounded-xl"><SelectValue placeholder="Pick doctor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor1">{doctorName.doctor1}</SelectItem>
                  <SelectItem value="doctor2">{doctorName.doctor2}</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={() => sendToDoctor(c)}
                className="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 h-9"
              >
                <Send className="mr-1.5 h-4 w-4" /> Send to Dr.
              </Button>
            </div>
          )}

          {["returned_to_nurse", "billed"].includes(c.status) && (
            <div className="flex flex-wrap gap-2">
              <BillingDialog caseRow={c} />
              {c.status === "billed" && (
                <Button size="sm" variant="outline" onClick={() => {
                  const tId = toast.loading("Generating Invoice PDF...");
                  try {
                    generateInvoicePDF(c);
                    toast.success("Invoice generated successfully!", { id: tId });
                  } catch (e: any) {
                    toast.error(`Failed to generate Invoice`, { id: tId });
                  }
                }} className="rounded-xl h-9">
                  <Download className="mr-1.5 h-4 w-4" /> Invoice PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BillingDialog({ caseRow }: { caseRow: any }) {
  const [open, setOpen] = useState(false);
  const [bill, setBill] = useState({
    consultation_charge: Number(caseRow.consultation_charge ?? 0),
    medicine_charge: Number(caseRow.medicine_charge ?? 0),
    test_charge: Number(caseRow.test_charge ?? 0),
    other_charge: Number(caseRow.other_charge ?? 0),
  });
  const total = bill.consultation_charge + bill.medicine_charge + bill.test_charge + bill.other_charge;

  const saveBill = async () => {
    try {
      await updateDoc(doc(db, "case_papers", caseRow.id), {
        ...bill,
        total_bill: total,
        status: "billed",
        updated_at: serverTimestamp()
      });
      toast.success("Bill generated & saved");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white"><Receipt className="mr-1.5 h-4 w-4" /> Billing / Checkout</Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl p-6">
        <DialogHeader><DialogTitle>Generate Bill — {caseRow.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-4">
          {(["consultation_charge", "medicine_charge", "test_charge", "other_charge"] as const).map((k) => (
            <div key={k}>
              <Label className="capitalize">{k.replace("_", " ").replace("charge", "charge (₹)")}</Label>
              <Input type="number" min="0" step="0.01" value={bill[k]} className="rounded-xl mt-1"
                onChange={(e) => setBill({ ...bill, [k]: Number(e.target.value) || 0 })} />
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 mt-4">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">Total Bill</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">₹ {total.toFixed(2)}</span>
          </div>
          <Button onClick={saveBill} className="w-full rounded-xl h-11 mt-2">Save & Mark as Billed</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
