import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, query as fsQuery, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { statusColor, statusLabel, doctorName, CaseStatus, calculateAge, parseCaseNotes } from "@/lib/case-utils";
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
  Trash2
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";

export const Route = createFileRoute("/doctor")({
  component: () => (
    <RequireRole allow={["doctor1", "doctor2", "admin"]}>
      <AppShell title="Doctor Dashboard" fullWidth={true}><DoctorPage /></AppShell>
    </RequireRole>
  ),
});

// Advanced clinical doctor metadata mapping for high-end aesthetics
const doctorMeta = {
  doctor1: {
    specialty: "Chief Cardiologist & MD",
    initials: "AM",
    bgClass: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border-teal-500/20",
    colorClass: "text-teal-600 dark:text-teal-400",
    glowClass: "shadow-teal-500/10 dark:shadow-teal-500/5",
  },
  doctor2: {
    specialty: "Senior Consultant & MD",
    initials: "PS",
    bgClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    glowClass: "shadow-indigo-500/10 dark:shadow-indigo-500/5",
  },
};

function DoctorPage() {
  const { role, profileName } = useAuth();
  const docKey = role as "doctor1" | "doctor2";
  const currentDoctorName = profileName || doctorName[docKey];
  const meta = {
    ...(doctorMeta[docKey] || doctorMeta.doctor1),
    initials: currentDoctorName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
  };

  const [cases, setCases] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "reviewing" | "completed">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Note: No orderBy here to avoid requiring a composite Firestore index.
    // Sorting is handled client-side in filteredAndSorted below.
    const q = fsQuery(collection(db, "case_papers"), where("assigned_doctor", "==", docKey));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      setCases(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })).map(parseCaseNotes));
    }, (err: any) => {
      console.error("Doctor cases fetch error:", err);
      toast.error("Failed to load cases: " + err.message);
    });
    return () => unsubscribe();
  }, [docKey]);

  // Sidebar Counts
  const counts = useMemo(() => {
    return {
      all: cases.length,
      pending: cases.filter(c => c.status === "sent_to_doctor").length,
      reviewing: cases.filter(c => c.status === "under_review").length,
      completed: cases.filter(c => ["completed", "returned_to_nurse", "billed"].includes(c.status)).length,
    };
  }, [cases]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = cases;

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

        {/* Integrated Doctor Profile Details (Directly styled in the sidebar without card-in-card) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-muted/40 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 p-3 rounded-2xl">
            <div className={`w-10 h-10 rounded-xl grid place-items-center font-bold text-sm border shrink-0 ${meta.bgClass}`}>
              {meta.initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xs truncate leading-snug text-foreground">{currentDoctorName}</h2>
              <p className="text-[10px] text-muted-foreground truncate font-medium">{meta.specialty}</p>
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
              <div className={`w-8 h-8 rounded-xl grid place-items-center font-bold text-xs ${meta.bgClass}`}>
                {meta.initials}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Logged in as</div>
                <div className="font-semibold text-sm leading-none">{currentDoctorName}</div>
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
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                Hello, <span className={meta.colorClass}>{currentDoctorName.split(" ")[0] === "Dr." ? currentDoctorName.split(" ")[1] : currentDoctorName.split(" ")[0]}</span>!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {counts.pending > 0 
                  ? `You have ${counts.pending} patient case papers waiting for your diagnosis.` 
                  : "All patient checkups are completed. Great job!"}
              </p>
            </div>
            
            {/* Quick Metrics mini card */}
            <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm max-w-fit">
              <TrendingUp className="h-4 w-4" />
              <span>Today's Progress: {counts.completed} / {counts.all} Cases Done</span>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard 
              label="Total Cases" 
              value={counts.all} 
              icon={ClipboardList} 
              color="from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400"
            />
            <StatCard 
              label="Pending" 
              value={counts.pending} 
              icon={Clock} 
              color="from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400"
              pulse={counts.pending > 0}
            />
            <StatCard 
              label="Under Review" 
              value={counts.reviewing} 
              icon={Activity} 
              color="from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400"
            />
            <StatCard 
              label="Completed" 
              value={counts.completed} 
              icon={CheckCircle2} 
              color="from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            />
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
          ) : (
            <div className="space-y-8">
              {casesGroupedByDay.map(({ dateLabel, items }) => (
                <div key={dateLabel} className="space-y-4">
                  {/* Date Heading Divider */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl border dark:border-white/5 select-none">
                      {dateLabel} ({items.length} {items.length === 1 ? "case" : "cases"})
                    </span>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                  </div>
                  
                  {/* Cards Grid for this day */}
                  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {items.map((c) => (
                      <PatientCaseCard 
                        key={c.id} 
                        c={c} 
                        onAccept={() => accept(c)} 
                        onSaved={() => {}} 
                        meta={meta}
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
    <Card className={`
      glass border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col h-full
      ${isPending ? "border-l-4 border-amber-500 bg-amber-500/[0.01]" : ""}
      ${isReviewing ? "border-l-4 border-violet-500 bg-violet-500/[0.01]" : ""}
    `}>
      <CardContent className="p-5 flex flex-col gap-4 flex-grow">
        
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
  const [data, setData] = useState({
    prescription: caseRow.prescription ?? "",
    medical_notes: caseRow.medical_notes ?? "",
    medicines: caseRow.medicines ?? "",
    tests: caseRow.tests ?? "",
    consultation_charge: Number(caseRow.consultation_charge ?? 0),
    medicine_charge: Number(caseRow.medicine_charge ?? 0),
    test_charge: Number(caseRow.test_charge ?? 0),
    other_charge: Number(caseRow.other_charge ?? 0),
  });

  // Re-sync data when dialog opens
  useEffect(() => {
    if (open) {
      setData({
        prescription: caseRow.prescription ?? "",
        medical_notes: caseRow.medical_notes ?? "",
        medicines: caseRow.medicines ?? "",
        tests: caseRow.tests ?? "",
        consultation_charge: Number(caseRow.consultation_charge ?? 0),
        medicine_charge: Number(caseRow.medicine_charge ?? 0),
        test_charge: Number(caseRow.test_charge ?? 0),
        other_charge: Number(caseRow.other_charge ?? 0),
      });
    }
  }, [open, caseRow]);

  const total = Number(data.consultation_charge) + Number(data.medicine_charge) + Number(data.test_charge) + Number(data.other_charge);

  const save = async (sendBack: boolean) => {
    try {
      await updateDoc(doc(db, "case_papers", caseRow.id), {
        ...data,
        total_bill: total,
        ...(sendBack ? { status: "returned_to_nurse" } : {}),
      });
      toast.success(sendBack ? "Case sent back to nurse successfully" : "Case saved");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full rounded-xl flex items-center justify-center gap-1.5 h-9 font-medium hover:bg-primary/5 hover:text-primary transition-colors border-slate-200 dark:border-white/10 bg-background">
          <FileText className="h-4 w-4 text-muted-foreground" /> Open clinical record
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 border-0 shadow-2xl glass">
        
        {/* Header styling */}
        <DialogHeader className="border-b dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary grid place-items-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Clinical Workspace
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Electronic Health Record — Case Paper #{caseRow.id.substring(0,8).toUpperCase()}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Two-Column split workspace */}
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 pt-4 items-start">
          
          {/* LEFT: Patient Clinical Info Sidebar Card */}
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex flex-col gap-4 self-stretch">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Patient Profile</span>
              <h3 className="font-extrabold text-base text-foreground mt-1 uppercase leading-tight truncate">{caseRow.full_name}</h3>
            </div>

            <div className="flex flex-col gap-3 text-xs border-t dark:border-white/5 pt-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase leading-none">Age / DOB</div>
                  <div className="font-semibold text-foreground mt-0.5">{caseRow.age ?? calculateAge(caseRow.dob)} Years ({caseRow.dob})</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase leading-none">Contact</div>
                  <div className="font-semibold text-foreground mt-0.5">{caseRow.mobile || "—"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted-foreground uppercase leading-none">Address</div>
                  <div className="font-semibold text-foreground mt-0.5 truncate" title={caseRow.address}>{caseRow.address}</div>
                </div>
              </div>

              {/* Extended Details in Case Editor */}
              <div className="border-t dark:border-white/5 pt-3 mt-1 grid grid-cols-2 gap-y-3 gap-x-2">
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase leading-none">Marital Status</div>
                  <div className="font-semibold text-foreground mt-0.5 text-[11px] truncate" title={caseRow.marital_status}>{caseRow.marital_status || "—"}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase leading-none">Weight</div>
                  <div className="font-semibold text-foreground mt-0.5 text-[11px] truncate" title={caseRow.weight}>{caseRow.weight || "—"}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase leading-none">Education</div>
                  <div className="font-semibold text-foreground mt-0.5 text-[11px] truncate" title={caseRow.education}>{caseRow.education || "—"}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase leading-none">Occupation</div>
                  <div className="font-semibold text-foreground mt-0.5 text-[11px] truncate" title={caseRow.occupation}>{caseRow.occupation || "—"}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase leading-none">Parent's Occu.</div>
                  <div className="font-semibold text-foreground mt-0.5 text-[11px] truncate" title={caseRow.parents_occupation}>{caseRow.parents_occupation || "—"}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase leading-none">Past History</div>
                  <div className="font-semibold text-foreground mt-0.5 text-[11px] truncate" title={caseRow.past_history}>{caseRow.past_history || "—"}</div>
                </div>
                {caseRow.gender === "Female" && (
                  <div className="col-span-2">
                    <div className="text-[9px] text-pink-600 dark:text-pink-400 uppercase leading-none">Menstrual History</div>
                    <div className="font-semibold text-foreground mt-0.5 text-[11px]">{caseRow.menstrual_history || "—"}</div>
                  </div>
                )}
              </div>
            </div>

            {caseRow.notes && (
              <div className="border-t dark:border-white/5 pt-3 mt-1 flex flex-col gap-1.5">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">
                  Chief Complaints / History
                </span>
                <p className="text-xs text-muted-foreground italic leading-relaxed bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/10">
                  "{caseRow.notes}"
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: clinical inputs and forms */}
          <div className="space-y-6">
            
            {/* Form Sections */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b dark:border-white/5 pb-2">
                <Activity className="h-4.5 w-4.5 text-primary" />
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">Clinical Entry Details</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. Prescription Rx */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prescription" className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Prescription (Rx)</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Medications prescribed</span>
                  </Label>
                  <div className="relative">
                    <Textarea 
                      id="prescription"
                      rows={4}
                      value={data.prescription}
                      onChange={(e) => setData({ ...data, prescription: e.target.value })}
                      placeholder="Enter patient Rx dosage / instructions..."
                      className="rounded-xl pr-10 focus-visible:ring-primary focus-visible:border-primary text-xs resize-none"
                    />
                    <VoiceButton onTranscript={(val) => setData((d) => ({ ...d, prescription: d.prescription ? d.prescription + "\n" + val : val }))} positionClassName="top-3.5" />
                  </div>
                </div>

                {/* 2. Diagnosis Notes */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="medical_notes" className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Diagnosis & Clinical Notes</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Findings & diagnosis</span>
                  </Label>
                  <div className="relative">
                    <Textarea 
                      id="medical_notes"
                      rows={4}
                      value={data.medical_notes}
                      onChange={(e) => setData({ ...data, medical_notes: e.target.value })}
                      placeholder="Enter diagnosis findings / medical checks..."
                      className="rounded-xl pr-10 focus-visible:ring-primary focus-visible:border-primary text-xs resize-none"
                    />
                    <VoiceButton onTranscript={(val) => setData((d) => ({ ...d, medical_notes: d.medical_notes ? d.medical_notes + " " + val : val }))} positionClassName="top-3.5" />
                  </div>
                </div>

                {/* 3. Medicines Ordered */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="medicines" className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Medicines List</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Itemized medicines</span>
                  </Label>
                  <div className="relative">
                    <Textarea 
                      id="medicines"
                      rows={3}
                      value={data.medicines}
                      onChange={(e) => setData({ ...data, medicines: e.target.value })}
                      placeholder="List specific tablets, syrups, oils..."
                      className="rounded-xl pr-10 focus-visible:ring-primary focus-visible:border-primary text-xs resize-none"
                    />
                    <VoiceButton onTranscript={(val) => setData((d) => ({ ...d, medicines: d.medicines ? d.medicines + "\n" + val : val }))} positionClassName="top-3.5" />
                  </div>
                </div>

                {/* 4. Tests Ordered */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tests" className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Clinical Tests</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Lab / radiology tests</span>
                  </Label>
                  <div className="relative">
                    <Textarea 
                      id="tests"
                      rows={3}
                      value={data.tests}
                      onChange={(e) => setData({ ...data, tests: e.target.value })}
                      placeholder="Enter required lab test names..."
                      className="rounded-xl pr-10 focus-visible:ring-primary focus-visible:border-primary text-xs resize-none"
                    />
                    <VoiceButton onTranscript={(val) => setData((d) => ({ ...d, tests: d.tests ? d.tests + "\n" + val : val }))} positionClassName="top-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fees and Billing */}
            <div className="space-y-4 pt-3 border-t dark:border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4.5 w-4.5 text-primary" />
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">Billing Charges Breakdown</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Consultation (₹)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={data.consultation_charge} 
                    onChange={(e) => setData({ ...data, consultation_charge: Number(e.target.value) || 0 })} 
                    className="rounded-xl text-xs h-9 focus-visible:ring-primary"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Medicines (₹)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={data.medicine_charge} 
                    onChange={(e) => setData({ ...data, medicine_charge: Number(e.target.value) || 0 })} 
                    className="rounded-xl text-xs h-9 focus-visible:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Tests (₹)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={data.test_charge} 
                    onChange={(e) => setData({ ...data, test_charge: Number(e.target.value) || 0 })} 
                    className="rounded-xl text-xs h-9 focus-visible:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Other (₹)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={data.other_charge} 
                    onChange={(e) => setData({ ...data, other_charge: Number(e.target.value) || 0 })} 
                    className="rounded-xl text-xs h-9 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Total Calculation Row summary */}
              <div className="flex items-center justify-between rounded-2xl border bg-secondary/20 dark:bg-slate-900/50 px-4 py-3.5 dark:border-white/5">
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estimated Consultation Total</span>
                <span className="text-xl font-extrabold text-primary">₹ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions panel */}
            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t dark:border-white/5">
              <Button 
                variant="outline" 
                onClick={() => save(false)} 
                className="rounded-xl text-xs h-9"
              >
                Save Record
              </Button>
              <Button 
                onClick={() => save(true)} 
                className="rounded-xl text-xs bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-primary-foreground flex items-center gap-1.5 shadow-md h-9"
              >
                <Send className="h-3.5 w-3.5" /> Save & Send to Nurse
              </Button>
            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
