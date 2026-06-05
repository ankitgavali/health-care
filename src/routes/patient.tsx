import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { db, auth } from "@/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs, doc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { calculateAge, statusColor, statusLabel, doctorName, CaseStatus, parseCaseNotes } from "@/lib/case-utils";
import { generateCasePaperPDF, generatePDFFromElementId, shareCasePaperPDF } from "@/lib/pdf";
import { FileText, Download, Share2, Loader2, Plus, Stethoscope } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";

export const Route = createFileRoute("/patient")({
  component: () => (
    <AppShell title="Patient"><PatientPage /></AppShell>
  ),
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(2).max(500),
  mobile: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "Invalid mobile"),
  dob: z.string().min(1, "DOB required"),
  notes: z.string().max(2000).optional(),
  marital_status: z.string().optional(),
  education: z.string().optional(),
  occupation: z.string().optional(),
  parents_occupation: z.string().optional(),
  menstrual_history: z.string().optional(),
  past_history: z.string().optional(),
  weight: z.string().optional(),
  gender: z.string().optional(),
});

function PatientPage() {
  const { user, loading, refreshRole } = useAuth();
  const [form, setForm] = useState({ full_name: "", address: "", mobile: "", dob: "", notes: "", marital_status: "", education: "", occupation: "", parents_occupation: "", menstrual_history: "", past_history: "", weight: "", gender: "" });
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const age = useMemo(() => calculateAge(form.dob), [form.dob]);

  useEffect(() => {
    const checkAndAutoLogin = async () => {
      if (loading) return;
      if (user) {
        if (user.email === "guest.patient@medicare.local") {
          const rolesQuery = query(collection(db, "user_roles"), where("user_id", "==", user.uid), where("role", "==", "patient"));
          const rolesSnapshot = await getDocs(rolesQuery);
          if (rolesSnapshot.empty) {
            await setDoc(doc(db, "user_roles", user.uid), { user_id: user.uid, role: "patient" });
          }
        }
        setAuthChecking(false);
        return;
      }

      try {
        const guestEmail = "guest.patient@medicare.local";
        const guestPassword = "guestPassword123";

        let signData;
        try {
          signData = await signInWithEmailAndPassword(auth, guestEmail, guestPassword);
        } catch (signErr) {
          // If sign in fails, sign up the guest patient
          const upData = await createUserWithEmailAndPassword(auth, guestEmail, guestPassword);
          signData = upData;
        }

        // Now that we are signed in, ensure the role is set
        if (signData?.user) {
          const rolesQuery = query(collection(db, "user_roles"), where("user_id", "==", signData.user.uid), where("role", "==", "patient"));
          const rolesSnapshot = await getDocs(rolesQuery);
          if (rolesSnapshot.empty) {
            await setDoc(doc(db, "user_roles", signData.user.uid), { user_id: signData.user.uid, role: "patient" });
          }
          
          await setDoc(doc(db, "profiles", signData.user.uid), { full_name: "Guest Patient", email: guestEmail }, { merge: true });
        }

        await refreshRole();
      } catch (err) {
        console.error("Auto-login failed:", err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAndAutoLogin();
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "case_papers"),
      where("patient_id", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedCases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort locally to avoid Firestore composite index requirement
      fetchedCases.sort((a: any, b: any) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      const isGuest = user.email === "guest.patient@medicare.local";
      if (isGuest) {
        try {
          // Clean up old localStorage so it doesn't cause issues for returning users
          localStorage.removeItem("healthbridge_submitted_case_ids");
          
          const localIds = JSON.parse(sessionStorage.getItem("healthbridge_submitted_case_ids") || "[]");
          if (Array.isArray(localIds)) {
            fetchedCases = fetchedCases.filter((c: any) => localIds.includes(c.id));
          } else {
            fetchedCases = [];
          }
        } catch (e) {
          fetchedCases = [];
        }
      }
      setCases(fetchedCases.map(parseCaseNotes));
      if (fetchedCases.length === 0) {
        setIsDialogOpen(true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    if (!user) {
      toast.error("Please wait, connecting to server or verification failed. Check your internet connection.");
      return;
    }
    setBusy(true);
    try {
      const newDocRef = doc(collection(db, "case_papers"));
      const newId = newDocRef.id;

      try {
        sessionStorage.setItem("healthbridge_submitted_case_ids", JSON.stringify([newId]));
      } catch (e) {
        console.error("Failed to save case id to session storage", e);
      }

      await setDoc(newDocRef, {
        patient_id: user.uid,
        full_name: form.full_name.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        dob: form.dob,
        age,
        notes: JSON.stringify({
          notes: form.notes?.trim() || "",
          marital_status: form.marital_status?.trim() || "",
          education: form.education?.trim() || "",
          occupation: form.occupation?.trim() || "",
          parents_occupation: form.parents_occupation?.trim() || "",
          menstrual_history: form.menstrual_history?.trim() || "",
          past_history: form.past_history?.trim() || "",
          weight: form.weight?.trim() || "",
          gender: form.gender?.trim() || "",
        }),
        status: "submitted",
        created_at: new Date().toISOString(),
      });
      
      setBusy(false);
      toast.success("Case paper submitted! Downloading...");

      // Build a case object from form data for immediate PDF generation (works on mobile)
      const submittedCase = {
        id: newId,
        full_name: form.full_name.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        dob: form.dob,
        age,
        gender: form.gender,
        marital_status: form.marital_status,
        education: form.education,
        occupation: form.occupation,
        parents_occupation: form.parents_occupation,
        notes: form.notes,
        menstrual_history: form.menstrual_history,
        past_history: form.past_history,
        weight: form.weight,
        status: "submitted",
        created_at: new Date().toISOString(),
        prescription: null,
        medical_notes: null,
        assigned_doctor: null,
        medicines: null,
        tests: null,
        consultation_charge: 0,
        medicine_charge: 0,
        test_charge: 0,
        other_charge: 0,
        total_bill: 0,
      } as any;

      // Small delay so the toast is visible, then generate PDF
      setTimeout(() => {
        try {
          generateCasePaperPDF(submittedCase);
        } catch (pdfErr) {
          console.error("PDF generation error:", pdfErr);
          toast.error("PDF download failed. Open case paper below to download.");
        }
      }, 300);

      setForm({ full_name: "", address: "", mobile: "", dob: "", notes: "", marital_status: "", education: "", occupation: "", parents_occupation: "", menstrual_history: "", past_history: "", weight: "", gender: "" });
      setIsDialogOpen(false);
    } catch (err: any) {
      setBusy(false);
      return toast.error(err.message);
    }
  };

  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
        <p className="text-slate-500 font-medium">Preparing Case Paper Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-7 w-7 text-primary" /> My Case Papers</h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
             <Button className="gap-2 shadow-md"><Plus className="h-4 w-4" /> New Case Paper</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
             <DialogHeader>
                <DialogTitle>New Case Paper</DialogTitle>
                <DialogDescription>Fill in your details to register a visit</DialogDescription>
             </DialogHeader>
             <form onSubmit={submit} className="space-y-4 pt-4">
                 <div>
                   <Label>Full name</Label>
                   <div className="relative">
                     <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="pr-10" required />
                     <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, full_name: f.full_name ? f.full_name + " " + val : val }))} />
                   </div>
                 </div>
                 <div>
                   <Label>Address</Label>
                   <div className="relative">
                     <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="pr-10" required />
                     <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, address: f.address ? f.address + " " + val : val }))} positionClassName="top-3" />
                   </div>
                 </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Mobile</Label>
                      <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                 {form.dob && (
                   <div className="rounded-lg border bg-secondary/50 px-3 py-2 text-sm">
                     Age: <span className="font-semibold">{age}</span> years
                   </div>
                 )}
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Marital Status</Label>
                      <Select value={form.marital_status} onValueChange={(val) => setForm({ ...form, marital_status: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Unmarried">Unmarried</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                   <div>
                     <Label>Education</Label>
                     <Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <Label>Occupation</Label>
                     <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
                   </div>
                   <div>
                     <Label>Parent's Occu.</Label>
                     <Input value={form.parents_occupation} onChange={(e) => setForm({ ...form, parents_occupation: e.target.value })} />
                   </div>
                 </div>
                 <div>
                   <Label>Chief Complaints / History of present illness</Label>
                   <div className="relative">
                     <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="pr-10" />
                     <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, notes: f.notes ? f.notes + " " + val : val }))} positionClassName="top-3" />
                   </div>
                 </div>
                  <div className={`grid ${form.gender === 'Female' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                    {form.gender === "Female" && (
                      <div>
                        <Label>पाळीचा इतिहास</Label>
                        <Input value={form.menstrual_history} onChange={(e) => setForm({ ...form, menstrual_history: e.target.value })} />
                      </div>
                    )}
                   <div>
                     <Label>मागील इतिहास</Label>
                     <Input value={form.past_history} onChange={(e) => setForm({ ...form, past_history: e.target.value })} />
                   </div>
                   <div>
                     <Label>वजन (Weight)</Label>
                     <Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 60 kg" />
                   </div>
                 </div>
                <Button type="submit" className="w-full h-11 bg-cyan-700 hover:bg-cyan-800 text-white shadow-md shadow-cyan-900/20" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit case paper
                </Button>
             </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-10">
        {cases.length === 0 && (
          <Card className="glass border-0 p-12 text-center text-muted-foreground">
            No case papers yet. Click "New Case Paper" to get started.
          </Card>
        )}
        
        {cases.map((c) => (
          <div key={c.id} className="relative mx-auto w-full max-w-[850px] mb-8 bg-white shadow-2xl transition-all hover:shadow-3xl flex flex-col border border-slate-200 rounded-2xl overflow-hidden">
            
            {/* Responsive Wrapper for Mobile */}
            <div className="w-full bg-slate-100/50 dark:bg-slate-900/20">
              <div className="w-full p-4 sm:p-8 flex justify-center">
                
                {/* The actual view (Responsive on mobile, A4-like max width on desktop) */}
                <div id={`case-paper-${c.id}`} className="bg-white relative flex flex-col overflow-hidden text-black font-serif shadow-md border border-slate-200 shrink-0 w-full max-w-[794px] sm:min-h-[1123px]">
              
              {/* Faint Bottom-Left Swoosh (Simplified to avoid html2canvas crash) */}
              <div className="absolute bottom-0 left-0 w-[70%] h-[35%] bg-yellow-600/5 rounded-tr-[200px] z-0 pointer-events-none"></div>

              {/* Top Curved Yellow Header */}
              <div className="relative w-full bg-[#fbbd08] px-4 sm:px-8 pt-6 sm:pt-8 pb-10 sm:pb-14 z-10 rounded-b-[40px] sm:rounded-b-[60px]">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 sm:gap-0">
                  
                  {/* Left: Doctor 1 */}
                  <div className="text-center sm:text-left w-full sm:w-1/3 sm:pt-2 sm:pl-2">
                    <div className="font-bold text-black text-lg sm:text-xl whitespace-nowrap">Dr. Kadambari Jagtap</div>
                    <div className="text-[10px] sm:text-xs text-black font-semibold mt-1">MD Ayu. Sch.</div>
                  </div>

                  {/* Center: Doctor 2 & Quote */}
                  <div className="text-center w-full sm:w-1/3 flex flex-col items-center order-first sm:order-none">
                    <div className="text-sm font-bold text-black">॥ श्रीः ॥</div>
                    <div className="font-bold text-black text-lg sm:text-xl mt-1 whitespace-nowrap">Dr. Omprasad Jagtap</div>
                    <div className="text-[10px] sm:text-xs text-black font-semibold mt-1">MD Ayu.</div>
                    <div className="text-[9px] sm:text-[11px] text-black font-bold mt-2 tracking-wide whitespace-nowrap">स्वास्थ्यरक्षणार्थं...व्याधिमोक्षणार्थं...</div>
                  </div>

                  {/* Right: Logo */}
                  <div className="w-full sm:w-1/3 flex justify-center sm:justify-end sm:pr-2">
                    <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                        <circle cx="50" cy="50" r="48" fill="#fbbd08" />
                        <circle cx="50" cy="50" r="42" fill="black" />
                        <path d="M50 25 C45 35 45 60 50 78 C55 60 55 35 50 25 Z" fill="#fbbd08" />
                        <path d="M50 48 C40 54 34 62 30 68 C40 64 47 58 50 48 Z" fill="#fbbd08" />
                        <path d="M50 48 C60 54 66 62 70 68 C60 64 53 58 50 48 Z" fill="#fbbd08" />
                        <text x="50" y="20" className="fill-black font-bold text-[8px]" letterSpacing="1" textAnchor="middle">
                          MOOLATVAM AYURVED
                        </text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 px-4 sm:px-10 py-6 sm:py-8 z-10 flex flex-col text-[12px] sm:text-[14px]">
                
                {/* Row 1: Name */}
                <div className="flex flex-col sm:flex-row sm:mb-6 mb-4 items-start sm:items-end gap-1 sm:gap-0">
                  <div className="font-bold whitespace-nowrap mr-2">Name :</div>
                  <div className="font-semibold uppercase flex-1 w-full sm:w-auto border-b border-black/20 pb-0.5">{c.full_name}</div>
                </div>

                {/* Grid for main details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 sm:gap-y-6 mb-8 w-full">
                  
                  {/* Row 1 */}
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Date Of Birth:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.dob ? new Date(c.dob).toLocaleDateString("en-IN") : ""}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Age & Gender:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.age} Y {c.gender ? `/ ${c.gender}` : ''}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Date:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Phone No.:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.mobile}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Married Status:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.marital_status || "—"}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Education:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.education || "—"}</span>
                  </div>

                  {/* Row 3 */}
                  <div className="flex items-start sm:col-span-2">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap mt-1">Address:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5 min-h-[36px] pt-1 leading-normal">{c.address}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Occupation:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.occupation || "—"}</span>
                  </div>

                  {/* Row 4 */}
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Parent's Occu.:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.parents_occupation || "—"}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Weight:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.weight || "—"}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-slate-800 whitespace-nowrap">Past History:</span>
                    <span className="font-semibold flex-1 border-b border-black/20 pb-0.5">{c.past_history || "—"}</span>
                  </div>
                </div>

                {/* Clinical History Section (Vertical Stack with spacing) */}
                <div className="space-y-5 mt-6 border-t border-slate-200/50 pt-6">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-slate-800">History of present illness :</span>
                    <div className="font-semibold border-b border-black/20 pb-2 leading-relaxed min-h-[28px]">{c.notes || "—"}</div>
                  </div>

                  {c.gender === "Female" && (
                    <div className="flex flex-col gap-2">
                      <span className="font-bold text-slate-800">पाळीचा इतिहास (Menstrual History) :</span>
                      <div className="font-semibold border-b border-black/20 pb-2 leading-relaxed min-h-[28px]">{c.menstrual_history || "—"}</div>
                    </div>
                  )}
                </div>

                {/* Doctor's Notes & Prescription */}
                {(c.prescription || c.medical_notes) && (
                  <div className="mt-12 border-t border-dashed border-slate-300 pt-6">
                    <h4 className="font-bold text-lg mb-4 text-[#b45309]">Doctor's Observations & Prescription</h4>
                    {c.medical_notes && (
                       <div className="mb-4">
                         <div className="font-bold mb-1">Diagnosis:</div>
                         <div className="whitespace-pre-wrap font-medium">{c.medical_notes}</div>
                       </div>
                    )}
                    {c.prescription && (
                       <div>
                         <div className="font-serif font-bold text-2xl mb-1 text-[#b45309]">Rx</div>
                         <div className="whitespace-pre-wrap font-medium">{c.prescription}</div>
                       </div>
                    )}
                  </div>
                )}

                {c.diet_lifestyle && (
                   <div className="mt-8 border-t border-dashed border-slate-300 pt-6">
                     <h4 className="font-bold text-lg mb-4 text-[#0F5A3A]">पथ्य आणि अपथ्य (Diet & Lifestyle Recommendations)</h4>
                     <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 leading-relaxed font-semibold italic">
                       {c.diet_lifestyle}
                     </div>
                   </div>
                )}
                
              </div>
              <div className="px-4 sm:px-10 pb-6 mt-auto z-10">
                <div className="text-center font-bold text-[11px] sm:text-[12px] text-black">Consent</div>
                <div className="text-[9px] sm:text-[10px] text-black leading-tight text-justify mt-1 mb-6">
                  I, hereby consent to the collection of personal information for medical purposes. This includes demographic details, medical history, and contact information. I understand that this information is essential for accurate diagnosis and treatment planning. I authorize healthcare professionals to administer necessary treatments based on this collected information. I also grant permission for the collection of photos for medical records, research, and promotional activities related to healthcare. These images may be used anonymously to enhance medical understanding, contribute to research initiatives, and for promotional materials. I acknowledge that my personal information and images will be handled with utmost confidentiality and in compliance with applicable privacy laws.
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-6 sm:gap-0">
                  <div className="w-full sm:w-1/2 flex flex-col gap-3">
                    <div className="flex items-end">
                      <span className="font-bold text-[12px] sm:text-[13px] text-black mr-2">Name :</span>
                      <span className="font-semibold uppercase text-[12px] sm:text-[13px]">{c.full_name}</span>
                    </div>
                    <div className="flex items-end">
                      <span className="font-bold text-[12px] sm:text-[13px] text-black mr-2">Signature :</span>
                    </div>
                  </div>
                  
                  {/* Doctor Signature if billed/reviewed */}
                  {c.assigned_doctor && c.status !== "submitted" && (
                    <div className="w-full sm:w-1/3 text-center sm:text-right mt-4 sm:mt-0">
                      <div className="pb-4 text-sm font-serif italic font-semibold">{doctorName[c.assigned_doctor as "doctor1" | "doctor2"]}</div>
                      <div className="text-[10px] font-bold mt-1 uppercase text-black sm:border-t border-black pt-1 inline-block sm:block border-t">Consulting Signature</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Yellow Footer */}
              <div className="relative w-full bg-[#fbbd08] px-4 sm:px-10 py-3 z-10 rounded-tl-[40px] sm:rounded-tl-[80px]">
                <div className="flex justify-center sm:justify-end items-center mb-1 gap-2 text-black font-bold text-[10px] sm:text-[12px]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  9404306548 | 8867303202
                </div>
                <div className="text-center text-[9px] sm:text-[11px] text-black font-semibold mt-1">
                  Address : Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli. 416416
                </div>
              </div>

            </div>
              </div>
            </div>
            
            {/* Action Bar (outside printable area) */}
            <div className="border-t border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center rounded-b-2xl">

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColor[c.status as CaseStatus]} variant="outline">
                  {statusLabel[c.status as CaseStatus]}
                </Badge>
                <span className="font-mono text-xs text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">ID: {c.id.substring(0,8).toUpperCase()}</span>
                {c.whatsapp_reminders && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 animate-pulse" variant="outline">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    reminders active
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Download Button — direct save, no share dialog */}
                <Button 
                  onClick={() => {
                    try {
                      generateCasePaperPDF(c);
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to generate PDF.");
                    }
                  }} 
                  className="gap-2 shadow-md bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs h-9"
                >
                  <Download className="h-4 w-4" /> Download
                </Button>

                {/* Share Button — opens native share/WhatsApp dialog */}
                <Button 
                  onClick={() => {
                    try {
                      shareCasePaperPDF(c);
                    } catch (err) {
                      console.error(err);
                      toast.error("Share failed.");
                    }
                  }} 
                  variant="outline"
                  className="gap-2 shadow-sm border-yellow-500 text-yellow-700 hover:bg-yellow-50 rounded-xl text-xs h-9"
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>

                {/* Test WhatsApp Reminder Button */}
                {c.whatsapp_reminders && (
                  <Button 
                    onClick={() => {
                      const text = `🌿 *Moolatvam Ayurved* 🌿\n\nनमस्कार *${c.full_name}*,\n\nतुमच्या आयुर्वेदिक औषधांची आणि आहाराची वेळ झाली आहे. \n\n📋 *औषधोपचार (Rx):*\n${c.prescription || 'दिलेली औषधे वेळेवर घ्या.'}\n\n🍏 *पथ्य आणि अपथ्य (Diet Guide):*\n${c.diet_lifestyle || 'गरम, ताजे आणि साधे अन्न घ्यावे.'}\n\n⏰ *वेळ (Schedule):* ${c.whatsapp_reminder_schedule || 'सकाळी आणि रात्री'}\n\nआपली काळजी घ्या, निरोगी राहा!`;
                      const url = `https://wa.me/${c.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
                      window.open(url, "_blank");
                      toast.success("WhatsApp Reminder Link Opened!");
                    }}
                    className="gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.473 1.452 5.38 1.453 5.485 0 9.948-4.461 9.952-9.948.002-2.659-1.03-5.159-2.905-7.038C17.2 1.74 14.706.709 12.043.709 6.559.709 2.096 5.17 2.093 10.66c-.001 1.93.499 3.816 1.447 5.429L2.52 21.68l5.885-1.543c1.558.85 3.306 1.298 5.085 1.298h.004zM16.9 14.364c-.266-.134-1.579-.78-1.823-.867-.243-.089-.422-.132-.599.135-.177.266-.685.867-.84.1.044-.155.156-.308.267-.542.112-.233.056-.439-.028-.573-.083-.134-.686-1.654-.939-2.267-.247-.594-.499-.512-.686-.522-.178-.009-.382-.01-.587-.01-.205 0-.539.077-.822.386-.283.308-1.08.1.554-1.08 1.08s-.822-1.08-1.08-1.08c-.26-.113-.78-.266-1.043-.266-.263 0-.58.098-.867.386-.29.308-.885.867-.885 2.115 0 1.248.908 2.454 1.03 2.622.124.168 1.787 2.729 4.33 3.827.605.26 1.077.416 1.444.533.608.193 1.162.166 1.6.1.49-.073 1.579-.645 1.8-.1.236-.226.59-.867.59-.867s-.083-.153-.133-.239z"/>
                    </svg>
                    Test Reminder
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background p-3 shadow-sm border border-border/50">
      <div className="text-[11px] font-bold uppercase tracking-wider text-primary/70 mb-1">{label}</div>
      <div className="truncate font-semibold text-base">{value}</div>
    </div>
  );
}
