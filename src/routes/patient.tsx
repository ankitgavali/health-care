import { createFileRoute, Link } from "@tanstack/react-router";
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

      // Always filter to only show case papers submitted in the current session for privacy
      try {
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
        const existingIds = JSON.parse(sessionStorage.getItem("healthbridge_submitted_case_ids") || "[]");
        const updatedIds = Array.isArray(existingIds) ? [...existingIds, newId] : [newId];
        sessionStorage.setItem("healthbridge_submitted_case_ids", JSON.stringify(updatedIds));
      } catch (e) {
        console.error("Failed to save case id to session storage", e);
        sessionStorage.setItem("healthbridge_submitted_case_ids", JSON.stringify([newId]));
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
                <div id={`case-paper-${c.id}`} className="bg-white relative flex flex-col overflow-hidden text-black font-serif shadow-md border border-slate-200 shrink-0 w-full max-w-[794px] min-h-[1123px]">
              
              {/* Top Header Background SVG */}
              <div className="absolute top-0 left-0 w-full h-[180px] z-0 pointer-events-none">
                <svg preserveAspectRatio="none" viewBox="0 0 1000 200" className="w-full h-full">
                  {/* Orange wave */}
                  <path d="M0,0 L1000,0 L1000,175 Q600,215 0,135 Z" fill="#f97316" />
                  {/* Yellow wave */}
                  <path d="M0,0 L1000,0 L1000,160 Q600,200 0,120 Z" fill="#fbbd08" />
                </svg>
              </div>

              {/* Faint Rectangle on Top Right */}
              <div className="absolute top-5 right-8 w-36 h-9 bg-[#fde047]/60 rounded z-10 pointer-events-none"></div>

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
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                      <circle cx="50" cy="50" r="48" fill="#fbbd08" />
                      <circle cx="50" cy="50" r="43" fill="none" stroke="black" strokeWidth="1" />
                      <circle cx="50" cy="50" r="41" fill="black" />
                      <path d="M50 25 C45 35 45 60 50 78 C55 60 55 35 50 25 Z" fill="#fbbd08" />
                      <path d="M50 48 C40 54 34 62 30 68 C40 64 47 58 50 48 Z" fill="#fbbd08" />
                      <path d="M50 48 C60 54 66 62 70 68 C60 64 53 58 50 48 Z" fill="#fbbd08" />
                      <path id={`curve-top-${c.id}`} d="M 14 53 A 36 36 0 1 1 86 53" fill="none" />
                      <text className="fill-[#fbbd08] font-bold text-[10px]" letterSpacing="1.5">
                        <textPath href={`#curve-top-${c.id}`} startOffset="50%" textAnchor="middle">MOOLATVAM AYURVED</textPath>
                      </text>
                      <path id={`curve-bottom-${c.id}`} d="M 14 62 A 36 36 0 0 0 86 62" fill="none" />
                      <text className="fill-[#fbbd08] font-bold text-[4.5px]" letterSpacing="0.5">
                         <textPath href={`#curve-bottom-${c.id}`} startOffset="50%" textAnchor="middle">स्वास्थ्यरक्षणार्थं...व्याधिमोक्षणार्थं...</textPath>
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="relative z-10 px-12 py-8 flex-1 flex flex-col text-[14px] font-medium leading-relaxed">
                
                {/* Name */}
                <div className="flex mb-6">
                  <span className="font-bold mr-2 whitespace-nowrap text-[15px]">Name :</span>
                  <span className="flex-1 font-semibold border-b border-black/20 text-[15px] pb-1 uppercase">{c.full_name}</span>
                </div>

                {/* Grid layout exactly matching image */}
                <div className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-x-4 gap-y-7 w-full">
                  
                  {/* Row 1 */}
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Date Of Birth:</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.dob ? new Date(c.dob).toLocaleDateString("en-IN") : ""}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Age & Gender :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.age} {c.gender ? `/ ${c.gender}` : ''}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Date :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Phone No. :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.mobile}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Married/Unmarried :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.marital_status}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Education :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.education}</span>
                  </div>

                  {/* Row 3 & 4 (Address spanning 2 rows on left) */}
                  <div className="col-span-2 row-span-2 flex items-start">
                    <span className="font-bold mr-2 mt-1 text-[15px]">Address :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 min-h-[50px] pr-4 whitespace-pre-wrap leading-relaxed">{c.address}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Occupation :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.occupation}</span>
                  </div>
                  
                  {/* Row 4 right side */}
                  <div className="flex items-end">
                    <span className="font-bold mr-2 text-[15px]">Parent's Occu. :</span>
                    <span className="flex-1 font-semibold border-b border-black/20 pb-0.5">{c.parents_occupation}</span>
                  </div>
                </div>

                {/* History Section - 4 labels spread horizontally */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-4 w-full mt-10 mb-2">
                  <div className="flex">
                    <span className="font-bold mr-2 text-[15px]">History of present illness :</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2 text-[15px]">पाळीचा इतिहास</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2 text-[15px]">मागील इतिहास</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold mr-2 text-[15px]">वजन :</span>
                  </div>
                </div>

                {/* Actual data for History */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-4 w-full mb-6">
                  <div className="font-semibold min-h-[50px] pr-2 whitespace-pre-wrap border-b border-black/20">{c.notes}</div>
                  <div className="font-semibold min-h-[50px] pr-2 border-b border-black/20">{c.menstrual_history}</div>
                  <div className="font-semibold min-h-[50px] pr-2 border-b border-black/20">{c.past_history}</div>
                  <div className="font-semibold min-h-[50px] border-b border-black/20">{c.weight}</div>
                </div>

                {/* Doctor's Notes & Prescription (If available) */}
                {(c.prescription || c.medical_notes) && (
                  <div className="mt-8 pt-4 border-t border-slate-200">
                    {c.medical_notes && (
                       <div className="mb-4">
                         <div className="font-bold mb-1 underline text-[15px]">Diagnosis:</div>
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
                
              </div>

              {/* Solid Yellow & Orange Footer */}
              <div className="absolute bottom-0 left-0 w-full h-[120px] z-0 pointer-events-none overflow-hidden">
                <svg preserveAspectRatio="none" viewBox="0 0 1000 150" className="w-full h-full">
                  {/* Orange wave */}
                  <path d="M0,150 L0,50 Q400,110 1000,50 L1000,150 Z" fill="#f97316" />
                  {/* Yellow wave */}
                  <path d="M0,150 L0,70 Q400,130 1000,70 L1000,150 Z" fill="#fbbd08" />
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
                    <span className="font-semibold uppercase text-[13px]">{c.full_name}</span>
                  </div>
                  <div className="flex items-end">
                    <span className="font-bold text-[13px] text-black w-[80px]">Signature :</span>
                  </div>
                </div>
              </div>

              {/* Bottom Yellow Footer Content overlay */}
              <div className="absolute bottom-3 left-0 w-full z-10 px-12 flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-black font-bold text-[12px] mb-1.5 mr-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  9404306548 | 8867303202
                </div>
                <div className="text-[11px] text-black font-semibold">
                  Address : Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli. 416416
                </div>
              </div>

            </div>
              </div>
            </div>
            
            {/* Action Bar (outside printable area) */}
            <div className="border-t border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center rounded-b-2xl">

              <div className="flex items-center gap-2">
                <Badge className={statusColor[c.status as CaseStatus]} variant="outline">
                  {statusLabel[c.status as CaseStatus]}
                </Badge>
                <span className="font-mono text-xs text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">ID: {c.id.substring(0,8).toUpperCase()}</span>
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

                {/* Done Button — returns to homepage and clears session */}
                <Link to="/">
                  <Button 
                    variant="ghost"
                    className="rounded-xl text-xs h-9 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    Done
                  </Button>
                </Link>
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
