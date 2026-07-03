import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { db, firebaseConfig } from "@/firebase";
import { collection, query as fsQuery, orderBy, onSnapshot, doc, updateDoc, setDoc, where, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getHomepageSettings, saveHomepageSettings, HomepageSettings, ServiceItem } from "@/lib/settings";
import { generateInvoicePDF } from "@/lib/pdf";
import { statusColor, statusLabel, doctorName, CaseStatus, calculateAge, parseCaseNotes, convertLeadToPatient } from "@/lib/case-utils";
import * as Lucide from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouter } from "@tanstack/react-router";

// Recharts imports for the Dashboard statistics
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";

import {
  LayoutDashboard,
  HeartPulse,
  Activity,
  ShieldCheck,
  FileText,
  Users,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  QrCode,
  Search,
  Receipt,
  Download,
  Loader2,
  Printer,
  Edit3,
  ExternalLink,
  Settings,
  Menu,
  Globe,
  MessageSquare,
  LogOut,
  Stethoscope,
  ChevronDown,
  User,
  Calendar,
  Layers,
  FileSpreadsheet,
  Coins,
  Clock
} from "lucide-react";

// Server function to resolve the local network IP address
export const getLocalIpServer = async () => {
  return "localhost";
};

const AVAILABLE_ICONS = [
  "Stethoscope",
  "HeartPulse",
  "ShieldCheck",
  "Activity",
  "FileText",
  "Users",
  "ClipboardList",
  "Mail",
  "Phone",
  "MapPin",
  "CheckCircle2",
  "Settings",
  "Brain",
  "User"
];

const AVAILABLE_IMAGES = [
  { label: "Writing Case Papers (Doctor/Nurse)", value: "/hero_bg_write.png" },
  { label: "Consultation (Doctor & Patient)", value: "/hero_bg_consult.png" },
  { label: "Patient Care (Treatment)", value: "/hero_bg_care.png" },
  { label: "Hospital Interior (Modern Reception)", value: "/hospital_bg.png" },
  { label: "Medical Diagnostics / Devices", value: "/hospital_bg_2.png" },
  { label: "Doctor Team Highlight", value: "/hero_bg_doctor.png" },
  { label: "Premium Medical Graphic / Heart", value: "/premium_bg.png" },
  { label: "Clinical Stats Background", value: "/stats_bg.png" }
];

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireRole allow={["admin"]}>
      <AdminPage />
    </RequireRole>
  ),
});

function AdminPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = fsQuery(collection(db, "case_papers"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(parseCaseNotes));
      setLoading(false);
    }, (error) => {
      toast.error(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    router.navigate({ to: "/" });
  };

  // Grouped Navigation Items for a professional layout
  const navigationGroups = [
    {
      title: "Core Overview",
      items: [
        { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Clinic Config",
      items: [
        { value: "services", label: "Services", icon: Settings },
        { value: "staff", label: "Manage Staff", icon: Users },
      ],
    },
    {
      title: "Finance & Operations",
      items: [
        { value: "invoice", label: "Invoices & Billing", icon: Receipt },
        { value: "qrcode", label: "QR Check-In", icon: QrCode },
        { value: "leads", label: "Lead Management", icon: Layers },
        { value: "contact", label: "Contact Details", icon: Mail },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc] dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      {/* ═══════════════ DESKTOP SIDEBAR ═══════════════ */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shrink-0 h-screen sticky top-0 z-30 justify-between">
        <div className="flex flex-col overflow-y-auto">
          {/* Logo Brand Header */}
          <div className="group h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 transform transition-transform duration-300 group-hover:scale-105">
              <HeartPulse className="h-5 w-5 transform transition-transform duration-300 group-hover:rotate-12 group-hover:animate-pulse" />
            </div>
            <span className="font-sans text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-300">
              HealthEase
            </span>
          </div>

          {/* User Profile Block */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-900 flex items-center gap-3 shrink-0">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 flex items-center justify-center shadow-xs">
                <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-200 truncate">Super Admin</div>
              <div className="text-[9px] text-teal-600 dark:text-teal-400 mt-1 font-bold tracking-wider uppercase bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md w-max">
                MediCare Center
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-4">
            {navigationGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-1">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      className={`group/nav w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/25 scale-[1.02]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/50 dark:hover:text-white hover:translate-x-1"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 transition-all duration-200 ${isActive ? "text-white scale-110" : "text-slate-400 group-hover/nav:text-teal-600 dark:group-hover/nav:text-teal-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-900 shrink-0">
          <button
            onClick={handleLogout}
            className="group/logout w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/10 transition-all duration-200 cursor-pointer hover:translate-x-1"
          >
            <LogOut className="h-4.5 w-4.5 text-red-500 group-hover/logout:-translate-x-0.5 transition-transform" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════ MOBILE SIDEBAR OVERLAY ═══════════════ */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full justify-between z-50">
            <div className="flex flex-col overflow-y-auto">
              <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md">
                    <HeartPulse className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-sans text-lg font-extrabold tracking-tight bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-300">
                    HealthEase
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)} className="rounded-full h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-900">
                  <Lucide.X className="h-4.5 w-4.5" />
                </Button>
              </div>

              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-900 flex items-center gap-3 shrink-0">
                <div className="relative h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-850 shadow-2xs">
                  <User className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 flex items-center justify-center">
                    <span className="absolute h-1 w-1 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold leading-tight truncate text-slate-800 dark:text-slate-200">Super Admin</div>
                  <div className="text-[9px] text-teal-600 dark:text-teal-400 mt-0.5 font-bold tracking-wider uppercase bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded-md w-max">
                    MediCare Center
                  </div>
                </div>
              </div>

              <nav className="p-3 space-y-4">
                {navigationGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-1">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            setActiveTab(item.value);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm"
                              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/50"
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-900 shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/10 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ═══════════════ MAIN CONTENT PANEL ═══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Navbar */}
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 print:hidden shadow-xs">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl h-10 w-10 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Go to website action link */}
            <Link
              to="/"
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0D7A70] dark:text-slate-300 dark:hover:text-teal-400 transition-all duration-300 bg-slate-50 hover:bg-teal-50/50 dark:bg-slate-900 dark:hover:bg-teal-950/20 px-3.5 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-850 shadow-2xs hover:shadow-xs hover:scale-[1.02]"
            >
              <Globe className="h-3.5 w-3.5 text-[#0D7A70] dark:text-teal-400" />
              <span>Go To Website</span>
            </Link>
          </div>

          {/* User profile dropdown and chat actions */}
          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-1.5 text-xs text-slate-505 hover:text-[#0D7A70] dark:text-slate-400 dark:hover:text-teal-400 transition-all duration-200 font-medium hover:scale-102 cursor-pointer">
              <MessageSquare className="h-4 w-4 text-[#0D7A70]/80 dark:text-teal-500" />
              <span>Chat With Us</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-850 hidden sm:block" />

            <div className="flex items-center gap-2 cursor-pointer group bg-slate-50 dark:bg-slate-900 border border-slate-250/60 dark:border-slate-800 pl-1.5 pr-3 py-1 rounded-full shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="h-6.5 w-6.5 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shadow-teal-500/20">
                {user?.email?.[0].toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-semibold text-slate-750 dark:text-slate-250 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Admin Control
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-650 transition-colors" />
            </div>

            <Badge variant="outline" className="border-slate-300 dark:border-slate-750 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-bold">
              EN
            </Badge>
          </div>
        </header>

        {/* Dynamic Panel Content Canvas */}
        <main className="flex-1 p-6 lg:p-8 min-w-0">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="dashboard" className="outline-none mt-0">
              <DashboardSection cases={cases} loading={loading} />
            </TabsContent>
            <TabsContent value="services" className="outline-none mt-0">
              <ServicesSection />
            </TabsContent>
            <TabsContent value="contact" className="outline-none mt-0">
              <ContactSection />
            </TabsContent>
            <TabsContent value="invoice" className="outline-none mt-0">
              <InvoiceSection />
            </TabsContent>
            <TabsContent value="qrcode" className="outline-none mt-0">
              <QrCodeSection />
            </TabsContent>
            <TabsContent value="staff" className="outline-none mt-0">
              <StaffSection />
            </TabsContent>
            <TabsContent value="leads" className="outline-none mt-0">
              <LeadsSection />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

/* ========================================================
   1. DASHBOARD OVERVIEW SECTION
   ======================================================== */
function DashboardSection({ cases, loading }: { cases: any[]; loading: boolean }) {
  // Compute Stats from real Supabase case sheet rows
  const stats = useMemo(() => {
    // Unique Patients: count distinct mobile or full name
    const uniquePatients = new Set(cases.map((c) => c.mobile || c.full_name)).size;
    const billedCases = cases.filter((c) => c.status === "billed");
    const totalRevenue = billedCases.reduce((sum, c) => sum + Number(c.total_bill ?? 0), 0);
    const pendingBilled = cases.filter((c) => c.status === "returned_to_nurse").length;
    const prescriptionCount = cases.filter((c) => c.prescription?.trim()).length;

    return {
      departments: 8, // Configured default
      doctors: 2,     // Aarav & Priya
      patients: uniquePatients,
      appointments: cases.length,
      caseStudies: 0,
      invoiceCount: billedCases.length,
      prescriptionCount,
      revenue: totalRevenue,
      pendingBilled
    };
  }, [cases]);

  // Group Patient visits by month for the Bar Chart
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts = Array(12).fill(0);
    cases.forEach((c) => {
      if (c.created_at) {
        const date = new Date(c.created_at);
        counts[date.getMonth()]++;
      }
    });
    return months.map((m, idx) => ({ name: m, Users: counts[idx] }));
  }, [cases]);

  // Donut rings values
  const ring1Percent = stats.appointments > 0 ? Math.round((stats.invoiceCount / stats.appointments) * 100) : 0;
  const ring2Percent = stats.appointments > 0 ? Math.round((stats.prescriptionCount / stats.appointments) * 100) : 0;

  // Custom colors for Recharts columns
  const colors = ["#2563EB", "#10B981", "#EF4444", "#F59E0B", "#F59E0B", "#2563EB", "#10B981", "#2563EB"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground font-medium">Gathering statistics from clinic registry...</p>
      </div>
    );
  }

  // Cards display configs matching HealthEase mockup
  const cardConfigs = [
    { label: "Department", value: stats.departments, icon: Layers, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", trend: "8 Active Units", trendColor: "text-blue-600 dark:text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-full" },
    { label: "Doctor", value: stats.doctors, icon: Stethoscope, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", trend: "2 Active Duty", trendColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full" },
    { label: "Patient", value: stats.patients, icon: Users, bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", trend: "+14% this month", trendColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full" },
    { label: "Patient Appointment", value: stats.appointments, icon: Calendar, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", trend: `${stats.pendingBilled} pending bill`, trendColor: stats.pendingBilled > 0 ? "text-rose-600 dark:text-rose-450 bg-rose-500/5 px-2 py-0.5 rounded-full animate-pulse" : "text-slate-400 dark:text-slate-500 bg-slate-500/5 px-2 py-0.5 rounded-full" },
    { label: "Patient Case Studies", value: stats.caseStudies, icon: FileSpreadsheet, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", trend: "0 archived", trendColor: "text-slate-405 dark:text-slate-500 bg-slate-500/5 px-2 py-0.5 rounded-full" },
    { label: "Invoice", value: stats.invoiceCount, icon: Receipt, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", trend: "4 generated", trendColor: "text-blue-600 dark:text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded-full" },
    { label: "Prescription", value: stats.prescriptionCount, icon: FileText, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", trend: "5 issued today", trendColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full" },
    { label: "Payment Collection", value: `₹${stats.revenue.toFixed(0)}`, icon: Coins, bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", trend: "+8.4% growth", trendColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full" },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Breadcrumbs header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b pb-5 border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Welcome back, Admin. Here is what is happening at MediCare Center today.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-1.5 rounded-xl w-max shadow-3xs shrink-0">
          <span className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer">Home</span>
          <span>/</span>
          <span className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer">Admin</span>
          <span>/</span>
          <span className="text-[#0D7A70] dark:text-teal-400 font-bold">Dashboard</span>
        </div>
      </div>

      {/* Grid of stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {cardConfigs.map((cfg, index) => {
          const Icon = cfg.icon;
          return (
            <Card key={index} className="group/card border border-slate-200/60 dark:border-slate-850/80 shadow-2xs hover:shadow-md bg-white dark:bg-slate-950 rounded-2xl overflow-hidden hover:-translate-y-1 hover:ring-1 hover:ring-teal-500/10 transition-all duration-300">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-32">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">{cfg.label}</span>
                  <div className={`h-9 w-9 rounded-xl ${cfg.bg} flex items-center justify-center transform transition-transform group-hover/card:scale-110 duration-300 relative`}>
                    <span className={`absolute inset-0 rounded-xl filter blur-xs opacity-40 animate-pulse ${cfg.bg}`} />
                    <Icon className={`h-5 w-5 ${cfg.text}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight leading-none">{cfg.value}</div>
                  <div className={`text-[10px] font-bold mt-2.5 flex items-center gap-1 ${cfg.trendColor} w-max`}>
                    <span>{cfg.trend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics and charts section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart card */}
        <Card className="lg:col-span-2 border border-slate-200/60 dark:border-slate-850/80 shadow-2xs bg-white dark:bg-slate-950 rounded-2xl p-5">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Monthly Registered Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0d7a70" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="barEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="barAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#b45309" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/80" />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="backdrop-blur-md bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 dark:border-slate-800 text-white rounded-xl p-3 shadow-lg">
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">{payload[0].payload.name}</p>
                            <p className="text-sm font-bold mt-1 text-teal-400">
                              Users: <span className="text-white">{payload[0].value}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Users" radius={[6, 6, 0, 0]} maxBarSize={28}>
                    {chartData.map((_entry, index) => {
                      const gradientMap = ["url(#barBlue)", "url(#barTeal)", "url(#barEmerald)", "url(#barAmber)"];
                      return <Cell key={`cell-${index}`} fill={gradientMap[index % gradientMap.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Earning donut cards */}
        <Card className="lg:col-span-1 border border-slate-200/60 dark:border-slate-850/80 shadow-2xs bg-white dark:bg-slate-950 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-850">
              <CardTitle className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Earning Performance</CardTitle>
              <div className="bg-slate-100/80 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-0.5 rounded-lg flex shadow-3xs">
                <button className="text-[9px] font-extrabold tracking-wide uppercase px-2.5 py-1 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 rounded-md shadow-2xs">Weekly</button>
                <button className="text-[9px] font-extrabold tracking-wide uppercase px-2.5 py-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Monthly</button>
              </div>
            </div>

            <div className="py-4">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">This Week Revenue</span>
              <div className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1.5 tracking-tight">₹{stats.revenue.toLocaleString()}</div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-455">
                  <Lucide.TrendingDown className="h-3 w-3" /> -31.08%
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">vs previous week</span>
              </div>
            </div>
          </div>

          {/* Progress circle analytics */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4 border-slate-100 dark:border-slate-850">
            {/* Circle 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative h-18 w-18 flex items-center justify-center">
                <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="text-teal-50/50 dark:text-teal-950/20" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#0D7A70] dark:text-teal-400" strokeDasharray={`${ring1Percent}, 100`} strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="text-xs font-bold text-slate-800 dark:text-white">{ring1Percent}%</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-3">Billing Analytics</span>
            </div>

            {/* Circle 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative h-18 w-18 flex items-center justify-center">
                <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="text-amber-50/50 dark:text-amber-950/20" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-amber-500" strokeDasharray={`${ring2Percent}, 100`} strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="text-xs font-bold text-slate-800 dark:text-white">{ring2Percent}%</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-3">Prescription Ratio</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ========================================================
   2. SERVICES CONFIGURATION SECTION
   ======================================================== */
function ServicesSection() {
  const [settings, setSettings] = useState<HomepageSettings | null>(null);

  useEffect(() => {
    setSettings(getHomepageSettings());
  }, []);

  const handleSave = () => {
    if (!settings) return;
    saveHomepageSettings(settings);
    toast.success("Services settings updated successfully");
  };

  const handleUpdateService = (id: string, field: keyof ServiceItem, value: string) => {
    if (!settings) return;
    const updatedServices = settings.services.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setSettings({ ...settings, services: updatedServices });
  };

  const handleAddService = () => {
    if (!settings) return;
    const newService: ServiceItem = {
      id: "s_" + Date.now(),
      iconName: "Stethoscope",
      label: "New Service",
      desc: "Describe this clinical service here.",
      image: "/hospital_bg.png"
    };
    setSettings({ ...settings, services: [...settings.services, newService] });
    toast.success("New service added");
  };

  const handleDeleteService = (id: string) => {
    if (!settings) return;
    const filtered = settings.services.filter((s) => s.id !== id);
    setSettings({ ...settings, services: filtered });
    toast.success("Service removed");
  };

  if (!settings) {
    return <div className="text-center py-10 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Homepage Services</CardTitle>
            <CardDescription className="text-xs">Add, remove, and update the medical service details shown on the homepage carousel.</CardDescription>
          </div>
          <Button onClick={handleAddService} className="bg-[#0D7A70] hover:bg-[#0c6b62] text-white rounded-xl font-semibold px-4 shadow-sm self-start text-xs">
            <Plus className="mr-2 h-4 w-4" /> Add Service
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {settings.services.map((service, index) => {
            const IconComponent = (Lucide as any)[service.iconName] || Lucide.HelpCircle;
            return (
              <div
                key={service.id}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Service #{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full h-8 w-8 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-3 items-center">
                  <div className="col-span-1 flex flex-col items-center justify-center gap-1.5">
                    <div className="h-11 w-11 bg-teal-50 dark:bg-teal-950/40 rounded-xl flex items-center justify-center border border-teal-100 dark:border-teal-900/50">
                      <IconComponent className="h-5.5 w-5.5 text-[#0D7A70] dark:text-teal-400" />
                    </div>
                    <Select
                      value={service.iconName}
                      onValueChange={(v) => handleUpdateService(service.id, "iconName", v)}
                    >
                      <SelectTrigger className="w-full text-[10px] h-7 px-1 py-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 font-bold">
                        <SelectValue placeholder="Icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ICONS.map((ico) => (
                          <SelectItem key={ico} value={ico}>
                            <span className="text-[10px]">{ico}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3 space-y-2">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Title</Label>
                      <Input
                        value={service.label}
                        onChange={(e) => handleUpdateService(service.id, "label", e.target.value)}
                        className="h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Image Illustration</Label>
                      <Select
                        value={service.image || ""}
                        onValueChange={(v) => handleUpdateService(service.id, "image", v)}
                      >
                        <SelectTrigger className="w-full text-xs h-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 mt-0.5 rounded-lg">
                          <SelectValue placeholder="Select Illustration" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_IMAGES.map((img) => (
                            <SelectItem key={img.value} value={img.value}>
                              <span className="text-xs">{img.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Description</Label>
                  <Textarea
                    value={service.desc}
                    onChange={(e) => handleUpdateService(service.id, "desc", e.target.value)}
                    rows={2}
                    className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm mt-0.5"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {settings.services.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-muted-foreground italic bg-slate-50/50 dark:bg-black/5">
            No services configured. Click "Add Service" above.
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200/50 dark:border-slate-850">
          <Button onClick={handleSave} className="bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-bold rounded-xl px-6 shadow-sm">
            <Save className="mr-2 h-4 w-4" /> Save Services
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================
   3. CONTACT DETAILS SECTION
   ======================================================== */
function ContactSection() {
  const [settings, setSettings] = useState<HomepageSettings | null>(null);

  useEffect(() => {
    setSettings(getHomepageSettings());
  }, []);

  const handleSave = () => {
    if (!settings) return;
    saveHomepageSettings(settings);
    toast.success("Contact settings and details updated successfully");
  };

  const handleFieldChange = (field: keyof HomepageSettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (!settings) {
    return <div className="text-center py-10 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Hospital Contact & Identity</CardTitle>
        <CardDescription className="text-xs">Edit critical clinical identities, contact endpoints, and about page texts dynamically.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Info */}
          <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/10">
            <h3 className="text-[11px] font-bold text-[#0D7A70] dark:text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">Clinical Branding</h3>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hospital / Clinic Name</Label>
              <Input
                value={settings.hospitalName}
                onChange={(e) => handleFieldChange("hospitalName", e.target.value)}
                className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hero Section Subtitle</Label>
              <Textarea
                value={settings.heroSubtitle}
                onChange={(e) => handleFieldChange("heroSubtitle", e.target.value)}
                rows={2}
                className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/10">
            <h3 className="text-[11px] font-bold text-[#0D7A70] dark:text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Address</Label>
                <Input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                  className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone Number</Label>
                <Input
                  value={settings.contactPhone}
                  onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
                  className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Emergency Number</Label>
              <Input
                value={settings.contactEmergency}
                onChange={(e) => handleFieldChange("contactEmergency", e.target.value)}
                className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Physical Address</Label>
              <Input
                value={settings.contactAddress}
                onChange={(e) => handleFieldChange("contactAddress", e.target.value)}
                className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
              />
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/10">
          <h3 className="text-[11px] font-bold text-[#0D7A70] dark:text-teal-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">About Clinical Section</h3>
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About Section Title</Label>
            <Input
              value={settings.aboutTitle}
              onChange={(e) => handleFieldChange("aboutTitle", e.target.value)}
              className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About Paragraph 1</Label>
              <Textarea
                value={settings.aboutText1}
                onChange={(e) => handleFieldChange("aboutText1", e.target.value)}
                rows={4}
                className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About Paragraph 2</Label>
              <Textarea
                value={settings.aboutText2}
                onChange={(e) => handleFieldChange("aboutText2", e.target.value)}
                rows={4}
                className="mt-1.5 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200/50 dark:border-slate-850">
          <Button onClick={handleSave} className="bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-bold rounded-xl px-6 shadow-sm">
            <Save className="mr-2 h-4 w-4" /> Save Clinical Identity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================
   4. INVOICES & BILLING SECTION
   ======================================================== */
function InvoiceSection() {
  const [cases, setCases] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = fsQuery(collection(db, "case_papers"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      setCases(snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error: any) => {
      toast.error(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchQuery = !query.trim() ||
        c.full_name.toLowerCase().includes(query.toLowerCase()) ||
        c.mobile.includes(query);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [cases, query, statusFilter]);

  return (
    <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Invoice & Billing Manager</CardTitle>
        <CardDescription className="text-xs">Manage bills, assign service charges, and print official invoice summaries for clinic consultations.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-6">
        {/* Search and Filter bar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patient name or mobile…"
              className="pl-10 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Filter Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl h-10 text-sm font-medium">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                <SelectItem value="returned_to_nurse">Ready for Billing</SelectItem>
                <SelectItem value="billed">Billed</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="sent_to_doctor">Sent to Doctor</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">Loading case records...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">{c.full_name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                    <Badge className={statusColor[c.status as CaseStatus] + " border font-semibold px-2 py-0.5 text-[10px] rounded-lg"} variant="outline">
                      {statusLabel[c.status as CaseStatus]}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-y py-2 border-slate-200/40 dark:border-slate-800/40">
                    <div><span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[9px] mr-1">Mobile:</span>{c.mobile}</div>
                    <div><span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[9px] mr-1">Age/DOB:</span>{c.age ?? calculateAge(c.dob)} ({c.dob})</div>
                    <div className="col-span-2 mt-0.5"><span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[9px] mr-1">Doctor:</span>{c.assigned_doctor_name || (c.assigned_doctor ? doctorName[c.assigned_doctor as "doctor1" | "doctor2"] : "—")}</div>
                  </div>

                  {/* Bill details */}
                  <div className="mt-3 space-y-1 bg-white dark:bg-black/10 rounded-xl p-3 text-xs border border-slate-100/50 dark:border-slate-800/40">
                    <div className="flex justify-between text-slate-500"><span>Consultation Fee:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(c.consultation_charge ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Medicines Fee:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(c.medicine_charge ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Lab Test Fee:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(c.test_charge ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Other Fees:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(c.other_charge ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-[#0D7A70] dark:text-teal-400">
                      <span>Total Amount:</span> <span>₹{(c.total_bill ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <AdminBillingDialog caseRow={c} onSaved={() => {}} />
                  {(c.status === "billed" || c.status === "returned_to_nurse") && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateInvoicePDF(c, "download")}
                        className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-semibold h-8"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateInvoicePDF(c, "print")}
                        className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-semibold h-8"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredCases.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-muted-foreground italic bg-slate-50/50 dark:bg-black/5">
            No patient case sheets match your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Dialog for billing in admin route
function AdminBillingDialog({ caseRow, onSaved }: { caseRow: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [bill, setBill] = useState({
    consultation_charge: Number(caseRow.consultation_charge ?? 150), // Default standard consultation
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
        updated_at: new Date().toISOString()
      });
      toast.success("Billing finalized successfully");
      setOpen(false);
      // onSaved is no longer strictly necessary because of onSnapshot, but we can still call it if it does something else.
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#0D7A70] hover:bg-[#0c6b62] text-white rounded-xl flex items-center gap-1.5 font-semibold text-xs h-8">
          <Receipt className="h-3.5 w-3.5" />
          <span>{caseRow.status === "billed" ? "Edit Bill" : "Finalize Billing"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#0D7A70] dark:text-teal-400 text-lg">Finalize Bill — {caseRow.full_name}</DialogTitle>
          <DialogDescription className="text-xs">Assign clinical charges for this patient visit. Finalizing prints or compiles this invoice details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-3">
          {(["consultation_charge", "medicine_charge", "test_charge", "other_charge"] as const).map((k) => (
            <div key={k} className="grid grid-cols-3 items-center gap-4">
              <Label className="capitalize col-span-1 text-sm font-medium">
                {k.replace("_", " ").replace("charge", "")} (₹)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bill[k]}
                className="col-span-2 bg-white dark:bg-black/20 border-slate-200 dark:border-slate-800 rounded-xl"
                onChange={(e) => setBill({ ...bill, [k]: Number(e.target.value) || 0 })}
              />
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-secondary/50 px-4 py-3 mt-4">
            <span className="font-medium text-slate-800 dark:text-slate-200">Total Bill Amount</span>
            <span className="text-xl font-bold text-[#0D7A70] dark:text-teal-400">₹ {total.toFixed(2)}</span>
          </div>
          <Button onClick={saveBill} className="w-full bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-bold h-11 rounded-xl shadow-md mt-2">
            Save & Finalize Bill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ========================================================
   5. QR CODE SCAN GENERATOR SECTION
   ======================================================== */
function QrCodeSection() {
  const [ipOverride, setIpOverride] = useState("https://health-care-chi-three.vercel.app");
  const [detectedIp, setDetectedIp] = useState("localhost");
  const [loadingIp, setLoadingIp] = useState(true);

  useEffect(() => {
    // Attempt to automatically discover server IP on mount
    const detect = async () => {
      try {
        const ip = await getLocalIpServer();
        if (ip && ip !== "localhost") {
          setDetectedIp(ip);
        }
      } catch (e) {
        console.error("IP detect err:", e);
      } finally {
        setLoadingIp(false);
      }
    };
    detect();
  }, []);

  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.") || hostname.startsWith("10.");
  
  let finalUrl = `${window.location.origin}/patient`;
  const currentPort = window.location.port ? `:${window.location.port}` : "";
  
  if (ipOverride.trim()) {
    let override = ipOverride.trim();
    if (override.endsWith("/")) override = override.slice(0, -1);
    
    if (override.startsWith("http")) {
      finalUrl = `${override}/patient`;
    } else if (override.includes("ngrok") || override.includes("loca.lt") || override.includes("trycloudflare")) {
      finalUrl = `https://${override}/patient`;
    } else {
      finalUrl = `http://${override}${currentPort}/patient`;
    }
  } else if (isLocal && detectedIp !== "localhost") {
    // If running locally, use Wi-Fi IP so other devices can access over local network
    finalUrl = `http://${detectedIp}${currentPort}/patient`;
  }

  const qrCodeImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalUrl)}`;

  const printQrCode = () => {
    window.print();
  };

  return (
    <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-8 max-w-4xl mx-auto min-h-[60vh] flex flex-col print:shadow-none print:p-0 print:border-none print:bg-white">
      <div className="flex flex-col items-center justify-center flex-1 space-y-12">
        
        {/* Header Area */}
        <div className="text-center space-y-4 print:mb-8">
          <div className="mx-auto h-16 w-16 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center shadow-inner border border-teal-100 dark:border-teal-800/50 print:hidden">
            <QrCode className="h-8 w-8 text-[#0D7A70] dark:text-teal-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white">Patient Check-In QR</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Scan this code to open the registration form. To allow scanning without Wi-Fi (e.g., mobile data), enter a public URL like ngrok or your deployed domain below.
            </p>
          </div>
        </div>

        {/* Dynamic IP Setting (Hidden on Print) */}
        <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex justify-between items-center mb-3">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Network Host IP / Ngrok URL</Label>
            {loadingIp ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Detecting...</Badge>
            ) : detectedIp !== "localhost" ? (
              <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-200">Auto-Detected</Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder={`e.g. ${detectedIp} or https://xyz.ngrok.app`}
              value={ipOverride}
              onChange={(e) => setIpOverride(e.target.value)}
              className="bg-white dark:bg-black/20 text-center font-mono font-medium shadow-sm"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2.5 text-center px-4">
            If the auto-detected IP fails, check your WiFi network properties and override it here.
          </p>
        </div>

        {/* Print & Visual Layout Frame */}
        <div className="relative p-6 rounded-[2rem] bg-white border-2 border-dashed border-teal-200 shadow-xl shadow-teal-900/5 print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none w-full max-w-[340px]">
          
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-xs font-bold text-teal-600 uppercase tracking-widest print:hidden">
            Scan to Check-In
          </div>

          <div className="flex flex-col items-center bg-white rounded-2xl p-6 border border-slate-100 print:border-4 print:border-teal-700/20 print:p-12 print:rounded-[3rem]">
            {/* The QR Image */}
            <div className="relative aspect-square w-full bg-white p-3 border-2 border-teal-50 rounded-xl overflow-hidden print:p-8">
              <div className="absolute inset-0 border-4 border-teal-500/20 m-4 rounded-xl print:m-8 opacity-50" />
              <img 
                src={qrCodeImageSrc} 
                alt="Check-in QR Code" 
                className="w-full h-full object-contain relative z-10 p-2"
                style={{ imageRendering: "pixelated" }}
              />
              {/* Corner brackets decoration */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-teal-600" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-teal-600" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-teal-600" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-teal-600" />
            </div>

            <div className="mt-6 text-center print:mt-10">
              <div className="text-xl font-black text-slate-800 tracking-tight print:text-4xl">Register Here</div>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-[200px] mx-auto print:text-xl print:max-w-[400px] print:mt-4">
                Point your smartphone camera at this code to open the registration form.
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400 print:text-lg print:mt-8 print:pt-8 print:border-slate-200">
                <Globe className="h-3 w-3 print:h-5 print:w-5" />
                {finalUrl}
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={printQrCode}
          size="lg"
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg px-8 h-12 print:hidden"
        >
          <Printer className="mr-2 h-5 w-5" />
          Print Check-In Desk Stand
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .w-full.max-w-\\[340px\\] {
            visibility: visible;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            margin: 0 !important;
            padding: 2rem !important;
            background: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            box-shadow: none !important;
            width: 100% !important;
          }
          .w-full.max-w-\\[340px\\] * {
            visibility: visible !important;
            color: black !important;
          }
        }
      `}}></style>
    </Card>
  );
}

/* ========================================================
   10. STAFF MANAGEMENT SECTION
   ======================================================== */
function StaffSection() {
  // Doctor form state
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPassword, setDocPassword] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("General Medicine");
  const [docRegNumber, setDocRegNumber] = useState("");

  // Nurse form state
  const [nurseName, setNurseName] = useState("");
  const [nurseEmail, setNurseEmail] = useState("");
  const [nursePassword, setNursePassword] = useState("");
  const [nurseDepartment, setNurseDepartment] = useState("ICU");
  const [nurseShift, setNurseShift] = useState("Morning");

  const [busy, setBusy] = useState(false);
  const [showDocPass, setShowDocPass] = useState(false);
  const [showNursePass, setShowNursePass] = useState(false);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !docEmail.trim() || !docPassword.trim()) {
      return toast.error("Please fill all fields for Doctor");
    }
    if (docPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setBusy(true);
    try {
      // Use a secondary Firebase app instance to avoid logging out the current admin user
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // Create the user in Auth
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, docEmail.trim().toLowerCase(), docPassword);

      // Save role mapping (using doctor1 for consistency with system routing)
      await setDoc(doc(db, "user_roles", userCred.user.uid), {
        role: "doctor1"
      });

      // Save user profile info with doctor-specific fields
      await setDoc(doc(db, "profiles", userCred.user.uid), {
        full_name: docName.trim(),
        email: docEmail.trim().toLowerCase(),
        role: "doctor1",
        specialty: docSpecialty,
        reg_number: docRegNumber.trim(),
        created_at: new Date().toISOString()
      });

      // Sign out the secondary instance to clean up
      await secondaryAuth.signOut();

      toast.success("Doctor account created successfully!");
      setDocName("");
      setDocEmail("");
      setDocPassword("");
      setDocRegNumber("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create Doctor account");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseName.trim() || !nurseEmail.trim() || !nursePassword.trim()) {
      return toast.error("Please fill all fields for Nurse");
    }
    if (nursePassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setBusy(true);
    try {
      // Use a secondary Firebase app instance to avoid logging out the current admin user
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // Create the user in Auth
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, nurseEmail.trim().toLowerCase(), nursePassword);

      // Save role mapping
      await setDoc(doc(db, "user_roles", userCred.user.uid), {
        role: "nurse"
      });

      // Save user profile info with nurse-specific fields
      await setDoc(doc(db, "profiles", userCred.user.uid), {
        full_name: nurseName.trim(),
        email: nurseEmail.trim().toLowerCase(),
        role: "nurse",
        department: nurseDepartment,
        shift: nurseShift,
        created_at: new Date().toISOString()
      });

      // Sign out the secondary instance to clean up
      await secondaryAuth.signOut();

      toast.success("Nurse account created successfully!");
      setNurseName("");
      setNurseEmail("");
      setNursePassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create Nurse account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border border-slate-200/60 dark:border-slate-850/80 shadow-2xs bg-white dark:bg-slate-950 rounded-2xl p-6 max-w-2xl mx-auto animate-in fade-in-50 duration-300">
      <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-100 dark:border-slate-850 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-[#0D7A70] dark:text-teal-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-extrabold text-slate-850 dark:text-white tracking-tight">Add New Staff</CardTitle>
            <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Create accounts for doctors and nurses to grant them access.</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        <Tabs defaultValue="doctor" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6 bg-slate-100/85 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-1 rounded-xl shadow-3xs">
            <TabsTrigger value="doctor" className="flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-805 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-2xs text-slate-400 dark:text-slate-550 cursor-pointer">
              <Stethoscope className="h-4 w-4" />
              <span>Add Doctor</span>
            </TabsTrigger>
            <TabsTrigger value="nurse" className="flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-805 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-2xs text-slate-400 dark:text-slate-550 cursor-pointer">
              <Users className="h-4 w-4" />
              <span>Add Nurse</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="doctor" className="outline-none animate-in fade-in-40 duration-200">
            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name</Label>
                <Input 
                  placeholder="e.g. Dr. Kadambari Jagtap" 
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</Label>
                <Input 
                  type="email"
                  placeholder="doctor@hospital.com" 
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Password</Label>
                <div className="relative">
                  <Input 
                    type={showDocPass ? "text" : "password"} 
                    placeholder="Min 6 characters" 
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDocPass(!showDocPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer"
                  >
                    {showDocPass ? <Lucide.EyeOff className="h-4.5 w-4.5" /> : <Lucide.Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Specialty</Label>
                  <Select value={docSpecialty} onValueChange={setDocSpecialty}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Medicine">General Medicine</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="Gynaecology">Gynaecology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registration Number</Label>
                  <Input 
                    placeholder="e.g. MC-12345" 
                    value={docRegNumber}
                    onChange={(e) => setDocRegNumber(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-650 hover:to-emerald-650 text-white font-bold rounded-xl h-11 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer"
                  disabled={busy}
                >
                  {busy ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Doctor Account...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Create Doctor Account</>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="nurse" className="outline-none animate-in fade-in-40 duration-200">
            <form onSubmit={handleCreateNurse} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name</Label>
                <Input 
                  placeholder="e.g. Nurse Alice Patil" 
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</Label>
                <Input 
                  type="email"
                  placeholder="nurse@hospital.com" 
                  value={nurseEmail}
                  onChange={(e) => setNurseEmail(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Password</Label>
                <div className="relative">
                  <Input 
                    type={showNursePass ? "text" : "password"} 
                    placeholder="Min 6 characters" 
                    value={nursePassword}
                    onChange={(e) => setNursePassword(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm focus-visible:ring-teal-500 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNursePass(!showNursePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer"
                  >
                    {showNursePass ? <Lucide.EyeOff className="h-4.5 w-4.5" /> : <Lucide.Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</Label>
                  <Select value={nurseDepartment} onValueChange={setNurseDepartment}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICU">ICU</SelectItem>
                      <SelectItem value="OPD">OPD</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="General Ward">General Ward</SelectItem>
                      <SelectItem value="Operation Theatre">Operation Theatre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Working Shift</Label>
                  <Select value={nurseShift} onValueChange={setNurseShift}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning (8 AM - 4 PM)</SelectItem>
                      <SelectItem value="Evening">Evening (4 PM - 12 AM)</SelectItem>
                      <SelectItem value="Night">Night (12 AM - 8 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-3">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-teal-650 to-emerald-650 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl h-11 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer"
                  disabled={busy}
                >
                  {busy ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Nurse Account...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Create Nurse Account</>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ========================================================
   11. LEAD MANAGEMENT SECTION
   ======================================================== */
export function LeadsSection() {
  const [leads, setLeads] = useState<any[]>([]);
  const [nurses, setNurses] = useState<{ id: string; name: string }[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [nurseFilter, setNurseFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [newFollowupText, setNewFollowupText] = useState("");

  const [form, setForm] = useState({
    patient_name: "",
    mobile: "",
    age: "",
    gender: "Male",
    problem: "",
    preferred_doctor: "",
    appointment_date: "",
    source: "Website",
    priority: "Medium",
    assigned_nurse_id: "",
    notes: ""
  });

  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setForm({
      patient_name: "",
      mobile: "",
      age: "",
      gender: "Male",
      problem: "",
      preferred_doctor: "",
      appointment_date: "",
      source: "Website",
      priority: "Medium",
      assigned_nurse_id: "",
      notes: ""
    });
    setNewFollowupText("");
  };

  useEffect(() => {
    const q = fsQuery(collection(db, "leads"), orderBy("created_at", "desc"));
    const unsubscribeLeads = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      toast.error("Failed to load leads: " + err.message);
      setLoading(false);
    });

    const fetchStaff = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "user_roles"));
        const profilesSnap = await getDocs(collection(db, "profiles"));
        
        const rolesMap = new Map();
        rolesSnap.forEach(d => rolesMap.set(d.id, d.data().role));
        
        const nursesList: { id: string; name: string }[] = [];
        const doctorsList: { id: string; name: string }[] = [
          { id: "doctor1", name: "Dr. Kadambari Jagtap" },
          { id: "doctor2", name: "Dr. Omprasad Jagtap" }
        ];
        
        profilesSnap.forEach(d => {
          const roleVal = rolesMap.get(d.id);
          const email = d.data().email || "";
          
          if (roleVal === "nurse") {
            nursesList.push({ id: d.id, name: d.data().full_name });
          } else if (roleVal === "doctor" || roleVal === "doctor1" || roleVal === "doctor2") {
            if (email.includes("doctor1") || email.includes("doctor2") || email.includes("doctor12")) return;
            doctorsList.push({ id: d.id, name: d.data().full_name });
          }
        });
        
        const uniqueDocs: { id: string; name: string }[] = [];
        doctorsList.forEach(item => {
          if (!uniqueDocs.find(x => x.id === item.id)) {
            uniqueDocs.push(item);
          }
        });
        
        setNurses(nursesList);
        setDoctors(uniqueDocs);
      } catch (err) {
        console.error("Error loading staff", err);
      }
    };
    
    fetchStaff();
    return () => unsubscribeLeads();
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter(l => !["Converted", "Closed"].includes(l.status)).length;
    const converted = leads.filter(l => l.status === "Converted").length;
    const closed = leads.filter(l => l.status === "Closed").length;
    
    const nurseMap: Record<string, number> = {};
    leads.forEach(l => {
      if (l.assigned_nurse_name) {
        nurseMap[l.assigned_nurse_name] = (nurseMap[l.assigned_nurse_name] || 0) + 1;
      } else {
        nurseMap["Unassigned"] = (nurseMap["Unassigned"] || 0) + 1;
      }
    });
    
    return { total, pending, converted, closed, nurseCounts: Object.entries(nurseMap) };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchQuery = !query.trim() ||
        (l.patient_name || "").toLowerCase().includes(query.toLowerCase()) ||
        (l.mobile || "").includes(query);
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      const matchPriority = priorityFilter === "all" || l.priority === priorityFilter;
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      const matchNurse = nurseFilter === "all" || l.assigned_nurse_id === nurseFilter;
      
      return matchQuery && matchStatus && matchPriority && matchSource && matchNurse;
    });
  }, [leads, query, statusFilter, priorityFilter, sourceFilter, nurseFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_name.trim() || !form.mobile.trim() || !form.age.trim() || !form.problem.trim()) {
      return toast.error("Please fill all required fields");
    }
    
    setBusy(true);
    try {
      const nurseObj = nurses.find(n => n.id === form.assigned_nurse_id);
      const docObj = doctors.find(d => d.id === form.preferred_doctor);
      
      await addDoc(collection(db, "leads"), {
        patient_name: form.patient_name.trim(),
        mobile: form.mobile.trim(),
        age: Number(form.age),
        gender: form.gender,
        problem: form.problem.trim(),
        preferred_doctor: form.preferred_doctor || null,
        preferred_doctor_name: docObj ? docObj.name : null,
        appointment_date: form.appointment_date || null,
        source: form.source,
        priority: form.priority,
        assigned_nurse_id: form.assigned_nurse_id || null,
        assigned_nurse_name: nurseObj ? nurseObj.name : null,
        status: "New Lead",
        notes: form.notes.trim() || null,
        followups: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      toast.success("Lead created successfully");
      setIsCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to create lead");
    } finally {
      setBusy(false);
    }
  };

  const openEditDialog = (lead: any) => {
    setEditingLead(lead);
    setForm({
      patient_name: lead.patient_name || "",
      mobile: lead.mobile || "",
      age: String(lead.age || ""),
      gender: lead.gender || "Male",
      problem: lead.problem || "",
      preferred_doctor: lead.preferred_doctor || "",
      appointment_date: lead.appointment_date || "",
      source: lead.source || "Website",
      priority: lead.priority || "Medium",
      assigned_nurse_id: lead.assigned_nurse_id || "",
      notes: lead.notes || ""
    });
    setIsEditOpen(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    
    if (!form.patient_name.trim() || !form.mobile.trim() || !form.age.trim() || !form.problem.trim()) {
      return toast.error("Please fill all required fields");
    }
    
    setBusy(true);
    try {
      const nurseObj = nurses.find(n => n.id === form.assigned_nurse_id);
      const docObj = doctors.find(d => d.id === form.preferred_doctor);
      
      await updateDoc(doc(db, "leads", editingLead.id), {
        patient_name: form.patient_name.trim(),
        mobile: form.mobile.trim(),
        age: Number(form.age),
        gender: form.gender,
        problem: form.problem.trim(),
        preferred_doctor: form.preferred_doctor || null,
        preferred_doctor_name: docObj ? docObj.name : null,
        appointment_date: form.appointment_date || null,
        source: form.source,
        priority: form.priority,
        assigned_nurse_id: form.assigned_nurse_id || null,
        assigned_nurse_name: nurseObj ? nurseObj.name : null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString()
      });
      
      toast.success("Lead updated successfully");
      setIsEditOpen(false);
      setEditingLead(null);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to update lead");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickStatusChange = async (leadId: string, currentLead: any, newStatus: string) => {
    try {
      if (newStatus === "Converted") {
        setBusy(true);
        await convertLeadToPatient(currentLead);
        toast.success("Lead converted to patient successfully!");
        setBusy(false);
        return;
      }
      
      await updateDoc(doc(db, "leads", leadId), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
      setBusy(false);
    }
  };

  const handleAddFollowup = async () => {
    if (!newFollowupText.trim() || !editingLead) return;
    try {
      const followupEntry = {
        note: newFollowupText.trim(),
        date: new Date().toISOString(),
        nurse_name: "Admin Office"
      };
      const updatedFollowups = [...(editingLead.followups || []), followupEntry];
      
      await updateDoc(doc(db, "leads", editingLead.id), {
        followups: updatedFollowups,
        updated_at: new Date().toISOString()
      });
      
      setEditingLead({ ...editingLead, followups: updatedFollowups });
      setNewFollowupText("");
      toast.success("Follow-up note added");
    } catch (err: any) {
      toast.error("Failed to add follow-up: " + err.message);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await deleteDoc(doc(db, "leads", id));
      toast.success("Lead deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete lead");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground font-medium">Gathering lead records...</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-serif text-slate-800 dark:text-white font-normal">Lead Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track, assign, and convert incoming patient leads.</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-semibold rounded-xl h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Add Lead</span>
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">Total Leads</span>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">Pending Leads</span>
              <div className="text-2xl font-bold mt-1 text-amber-600">{stats.pending}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">Converted Patients</span>
              <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.converted}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase">Closed Leads</span>
              <div className="text-2xl font-bold mt-1 text-slate-500">{stats.closed}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel grid: Leads table and Nurse-wise tracking */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-4">
        {/* Left Side: Table & Filters */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-5">
            {/* Table Filters */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5 mb-5">
              <div className="col-span-2 md:col-span-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search name/mobile..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20">
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

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="QR">QR</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                  <SelectItem value="Call">Call</SelectItem>
                </SelectContent>
              </Select>

              <Select value={nurseFilter} onValueChange={setNurseFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20">
                  <SelectValue placeholder="All Nurses" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Nurses</SelectItem>
                  {nurses.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Leads list table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-3 pr-2">Patient Details</th>
                    <th className="pb-3 px-2">Problem / Source</th>
                    <th className="pb-3 px-2">Doctor & Appt</th>
                    <th className="pb-3 px-2">Nurse</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No lead records match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-3.5 pr-2">
                          <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <span>{l.patient_name}</span>
                            <Badge className={`text-[9px] px-1 py-0.5 rounded ${priorityColor(l.priority)}`}>
                              {l.priority}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{l.mobile}</span>
                            <span>• {l.age} Yrs ({l.gender})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="max-w-[150px] truncate text-slate-800 dark:text-slate-200">{l.problem || "—"}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Source: {l.source}</div>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{l.preferred_doctor_name || "Any Doctor"}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{l.appointment_date ? new Date(l.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Unscheduled"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 font-medium text-slate-600 dark:text-slate-400">
                          {l.assigned_nurse_name || <span className="text-amber-500 font-semibold italic text-[10px]">Unassigned</span>}
                        </td>
                        <td className="py-3.5 px-2">
                          <Select 
                            value={l.status} 
                            disabled={busy || l.status === "Converted"}
                            onValueChange={(val) => handleQuickStatusChange(l.id, l, val)}
                          >
                            <SelectTrigger className={`h-7 w-36 px-2 py-0.5 border text-[10px] font-bold rounded-lg ${statusColorMap(l.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-[10px]">
                              <SelectItem value="New Lead">New Lead</SelectItem>
                              <SelectItem value="Contacted">Contacted</SelectItem>
                              <SelectItem value="Appointment Scheduled">Appointment Scheduled</SelectItem>
                              <SelectItem value="Patient Visited">Patient Visited</SelectItem>
                              <SelectItem value="Converted">Converted</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3.5 pl-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openEditDialog(l)}
                              className="rounded-lg h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <Lucide.Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteLead(l.id)}
                              className="rounded-lg h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Side: Nurse tracking */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-5">
            <CardHeader className="p-0 pb-3 border-b mb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#0D7A70]" />
                <span>Nurse Assignment Metrics</span>
              </CardTitle>
              <CardDescription className="text-[10px]">Active lead tracking per nurse console</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.nurseCounts.map(([nurse, count]) => (
                  <div key={nurse} className="flex justify-between items-center py-2.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{nurse}</span>
                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 px-2 py-0.5 font-bold font-mono text-[10px]">
                      {count} {count === 1 ? "lead" : "leads"}
                    </Badge>
                  </div>
                ))}
                {stats.nurseCounts.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-xs italic">
                    No active assignments.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CREATE LEAD DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-[1.5rem] bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#0D7A70] dark:text-teal-400 text-lg">Create New Patient Lead</DialogTitle>
            <DialogDescription className="text-xs">Register a new prospective patient lead from calls, web entries, or walk-ins.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4 pt-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Patient Full Name *</Label>
                <Input 
                  placeholder="Enter full name" 
                  value={form.patient_name} 
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value })} 
                  required 
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Mobile Number *</Label>
                <Input 
                  placeholder="Enter phone number" 
                  value={form.mobile} 
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })} 
                  required 
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1.5 col-span-1 sm:col-span-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Age *</Label>
                    <Input 
                      type="number" 
                      placeholder="Age" 
                      value={form.age} 
                      onChange={(e) => setForm({ ...form, age: e.target.value })} 
                      required 
                      className="rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Gender</Label>
                    <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5 col-span-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Problem / Reason for Visit *</Label>
                <Textarea 
                  placeholder="e.g. Hair fall, Joint Pain, Regular Checkup..." 
                  value={form.problem} 
                  onChange={(e) => setForm({ ...form, problem: e.target.value })} 
                  required 
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Preferred Doctor</Label>
                <Select value={form.preferred_doctor} onValueChange={(val) => setForm({ ...form, preferred_doctor: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Preferred Appointment Date</Label>
                <Input 
                  type="date" 
                  value={form.appointment_date} 
                  onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} 
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Lead Source</Label>
                <Select value={form.source} onValueChange={(val) => setForm({ ...form, source: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="QR">QR</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Call">Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-1">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Priority</Label>
                <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Assign Nurse *</Label>
                <Select value={form.assigned_nurse_id} onValueChange={(val) => setForm({ ...form, assigned_nurse_id: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Assign a nurse to manage lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nurses.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Initial Remarks / Notes</Label>
                <Textarea 
                  placeholder="Any additional instructions or remarks..." 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>
            </div>

            <Button type="submit" disabled={busy} className="w-full bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-bold h-11 rounded-xl shadow-md mt-4">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Lead"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT / FOLLOW-UP LEAD DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[1.5rem] bg-white dark:bg-slate-950 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#0D7A70] dark:text-teal-400 text-lg">Edit Lead Details & Follow-Ups</DialogTitle>
            <DialogDescription className="text-xs">Update patient lead properties and record nursing follow-ups.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2 pt-3 text-xs">
            {/* Left Column: Properties Form */}
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Patient Full Name *</Label>
                <Input 
                  value={form.patient_name} 
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value })} 
                  required 
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Mobile Number *</Label>
                  <Input 
                    value={form.mobile} 
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })} 
                    required 
                    className="rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Age *</Label>
                    <Input 
                      type="number" 
                      value={form.age} 
                      onChange={(e) => setForm({ ...form, age: e.target.value })} 
                      required 
                      className="rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Gender</Label>
                    <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Problem / Reason for Visit *</Label>
                <Textarea 
                  value={form.problem} 
                  onChange={(e) => setForm({ ...form, problem: e.target.value })} 
                  required 
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Preferred Doctor</Label>
                  <Select value={form.preferred_doctor} onValueChange={(val) => setForm({ ...form, preferred_doctor: val })}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Appointment Date</Label>
                  <Input 
                    type="date" 
                    value={form.appointment_date} 
                    onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} 
                    className="rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Lead Source</Label>
                  <Select value={form.source} onValueChange={(val) => setForm({ ...form, source: val })}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Call">Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Priority</Label>
                  <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Assign Nurse *</Label>
                <Select value={form.assigned_nurse_id} onValueChange={(val) => setForm({ ...form, assigned_nurse_id: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Assign a nurse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nurses.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Notes / Remarks</Label>
                <Textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  rows={2}
                  className="rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>

              <Button type="submit" disabled={busy} className="w-full bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-bold h-10 rounded-xl shadow-md mt-2">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Update Details"}
              </Button>
            </form>

            {/* Right Column: Follow-up logs */}
            <div className="flex flex-col h-full border-l border-slate-100 dark:border-slate-800 pl-6 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 border-b pb-2">
                <ClipboardList className="h-4.5 w-4.5 text-[#0D7A70]" />
                <span>Follow-Up Logs ({editingLead?.followups?.length || 0})</span>
              </h3>
              
              {/* Timeline container */}
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1">
                {(editingLead?.followups || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic text-[11px]">No follow-ups recorded yet.</div>
                ) : (
                  editingLead.followups.map((f: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mb-1">
                        <span>{f.nurse_name}</span>
                        <span>{new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-normal">{f.note}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Followup Action */}
              {editingLead?.status !== "Converted" && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Add New Follow-Up Remark</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type nurse follow-up notes here..." 
                      value={newFollowupText} 
                      onChange={(e) => setNewFollowupText(e.target.value)} 
                      className="rounded-xl border-slate-200 dark:border-slate-800"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddFollowup}
                      className="bg-[#0D7A70] hover:bg-[#0c6b62] text-white px-3 font-semibold rounded-xl"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

