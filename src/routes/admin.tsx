import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { db, firebaseConfig } from "@/firebase";
import { collection, query as fsQuery, orderBy, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
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
import { statusColor, statusLabel, doctorName, CaseStatus, calculateAge, parseCaseNotes } from "@/lib/case-utils";
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
  Coins
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

  // Nav Items layout matching mockup
  const navigationItems = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "services", label: "Services", icon: Settings },
    { value: "contact", label: "Contact Details", icon: Mail },
    { value: "invoice", label: "Invoices & Billing", icon: Receipt },
    { value: "qrcode", label: "QR Check-In", icon: QrCode },
    { value: "staff", label: "Manage Staff", icon: Users },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc] dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      {/* ═══════════════ DESKTOP SIDEBAR ═══════════════ */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shrink-0 h-screen sticky top-0 z-30 justify-between">
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <span className="font-serif text-lg font-bold text-teal-800 dark:text-teal-400">HealthEase</span>
          </div>

          {/* User Profile Block */}
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Super Admin</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">MediCare Center</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => setActiveTab(item.value)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#0D7A70] text-white shadow-md shadow-teal-700/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 text-red-500" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════ MOBILE SIDEBAR OVERLAY ═══════════════ */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full justify-between z-50">
            <div className="flex flex-col">
              <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <span className="font-serif text-base font-bold text-teal-800 dark:text-teal-400">HealthEase</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(false)} className="rounded-full h-8 w-8">
                  <Lucide.X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Super Admin</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">MediCare</div>
                </div>
              </div>

              <nav className="p-2.5 space-y-1">
                {navigationItems.map((item) => {
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
                          ? "bg-[#0D7A70] text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl h-10 w-10 text-slate-500"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Go to website action link */}
            <Link
              to="/"
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0D7A70] dark:text-slate-400 dark:hover:text-teal-400 transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Go To Website</span>
            </Link>
          </div>

          {/* User profile dropdown and chat actions */}
          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span>Chat With Us</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="h-7 w-7 rounded-full bg-[#0D7A70] text-white flex items-center justify-center font-bold text-xs">
                A
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Admin Control
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>

            <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-bold">
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
    { label: "Department", value: stats.departments, icon: Layers, bg: "bg-blue-500/10", text: "text-blue-500", iconBg: "bg-blue-500" },
    { label: "Doctor", value: stats.doctors, icon: Stethoscope, bg: "bg-emerald-500/10", text: "text-emerald-500", iconBg: "bg-emerald-500" },
    { label: "Patient", value: stats.patients, icon: Users, bg: "bg-sky-500/10", text: "text-sky-500", iconBg: "bg-sky-500" },
    { label: "Patient Appointment", value: stats.appointments, icon: Calendar, bg: "bg-amber-500/10", text: "text-amber-500", iconBg: "bg-amber-500" },
    { label: "Patient Case Studies", value: stats.caseStudies, icon: FileSpreadsheet, bg: "bg-amber-500/10", text: "text-amber-500", iconBg: "bg-amber-500" },
    { label: "Invoice", value: stats.invoiceCount, icon: Receipt, bg: "bg-blue-500/10", text: "text-blue-500", iconBg: "bg-blue-500" },
    { label: "Prescription", value: stats.prescriptionCount, icon: FileText, bg: "bg-emerald-500/10", text: "text-emerald-500", iconBg: "bg-emerald-500" },
    { label: "Payment Collection", value: `₹${stats.revenue.toFixed(0)}`, icon: Coins, bg: "bg-sky-500/10", text: "text-sky-500", iconBg: "bg-sky-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Breadcrumbs header */}
      <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-serif text-slate-800 dark:text-white font-normal">Dashboard</h2>
        <span className="text-xs text-red-500 font-bold hover:underline cursor-pointer">Dashboard</span>
      </div>

      {/* Grid of stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {cardConfigs.map((cfg, index) => {
          const Icon = cfg.icon;
          return (
            <Card key={index} className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{cfg.label}</span>
                  <div className="text-2xl font-bold mt-1.5">{cfg.value}</div>
                </div>
                <div className={`h-11 w-11 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${cfg.text}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics and charts section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart card */}
        <Card className="lg:col-span-2 border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-5">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monthly Registered Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.02)" }} />
                  <Bar dataKey="Users" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Earning donut cards */}
        <Card className="lg:col-span-1 border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monthly Earning</CardTitle>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg flex">
                <button className="text-[10px] font-bold px-2 py-1 bg-[#0D7A70] text-white rounded-md shadow-xs">Weekly</button>
                <button className="text-[10px] font-bold px-2 py-1 text-slate-500 hover:text-slate-800">Monthly</button>
              </div>
            </div>

            <div className="py-4">
              <span className="text-[11px] text-muted-foreground font-semibold">This Week</span>
              <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">₹{stats.revenue.toLocaleString()}</div>
              <div className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                <span>-31.08%</span>
                <span className="text-[10px] text-muted-foreground font-normal">From Previous week</span>
              </div>
            </div>
          </div>

          {/* Progress circle analytics */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
            {/* Circle 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative h-18 w-18 flex items-center justify-center">
                <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-blue-500" strokeDasharray={`${ring1Percent}, 100`} strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="text-xs font-bold text-slate-700 dark:text-white">{ring1Percent}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold mt-2.5">Billing Analytics</span>
            </div>

            {/* Circle 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative h-18 w-18 flex items-center justify-center">
                <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
                  <path className="text-slate-100 dark:text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-amber-500" strokeDasharray={`${ring2Percent}, 100`} strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="text-xs font-bold text-slate-700 dark:text-white">{ring2Percent}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold mt-2.5">Prescriptions Ratio</span>
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
                    <div className="col-span-2 mt-0.5"><span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-[9px] mr-1">Doctor:</span>{c.assigned_doctor ? doctorName[c.assigned_doctor as "doctor1" | "doctor2"] : "—"}</div>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateInvoicePDF(c)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-semibold h-8"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </Button>
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor1");
  const [busy, setBusy] = useState(false);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      return toast.error("Please fill all fields");
    }
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setBusy(true);
    try {
      // Use a secondary Firebase app instance to avoid logging out the current admin user
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);

      // Create the user in Auth
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), password);

      // Save role mapping
      await setDoc(doc(db, "user_roles", userCred.user.uid), {
        role: role
      });

      // Save user profile info
      await setDoc(doc(db, "profiles", userCred.user.uid), {
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        created_at: new Date().toISOString()
      });

      // Sign out the secondary instance to clean up
      await secondaryAuth.signOut();

      toast.success("Staff account created successfully!");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-0 shadow-xs bg-white dark:bg-slate-950 rounded-xl p-6 max-w-2xl mx-auto">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-[#0D7A70] dark:text-teal-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-white">Add New Staff</CardTitle>
            <CardDescription className="text-xs">Create accounts for doctors and nurses to grant them access.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 mt-4">
        <form onSubmit={handleCreateStaff} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</Label>
            <Input 
              placeholder="e.g. Dr. John Doe or Nurse Jane" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Address</Label>
            <Input 
              type="email"
              placeholder="doctor@hospital.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</Label>
            <Input 
              type="password"
              placeholder="Min 6 characters" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20 text-sm">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor1">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full bg-[#0D7A70] hover:bg-[#0c6b62] text-white font-bold rounded-xl h-11 shadow-sm"
              disabled={busy}
            >
              {busy ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Create Staff Account</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
