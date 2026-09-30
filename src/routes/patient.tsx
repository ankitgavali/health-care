import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { db, auth } from "@/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { useAuth } from "@/hooks/use-auth";

import { motion, AnimatePresence } from "framer-motion";

function AnimatedWrapper({ children }: { children: React.ReactNode, index?: number }) {
  return (
    <div className="flex flex-col h-full [&>div]:flex-1 [&>div]:h-full">
      {children}
    </div>
  );
}
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
import { FileText, Download, Share2, Loader2, Plus, Stethoscope, Smartphone, ZoomIn, Calendar, Phone, MapPin, User, ClipboardList, Pill } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";

export const Route = createFileRoute("/patient")({
  component: () => (
    <AppShell title="Patient"><PatientPage /></AppShell>
  ),
});

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

function CasePaperCard({ c, setBusy }: { c: any; setBusy: (b: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isFitMode, setIsFitMode] = useState(true);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const isMobile = width < 820;
      setIsMobileScreen(isMobile);

      if (isFitMode && isMobile) {
        // Compute scale factor based on container width
        const computedScale = Math.min(1, Math.max(0.35, (width - 16) / 794));
        setScale(computedScale);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFitMode]);

  return (
    <div className="relative mx-auto w-full max-w-[850px] mb-8 bg-white dark:bg-slate-900 shadow-xl transition-all hover:shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
      {/* Top Header Bar with Status & Mobile Fit/Zoom Toggle */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className={statusColor[c.status as CaseStatus]} variant="outline">
            {statusLabel[c.status as CaseStatus]}
          </Badge>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold">
            ID: {c.id.substring(0, 8).toUpperCase()}
          </span>
        </div>

        {/* View Mode Switch on Mobile/Tablet screens */}
        {isMobileScreen && (
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setIsFitMode(true)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                isFitMode
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Fit Screen ({Math.round(scale * 100)}%)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFitMode(false)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                !isFitMode
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ZoomIn className="h-3.5 w-3.5" />
              <span>100% Zoom</span>
            </button>
          </div>
        )}
      </div>

      {/* Printable Area Wrapper with Dynamic Scaling */}
      <div ref={containerRef} className="w-full bg-slate-100/70 dark:bg-slate-950/40 p-2 sm:p-4 md:p-6 overflow-hidden">
        <div
          className={`w-full flex ${
            isFitMode && scale < 1 ? "justify-center overflow-hidden" : "overflow-x-auto justify-start xl:justify-center custom-scrollbar"
          }`}
          style={{
            height: isFitMode && scale < 1 ? `${Math.ceil(1123 * scale) + 8}px` : "auto",
          }}
        >
          {/* The actual view (Fixed 794px A4 width to ensure PDF consistency) */}
          <div
            id={`case-paper-${c.id}`}
            style={{
              transform: isFitMode && scale < 1 ? `scale(${scale})` : "none",
              transformOrigin: "top center",
            }}
            className="bg-white relative flex flex-col overflow-hidden text-black font-serif shadow-lg border border-slate-200 shrink-0 w-[794px] min-w-[794px] min-h-[1123px] rounded-sm"
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
                  <LogoSVG idPrefix={`case-${c.id}`} />
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="relative z-10 px-12 py-8 flex-1 flex flex-col text-[14px] font-medium leading-relaxed">
              {/* Name */}
              <div className="flex mb-6">
                <span className="font-bold mr-2 whitespace-nowrap">Name :</span>
                <span className="flex-1 font-semibold">{c.full_name}</span>
              </div>

              {/* Grid layout matching official format */}
              <div className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-x-4 gap-y-6 w-full">
                {/* Row 1 */}
                <div className="flex">
                  <span className="font-bold mr-2">Date Of Birth:</span>
                  <span className="flex-1 font-semibold">{c.dob ? new Date(c.dob).toLocaleDateString("en-IN") : ""}</span>
                </div>
                <div className="flex">
                  <span className="font-bold mr-2">Age & Gender :</span>
                  <span className="flex-1 font-semibold">{c.age} {c.gender ? `/ ${c.gender}` : ""}</span>
                </div>
                <div className="flex">
                  <span className="font-bold mr-2">Date :</span>
                  <span className="flex-1 font-semibold">{new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                </div>

                {/* Row 2 */}
                <div className="flex">
                  <span className="font-bold mr-2">Phone No. :</span>
                  <span className="flex-1 font-semibold">{c.mobile}</span>
                </div>
                <div className="flex">
                  <span className="font-bold mr-2">Married/Unmarried :</span>
                  <span className="flex-1 font-semibold">{c.marital_status}</span>
                </div>
                <div className="flex">
                  <span className="font-bold mr-2">Education :</span>
                  <span className="flex-1 font-semibold">{c.education}</span>
                </div>

                {/* Row 3 & 4 (Address spanning 2 rows on left) */}
                <div className="col-span-2 row-span-2 flex items-start">
                  <span className="font-bold mr-2 mt-0.5">Address :</span>
                  <span className="flex-1 font-semibold pr-4 whitespace-pre-wrap leading-relaxed">{c.address}</span>
                </div>
                <div className="flex">
                  <span className="font-bold mr-2">Occupation :</span>
                  <span className="flex-1 font-semibold">{c.occupation}</span>
                </div>

                {/* Row 4 right side */}
                <div className="flex">
                  <span className="font-bold mr-2">Parent's Occu. :</span>
                  <span className="flex-1 font-semibold">{c.parents_occupation}</span>
                </div>
              </div>

              {/* History Section - 4 labels spread horizontally */}
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

              {/* Actual data for History */}
              <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] gap-4 w-full mb-6">
                <div className="font-semibold min-h-[40px] pr-2 whitespace-pre-wrap">{c.notes}</div>
                <div className="font-semibold min-h-[40px] pr-2">{c.menstrual_history}</div>
                <div className="font-semibold min-h-[40px] pr-2">{c.past_history}</div>
                <div className="font-semibold min-h-[40px]">{c.weight}</div>
              </div>

              {/* Doctor's Observations & Treatment Section matching Image 3 */}
              {(c.medical_notes || c.prescription || c.medicines || c.tests) && (
                <div className="mt-6 pt-4 border-t border-slate-300">
                  <div className="grid grid-cols-[1fr_1.1fr] gap-4 items-start">
                    
                    {/* LEFT COLUMN: Diagnosis & Clinical Notes */}
                    <div className="flex flex-col h-full">
                      <div className="font-bold text-[13px] text-black mb-1 flex items-center justify-between">
                        <span>Diagnosis & Clinical Notes :</span>
                        <span className="text-[10px] text-slate-500 font-normal">निदान व तपासणी</span>
                      </div>
                      <div className="whitespace-pre-wrap font-medium text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200 min-h-[140px] text-black">
                        {c.medical_notes || "—"}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: 2 Clean Sections (Unified Rx & Clinical Tests) */}
                    <div className="flex flex-col gap-3">
                      
                      {/* Section 1: Unified Rx Prescription & Medicines */}
                      {( (c.dose_medicines && c.dose_medicines.length > 0) || c.prescription || c.medicines ) && (
                        <div>
                          <div className="font-bold text-[13px] text-black mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="font-serif font-bold text-base text-[#b45309]">Rx</span>
                              <span>Prescription & Medicines (औषधोपचार) :</span>
                            </span>
                            {c.dose_medicines && c.dose_medicines.length > 0 && (
                              <span className="text-[10.5px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                                <Pill className="h-3 w-3 text-amber-700" />
                                <span>{c.dose_medicines.length} Medicines</span>
                              </span>
                            )}
                          </div>

                          {c.dose_medicines && c.dose_medicines.length > 0 ? (
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
                                  {c.dose_medicines.map((m: any, idx: number) => (
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
                              {c.prescription && (
                                <div className="p-2 bg-amber-50/50 border-t border-amber-200 text-xs font-serif text-black">
                                  <span className="font-bold mr-1 text-[#b45309]">विशेष सूचना / पथ्य (Advice):</span>
                                  <span className="whitespace-pre-wrap">{c.prescription}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap font-medium text-xs bg-amber-50/40 p-2.5 rounded-lg border border-amber-200 text-black">
                              {c.prescription || c.medicines}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Section 2: Clinical Tests */}
                      {c.tests && (
                        <div>
                          <div className="font-bold text-[13px] text-black mb-1">
                            Clinical Tests (तपासण्या / लॅब टेस्ट) :
                          </div>
                          <div className="whitespace-pre-wrap font-medium text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 text-black">
                            {c.tests}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
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
      </div>

      {/* Action Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-b-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Created on {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>

        <div className="flex items-center justify-end w-full sm:w-auto gap-2 flex-wrap">
          {/* Download Button */}
          <Button
            onClick={() => {
              setBusy(true);
              try {
                generatePDFFromElementId(`case-paper-${c.id}`, `Case-Paper-${c.full_name}`);
              } catch (err) {
                console.error(err);
                toast.error("Failed to generate PDF.");
              } finally {
                setBusy(false);
              }
            }}
            className="flex-1 sm:flex-initial gap-1.5 shadow-md bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9 px-3.5"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>

          {/* Share Button */}
          <Button
            onClick={() => {
              setBusy(true);
              try {
                generatePDFFromElementId(`case-paper-${c.id}`, `Case-Paper-${c.full_name}`, "share");
              } catch (err) {
                console.error(err);
                toast.error("Share failed.");
              } finally {
                setBusy(false);
              }
            }}
            variant="outline"
            className="flex-1 sm:flex-initial gap-1.5 shadow-sm border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl text-xs h-9 px-3.5"
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>

          {/* Done Button */}
          <Link to="/">
            <Button
              variant="ghost"
              className="rounded-xl text-xs h-9 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-transparent hover:border-slate-300 dark:hover:border-slate-700 px-3"
            >
              Done
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

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
        if (user.email === "guest.patient@medicare.local" || user.isAnonymous) {
          try {
            const rolesQuery = query(collection(db, "user_roles"), where("user_id", "==", user.uid), where("role", "==", "patient"));
            const rolesSnapshot = await getDocs(rolesQuery);
            if (rolesSnapshot.empty) {
              await setDoc(doc(db, "user_roles", user.uid), { user_id: user.uid, role: "patient" }, { merge: true });
            }
          } catch (e) {
            console.warn("Could not sync patient role", e);
          }
        }
        setAuthChecking(false);
        return;
      }

      try {
        // 1. Try anonymous login first
        try {
          const anonRes = await signInAnonymously(auth);
          if (anonRes?.user) {
            setAuthChecking(false);
            return;
          }
        } catch (anonErr) {
          // Anonymous auth not enabled in console, proceed to guest accounts
        }

        // 2. Try guest email/password
        const guestEmail = "guest.patient@medicare.local";
        const guestPasswords = ["guestPassword123", "guest123", "patient123", "123456", "password123"];

        let signData: any = null;
        for (const pwd of guestPasswords) {
          try {
            signData = await signInWithEmailAndPassword(auth, guestEmail, pwd);
            if (signData?.user) break;
          } catch (e: any) {
            if (e?.code === "auth/user-not-found") {
              break;
            }
          }
        }

        // 3. If sign in failed, try creating the guest account
        if (!signData) {
          try {
            signData = await createUserWithEmailAndPassword(auth, guestEmail, "guestPassword123");
          } catch (createErr: any) {
            if (createErr?.code === "auth/email-already-in-use") {
              // Try creating a randomized guest user
              const randomGuest = `guest_${Date.now()}@medicare.local`;
              try {
                signData = await createUserWithEmailAndPassword(auth, randomGuest, "guestPassword123");
              } catch (rErr) {
                console.warn("Random guest creation failed:", rErr);
              }
            }
          }
        }

        if (signData?.user) {
          try {
            await setDoc(doc(db, "user_roles", signData.user.uid), { user_id: signData.user.uid, role: "patient" }, { merge: true });
            await setDoc(doc(db, "profiles", signData.user.uid), { full_name: "Guest Patient", email: signData.user.email || guestEmail }, { merge: true });
          } catch (docErr) {
            console.warn("Failed to set guest profile:", docErr);
          }
        }

        await refreshRole();
      } catch (err) {
        console.warn("Auto-login completed with fallback:", err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAndAutoLogin();
  }, [user, loading]);

  const hasInitialCheckedRef = useRef(false);

  useEffect(() => {
    const q = user 
      ? query(collection(db, "case_papers"), where("patient_id", "==", user.uid))
      : query(collection(db, "case_papers"));

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
        if (Array.isArray(localIds) && localIds.length > 0) {
          fetchedCases = fetchedCases.filter((c: any) => localIds.includes(c.id));
        } else if (user && !user.isAnonymous && user.email !== "guest.patient@medicare.local") {
          // If specific patient is formally logged in, show their cases
        } else {
          fetchedCases = [];
        }
      } catch (e) {
        fetchedCases = [];
      }
      setCases(fetchedCases.map(parseCaseNotes));
      
      if (!hasInitialCheckedRef.current) {
        hasInitialCheckedRef.current = true;
        if (fetchedCases.length === 0) {
          setIsDialogOpen(true);
        }
      }
    }, (err) => {
      console.warn("Case papers listener warning:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    
    setBusy(true);
    try {
      let patientUid = user?.uid || auth.currentUser?.uid;
      
      if (!patientUid) {
        try {
          const anon = await signInAnonymously(auth);
          patientUid = anon.user.uid;
        } catch (anonErr) {
          // Fallback guest identifier if Firebase auth is offline/restricted
          let localGuestId = sessionStorage.getItem("healthbridge_guest_uid");
          if (!localGuestId) {
            localGuestId = "guest_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem("healthbridge_guest_uid", localGuestId);
          }
          patientUid = localGuestId;
        }
      }

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

      // Close modal immediately so UI doesn't hang
      hasInitialCheckedRef.current = true;
      setIsDialogOpen(false);
      setBusy(false);
      toast.success("Case paper submitted successfully!");

      const caseData = {
        patient_id: patientUid,
        full_name: form.full_name.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        dob: form.dob,
        age,
        gender: form.gender || "Male",
        marital_status: form.marital_status || "Unmarried",
        education: form.education?.trim() || "",
        occupation: form.occupation?.trim() || "",
        parents_occupation: form.parents_occupation?.trim() || "",
        menstrual_history: form.menstrual_history?.trim() || "",
        past_history: form.past_history?.trim() || "",
        weight: form.weight?.trim() || "",
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
      };

      setForm({ full_name: "", address: "", mobile: "", dob: "", notes: "", marital_status: "", education: "", occupation: "", parents_occupation: "", menstrual_history: "", past_history: "", weight: "", gender: "" });

      await setDoc(newDocRef, caseData);
    } catch (err: any) {
      setBusy(false);
      return toast.error(err.message || "Failed to submit case paper. Please check connection.");
    } finally {
      setBusy(false);
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
    <div className="space-y-6 pb-12 pt-2 md:pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-primary drop-shadow-sm" /> 
          <span className="bg-gradient-to-r from-primary via-teal-500 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
            My Case Papers
          </span>
        </h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md rounded-xl">
              <Plus className="h-4 w-4" /> New Case Paper
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-7 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl">
             <DialogHeader className="border-b dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 grid place-items-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      नवीन केस पेपर (New Case Paper)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Moolatvam Ayurved — Case Paper Registration & Consultation Request
                    </DialogDescription>
                  </div>
                </div>
             </DialogHeader>

             {/* Live Patient Profile Header Banner */}
             <div className="mt-4 bg-gradient-to-r from-teal-500/10 via-indigo-500/5 to-slate-500/10 rounded-2xl p-4 border border-teal-500/20 shadow-xs">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                 <div className="flex items-center gap-3">
                   <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-teal-500/20">
                     {(form.full_name?.trim() ? form.full_name.trim().substring(0, 2) : "??").toUpperCase()}
                   </div>
                   <div>
                     <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-extrabold tracking-wider">
                       Patient Profile
                     </span>
                     <h3 className="font-extrabold text-base text-foreground tracking-tight uppercase leading-none mt-0.5">
                       {form.full_name?.trim() || "नवीन रुग्ण (Patient Name)"}
                     </h3>
                   </div>
                 </div>
                 <div className="flex flex-wrap gap-2 text-xs">
                   <div className="flex items-center gap-1.5 bg-white/70 dark:bg-black/30 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-2xs">
                     <Calendar className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                     <div>
                       <div className="text-[8px] text-muted-foreground uppercase leading-none font-semibold">Age / DOB</div>
                       <div className="font-bold text-foreground text-[11px] mt-0.5">
                         {age} Years {form.dob ? `(${form.dob})` : ""}
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-1.5 bg-white/70 dark:bg-black/30 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-2xs">
                     <Phone className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                     <div>
                       <div className="text-[8px] text-muted-foreground uppercase leading-none font-semibold">Contact</div>
                       <div className="font-bold text-foreground text-[11px] mt-0.5">{form.mobile || "—"}</div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             <form onSubmit={submit} className="space-y-6 mt-4">
                {/* Section 1: Personal Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-1.5">
                    <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      रुग्णाची माहिती (Personal Details)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Full Name (रुग्णाचे नाव) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input 
                          value={form.full_name} 
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                          placeholder="Patient's Full Name" 
                          className="pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10" 
                          required 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, full_name: f.full_name ? f.full_name + " " + val : val }))} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Date of Birth (जन्मतारीख) <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        type="date" 
                        value={form.dob} 
                        onChange={(e) => setForm({ ...form, dob: e.target.value })} 
                        className="mt-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10" 
                        required 
                      />
                      {form.dob && (
                        <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 mt-1">
                          Age: {age} Years
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Gender (लिंग)
                      </Label>
                      <Select value={form.gender} onValueChange={(val) => setForm({ ...form, gender: val })}>
                        <SelectTrigger className="mt-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male (पुरुष)</SelectItem>
                          <SelectItem value="Female">Female (स्त्री)</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Mobile Number (मोबाईल नं.) <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        value={form.mobile} 
                        onChange={(e) => setForm({ ...form, mobile: e.target.value })} 
                        placeholder="10 digit mobile number" 
                        className="mt-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10" 
                        required 
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Marital Status (वैवाहिक स्थिती)
                      </Label>
                      <Select value={form.marital_status} onValueChange={(val) => setForm({ ...form, marital_status: val })}>
                        <SelectTrigger className="mt-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Married">Married (विवाहित)</SelectItem>
                          <SelectItem value="Unmarried">Unmarried (अविवाहित)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Address (पत्ता) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Textarea 
                          rows={2} 
                          value={form.address} 
                          onChange={(e) => setForm({ ...form, address: e.target.value })} 
                          placeholder="Complete address with city/village..." 
                          className="pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 resize-none text-xs" 
                          required 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, address: f.address ? f.address + " " + val : val }))} positionClassName="top-2.5" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Education (शिक्षण)
                      </Label>
                      <div className="relative mt-1">
                        <Input 
                          value={form.education} 
                          onChange={(e) => setForm({ ...form, education: e.target.value })} 
                          placeholder="e.g. B.Sc, 12th..." 
                          className="pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10" 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, education: f.education ? f.education + " " + val : val }))} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Occupation (व्यवसाय)
                      </Label>
                      <div className="relative mt-1">
                        <Input 
                          value={form.occupation} 
                          onChange={(e) => setForm({ ...form, occupation: e.target.value })} 
                          placeholder="e.g. Student, Service..." 
                          className="pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10" 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, occupation: f.occupation ? f.occupation + " " + val : val }))} />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Parent's Occu. (पालकांचा व्यवसाय)
                      </Label>
                      <div className="relative mt-1">
                        <Input 
                          value={form.parents_occupation} 
                          onChange={(e) => setForm({ ...form, parents_occupation: e.target.value })} 
                          placeholder="e.g. Farmer, Business..." 
                          className="pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10" 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, parents_occupation: f.parents_occupation ? f.parents_occupation + " " + val : val }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Symptoms & Medical History */}
                <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-1.5">
                    <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      तक्रारी आणि इतिहास (Symptoms & History)
                    </span>
                  </div>

                  {/* Chief Complaints */}
                  <div className="bg-amber-500/10 dark:bg-amber-500/15 p-4 rounded-2xl border border-amber-500/20 space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-amber-600" /> Chief Complaints (तुमच्या तक्रारी / लक्षणे)
                    </Label>
                    <div className="relative mt-1">
                      <Textarea 
                        rows={3} 
                        value={form.notes} 
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                        placeholder="तुम्हाला काय त्रास होत आहे ते येथे सांगा किंवा बोला..." 
                        className="pr-10 rounded-xl bg-white/90 dark:bg-black/30 border-amber-300 dark:border-amber-900/50 resize-none text-xs" 
                      />
                      <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, notes: f.notes ? f.notes + " " + val : val }))} positionClassName="top-2.5" />
                    </div>
                  </div>

                  {/* Menstrual History (Female or optional) */}
                  {(form.gender === "Female" || form.gender === "Other") && (
                    <div className="bg-pink-500/10 dark:bg-pink-500/15 p-4 rounded-2xl border border-pink-500/20 space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                        पाळीचा इतिहास (Menstrual History)
                      </Label>
                      <div className="relative mt-1">
                        <Input 
                          value={form.menstrual_history} 
                          onChange={(e) => setForm({ ...form, menstrual_history: e.target.value })} 
                          placeholder="पाळी नियमित आहे का, काही त्रास..." 
                          className="pr-10 rounded-xl bg-white/90 dark:bg-black/30 border-pink-300 dark:border-pink-900/50 text-xs" 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, menstrual_history: f.menstrual_history ? f.menstrual_history + " " + val : val }))} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        मागील इतिहास (Past History)
                      </Label>
                      <div className="relative mt-1">
                        <Input 
                          value={form.past_history} 
                          onChange={(e) => setForm({ ...form, past_history: e.target.value })} 
                          placeholder="मागील आजार किंवा शस्त्रक्रिया..." 
                          className="pr-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-xs" 
                        />
                        <VoiceButton onTranscript={(val) => setForm((f) => ({ ...f, past_history: f.past_history ? f.past_history + " " + val : val }))} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        वजन (Weight in kg)
                      </Label>
                      <Input 
                        value={form.weight} 
                        onChange={(e) => setForm({ ...form, weight: e.target.value })} 
                        placeholder="e.g. 60 kg" 
                        className="mt-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-xs" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)} 
                    className="rounded-xl text-xs h-10 px-4 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="rounded-xl text-xs h-10 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold shadow-md" 
                    disabled={busy}
                  >
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Case Paper (केस पेपर पाठवा)
                  </Button>
                </div>
             </form>
          </DialogContent>
        </Dialog>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="grid gap-10">
          {cases.length === 0 && (
            <AnimatedWrapper>
              <Card className="glass border-0 p-12 text-center text-muted-foreground">
                No case papers yet. Click "New Case Paper" to get started.
              </Card>
            </AnimatedWrapper>
          )}
          
          {cases.map((c, i) => (
            <AnimatedWrapper key={c.id} index={i}>
              <CasePaperCard c={c} setBusy={setBusy} />
            </AnimatedWrapper>
          ))}
        </div>
      </AnimatePresence>
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
