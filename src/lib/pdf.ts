import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { HOSPITAL_NAME, doctorName } from "./case-utils";
import type { CaseRow } from "./case-utils";

export async function generatePDFFromElementId(elementId: string, filename: string) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("Element not found for PDF generation");
    }

    // Capture the element using html2canvas
    // Scroll to top to avoid html2canvas clipping bugs
    window.scrollTo(0, 0);
    
    const canvas = await html2canvas(element, {
      scale: window.devicePixelRatio > 1 ? 1.5 : 1, // Balance between quality and memory
      useCORS: true,
      allowTaint: true, // Allow tainted images just in case
      logging: true,
      backgroundColor: "#ffffff",
      ignoreElements: (node) => {
        // SVGs with textPath often crash html2canvas on mobile
        if (node.tagName && node.tagName.toLowerCase() === 'textpath') {
          return true;
        }
        return false;
      }
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    
    // Calculate PDF dimensions (A4 size is 210x297 mm)
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Add image to PDF
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    
    const finalFilename = `${filename.replace(/\s+/g, "-")}.pdf`;
    const pdfBlob = pdf.output("blob");

    // Attempt to use Web Share API (Natively supported on Android/iOS for file sharing/saving)
    if (navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], finalFilename, { type: "application/pdf" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Case Paper",
            text: "Here is your case paper.",
          });
          return; // Success!
        } catch (e) {
          console.warn("Share API failed or cancelled:", e);
          // Fallthrough to standard download
        }
      }
    }

    // Fallback: standard anchor tag download
    const blobUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = blobUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.error("PDF generation failed, falling back to native print:", error);
    // Fallback for mobile devices if canvas crashes
    alert("प्रगत PDF जनरेशनमध्ये तांत्रिक अडचण आली. आम्ही तुम्हाला 'Print / Save as PDF' च्या मूळ ऑप्शनवर घेऊन जात आहोत. तिथे 'Save as PDF' निवडा.");
    window.print();
  }
}

export function generateCasePaperPDF(c: CaseRow) {
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  
  // --- Header (Yellow Background) ---
  doc.setFillColor(251, 189, 8); // #fbbd08
  doc.rect(0, 0, w, 45, "F");
  
  doc.setTextColor(0, 0, 0);
  
  // Left Doctor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Dr. Kadambari Jagtap", 14, 15);
  doc.setFontSize(10);
  doc.text("MD Ayu. Sch.", 14, 21);
  
  // Center Doctor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("|| Shree ||", w / 2, 12, { align: "center" });
  doc.setFontSize(14);
  doc.text("Dr. Omprasad Jagtap", w / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text("MD Ayu.", w / 2, 24, { align: "center" });
  doc.setFontSize(9);
  doc.text("Swasthasya Swasthya Rakshanam...", w / 2, 30, { align: "center" });
  
  // Right Logo (Text representation)
  doc.setFontSize(12);
  doc.text("MOOLATVAM", w - 14, 18, { align: "right" });
  doc.text("AYURVED", w - 14, 24, { align: "right" });
  
  // --- Body ---
  let y = 60;
  doc.setFontSize(11);
  
  // Name
  doc.setFont("helvetica", "bold");
  doc.text("Name :", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.full_name.toUpperCase(), 35, y);
  y += 12;
  
  // Row 1
  doc.setFont("helvetica", "bold");
  doc.text("Date Of Birth:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.dob ? new Date(c.dob).toLocaleDateString("en-IN") : "-", 45, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Age & Gender:", 80, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${c.age} Y / ${c.gender || "-"}`, 112, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 150, y);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(c.created_at).toLocaleDateString("en-IN"), 165, y);
  y += 10;
  
  // Row 2
  doc.setFont("helvetica", "bold");
  doc.text("Phone No.:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.mobile || "-", 40, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Education:", 150, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.education || "-", 172, y);
  y += 10;
  
  // Row 3
  doc.setFont("helvetica", "bold");
  doc.text("Address:", 14, y);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(c.address || "-", 80);
  doc.text(addrLines, 35, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Occupation:", 150, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.occupation || "-", 175, y);
  y += Math.max(10, addrLines.length * 6);
  
  // Row 4
  doc.setFont("helvetica", "bold");
  doc.text("Married/Unmarried:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.marital_status || "-", 55, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Parent's Occu.:", 150, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.parents_occupation || "-", 180, y);
  y += 15;
  
  // History
  doc.setFont("helvetica", "bold");
  doc.text("History of present illness:", 14, y);
  doc.setFont("helvetica", "normal");
  const historyLines = doc.splitTextToSize(c.notes || "-", w - 70);
  doc.text(historyLines, 65, y);
  y += Math.max(12, historyLines.length * 6 + 4);
  
  // Vitals
  let vitalX = 14;
  if (c.gender === "Female") {
    doc.setFont("helvetica", "bold");
    doc.text("Menstrual History:", vitalX, y);
    doc.setFont("helvetica", "normal");
    doc.text(c.menstrual_history || "-", vitalX + 38, y);
    vitalX += 70;
  }
  
  doc.setFont("helvetica", "bold");
  doc.text("Past History:", vitalX, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.past_history || "-", vitalX + 28, y);
  vitalX += 60;
  
  doc.setFont("helvetica", "bold");
  doc.text("Weight:", vitalX, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.weight || "-", vitalX + 18, y);
  y += 15;
  
  // Observations
  if (c.prescription || c.medical_notes) {
    doc.setDrawColor(200);
    doc.line(14, y, w - 14, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9); // #b45309
    doc.text("Doctor's Observations & Prescription", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    
    if (c.medical_notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Diagnosis:", 14, y);
      doc.setFont("helvetica", "normal");
      const diagLines = doc.splitTextToSize(c.medical_notes, w - 28);
      y += 6;
      doc.text(diagLines, 14, y);
      y += diagLines.length * 6 + 4;
    }
    
    if (c.prescription) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(180, 83, 9);
      doc.text("Rx", 14, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      y += 6;
      const rxLines = doc.splitTextToSize(c.prescription, w - 28);
      doc.text(rxLines, 14, y);
      y += rxLines.length * 6 + 4;
    }
  }
  
  // --- Footer ---
  const footerY = h - 50;
  
  // Consent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Consent", w / 2, footerY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const consentText = "I, hereby consent to the collection of personal information for medical purposes. This includes demographic details, medical history, and contact information. I understand that this information is essential for accurate diagnosis and treatment planning. I authorize healthcare professionals to administer necessary treatments based on this collected information. I also grant permission for the collection of photos for medical records, research, and promotional activities related to healthcare. These images may be used anonymously to enhance medical understanding, contribute to research initiatives, and for promotional materials. I acknowledge that my personal information and images will be handled with utmost confidentiality and in compliance with applicable privacy laws.";
  const consentLines = doc.splitTextToSize(consentText, w - 28);
  doc.text(consentLines, 14, footerY + 4);
  
  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Name: ${c.full_name}`, 14, footerY + 28);
  doc.text("Signature: ________________", 14, footerY + 36);
  
  if (c.assigned_doctor && c.status !== "submitted") {
    doc.setFont("helvetica", "italic");
    doc.text(doctorName[c.assigned_doctor as "doctor1" | "doctor2"], w - 14, footerY + 28, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text("Consulting Signature", w - 14, footerY + 34, { align: "right" });
    doc.line(w - 50, footerY + 30, w - 14, footerY + 30);
  }
  
  // Footer Yellow Bar
  doc.setFillColor(251, 189, 8);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("9404306548 | 8867303202", w - 14, h - 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Address : Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli. 416416", w / 2, h - 4, { align: "center" });
  
  // Open PDF directly in a new tab
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
}

export function generateInvoicePDF(c: CaseRow) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  // Header
  doc.setFillColor(30, 110, 165);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(HOSPITAL_NAME, 14, 14);
  doc.setFontSize(10);
  doc.text("Patient Invoice & Case Summary", 14, 22);
  doc.setTextColor(40, 40, 40);

  let y = 40;
  doc.setFontSize(12);
  doc.text(`Invoice #: ${c.id.slice(0, 8).toUpperCase()}`, 14, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, w - 60, y);
  y += 10;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Patient Details", 14, y);
  doc.setFont("helvetica", "normal");
  y += 7;
  doc.setFontSize(11);
  doc.text(`Name: ${c.full_name}`, 14, y); y += 6;
  doc.text(`Mobile: ${c.mobile}`, 14, y); y += 6;
  doc.text(`DOB: ${c.dob}    Age: ${c.age}`, 14, y); y += 6;
  const addrLines = doc.splitTextToSize(`Address: ${c.address}`, w - 28);
  doc.text(addrLines, 14, y); y += addrLines.length * 6 + 2;

  doc.setFont("helvetica", "bold");
  doc.text("Consulting Doctor", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(c.assigned_doctor ? doctorName[c.assigned_doctor as "doctor1"|"doctor2"] : "—", 14, y);
  y += 10;

  if (c.prescription || c.medicines || c.tests || c.medical_notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Prescription Summary", 14, y); y += 7;
    doc.setFont("helvetica", "normal");
    const fields: [string, string | null][] = [
      ["Prescription", c.prescription],
      ["Medicines", c.medicines],
      ["Tests", c.tests],
      ["Medical Notes", c.medical_notes],
    ];
    for (const [k, v] of fields) {
      if (!v) continue;
      const lines = doc.splitTextToSize(`${k}: ${v}`, w - 28);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 1;
    }
    y += 4;
  }

  doc.setDrawColor(200); doc.line(14, y, w - 14, y); y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Bill Breakdown", 14, y); y += 8;
  doc.setFont("helvetica", "normal");
  const rows: [string, number][] = [
    ["Consultation", Number(c.consultation_charge ?? 0)],
    ["Medicines", Number(c.medicine_charge ?? 0)],
    ["Tests", Number(c.test_charge ?? 0)],
    ["Other Charges", Number(c.other_charge ?? 0)],
  ];
  for (const [k, v] of rows) {
    doc.text(k, 18, y);
    doc.text(`Rs. ${v.toFixed(2)}`, w - 18, y, { align: "right" });
    y += 7;
  }
  doc.setDrawColor(120); doc.line(14, y, w - 14, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("Total Amount", 18, y);
  doc.text(`Rs. ${Number(c.total_bill ?? 0).toFixed(2)}`, w - 18, y, { align: "right" });

  y += 18;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Thank you for choosing " + HOSPITAL_NAME + ". Get well soon!", 14, y);

  // Open PDF directly in a new tab
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
}
