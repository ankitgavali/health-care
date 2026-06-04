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

export async function generateCasePaperPDF(c: CaseRow) {
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
  
  const fileName = `Case-Paper-${c.full_name.replace(/\s+/g, "-")}.pdf`;
  const pdfBlob = doc.output("blob");

  // Direct anchor download (no share dialog)
  const blobUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

// Separate share function using Web Share API
export async function shareCasePaperPDF(c: CaseRow) {
  const doc = new jsPDF("p", "mm", "a4");
  // Reuse same build — call generateCasePaperPDF build inline
  // We duplicate the PDF build here so share gets a fresh blob
  const fileName = `Case-Paper-${c.full_name.replace(/\s+/g, "-")}.pdf`;

  // Build same PDF
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(251, 189, 8);
  doc.rect(0, 0, w, 45, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Dr. Kadambari Jagtap", 14, 15);
  doc.setFontSize(10);
  doc.text("MD Ayu. Sch.", 14, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("|| Shree ||", w / 2, 12, { align: "center" });
  doc.setFontSize(14);
  doc.text("Dr. Omprasad Jagtap", w / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text("MD Ayu.", w / 2, 24, { align: "center" });
  doc.setFontSize(9);
  doc.text("Swasthasya Swasthya Rakshanam...", w / 2, 30, { align: "center" });
  doc.setFontSize(12);
  doc.text("MOOLATVAM", w - 14, 18, { align: "right" });
  doc.text("AYURVED", w - 14, 24, { align: "right" });

  let y = 60;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Name :", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(c.full_name.toUpperCase(), 35, y);
  y += 12;
  doc.setFont("helvetica", "bold"); doc.text("Date Of Birth:", 14, y);
  doc.setFont("helvetica", "normal"); doc.text(c.dob ? new Date(c.dob).toLocaleDateString("en-IN") : "-", 45, y);
  doc.setFont("helvetica", "bold"); doc.text("Age & Gender:", 80, y);
  doc.setFont("helvetica", "normal"); doc.text(`${c.age} Y / ${c.gender || "-"}`, 112, y);
  doc.setFont("helvetica", "bold"); doc.text("Date:", 150, y);
  doc.setFont("helvetica", "normal"); doc.text(new Date(c.created_at).toLocaleDateString("en-IN"), 165, y);
  y += 10;
  doc.setFont("helvetica", "bold"); doc.text("Phone No.:", 14, y);
  doc.setFont("helvetica", "normal"); doc.text(c.mobile || "-", 40, y);
  doc.setFont("helvetica", "bold"); doc.text("Education:", 150, y);
  doc.setFont("helvetica", "normal"); doc.text(c.education || "-", 172, y);
  y += 10;
  doc.setFont("helvetica", "bold"); doc.text("Address:", 14, y);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(c.address || "-", 80);
  doc.text(addrLines, 35, y);
  doc.setFont("helvetica", "bold"); doc.text("Occupation:", 150, y);
  doc.setFont("helvetica", "normal"); doc.text(c.occupation || "-", 175, y);
  y += Math.max(10, addrLines.length * 6);
  doc.setFont("helvetica", "bold"); doc.text("Married/Unmarried:", 14, y);
  doc.setFont("helvetica", "normal"); doc.text(c.marital_status || "-", 55, y);
  doc.setFont("helvetica", "bold"); doc.text("Parent's Occu.:", 150, y);
  doc.setFont("helvetica", "normal"); doc.text(c.parents_occupation || "-", 180, y);
  y += 15;
  doc.setFont("helvetica", "bold"); doc.text("History of present illness:", 14, y);
  doc.setFont("helvetica", "normal");
  const histLines = doc.splitTextToSize(c.notes || "-", w - 70);
  doc.text(histLines, 65, y);
  y += Math.max(12, histLines.length * 6 + 4);

  const footerY = h - 50;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("Consent", w / 2, footerY, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  const consentText = "I, hereby consent to the collection of personal information for medical purposes. This includes demographic details, medical history, and contact information. I understand that this information is essential for accurate diagnosis and treatment planning. I authorize healthcare professionals to administer necessary treatments based on this collected information. I also grant permission for the collection of photos for medical records, research, and promotional activities related to healthcare. These images may be used anonymously to enhance medical understanding, contribute to research initiatives, and for promotional materials. I acknowledge that my personal information and images will be handled with utmost confidentiality and in compliance with applicable privacy laws.";
  doc.text(doc.splitTextToSize(consentText, w - 28), 14, footerY + 4);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`Name: ${c.full_name}`, 14, footerY + 28);
  doc.text("Signature: ________________", 14, footerY + 36);
  doc.setFillColor(251, 189, 8);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("9404306548 | 8867303202", w - 14, h - 7, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.text("Address : Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli. 416416", w / 2, h - 4, { align: "center" });

  const pdfBlob = doc.output("blob");

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Case Paper",
          text: "Your case paper from Moolatvam Ayurved.",
        });
        return;
      } catch (e) {
        console.warn("Share API failed:", e);
      }
    }
  }

  // Fallback if share not supported
  alert("Sharing is not supported on this browser. Please use the Download button instead.");
}

export function generateInvoicePDF(c: CaseRow) {
  // Create PDF with A4 dimensions (210mm x 297mm)
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  
  // --- Header (Clinic Letterhead - Yellow Background) ---
  doc.setFillColor(251, 189, 8); // #fbbd08
  doc.rect(0, 0, w, 45, "F");
  doc.setTextColor(0, 0, 0);
  
  // Left Doctor Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Dr. Kadambari Jagtap", 15, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("MD Ayu. Sch.", 15, 21);
  
  // Center Doctor Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("|| Shree ||", w / 2, 12, { align: "center" });
  doc.setFontSize(14);
  doc.text("Dr. Omprasad Jagtap", w / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("MD Ayu.", w / 2, 24, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Swasthasya Swasthya Rakshanam...", w / 2, 30, { align: "center" });
  
  // Right Logo / Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MOOLATVAM", w - 15, 18, { align: "right" });
  doc.text("AYURVED", w - 15, 24, { align: "right" });
  
  // --- Invoice Title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("INVOICE / RECEIPT", 15, 56);
  
  // Title Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(15, 60, w - 15, 60);
  
  // --- Metadata Section (Two-column layout) ---
  // Left Column Headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("BILLED TO", 15, 67);
  
  // Right Column Headers
  doc.text("INVOICE DETAILS", 120, 67);
  
  // Left Column Patient Details
  let leftY = 73;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(c.full_name.toUpperCase(), 15, leftY);
  leftY += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Mobile: ${c.mobile || "—"}`, 15, leftY);
  leftY += 5.5;
  
  const dobStr = c.dob ? new Date(c.dob).toLocaleDateString("en-IN") : "—";
  doc.text(`DOB: ${dobStr}  |  Age: ${c.age || 0} Y  |  Gender: ${c.gender || "—"}`, 15, leftY);
  leftY += 5.5;
  
  const addrLines = doc.splitTextToSize(`Address: ${c.address || "—"}`, w / 2 - 25);
  doc.text(addrLines, 15, leftY);
  leftY += addrLines.length * 4.5 + 2;
  
  // Right Column Invoice Details
  let rightY = 73;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  
  doc.text("Invoice No:", 120, rightY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`#${c.id.slice(0, 8).toUpperCase()}`, 145, rightY);
  rightY += 5.5;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Invoice Date:", 120, rightY);
  doc.text(new Date(c.created_at || Date.now()).toLocaleDateString("en-IN"), 145, rightY);
  rightY += 5.5;
  
  doc.text("Consultant:", 120, rightY);
  const docNameVal = c.assigned_doctor ? doctorName[c.assigned_doctor as "doctor1" | "doctor2"] : "—";
  doc.text(docNameVal, 145, rightY);
  rightY += 6;
  
  // Styled PAID badge
  doc.text("Payment Status:", 120, rightY + 3.5);
  doc.setFillColor(209, 250, 229); // emerald-100
  doc.roundedRect(145, rightY, 18, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text("PAID", 154, rightY + 3.7, { align: "center" });
  
  let currentY = Math.max(leftY, rightY + 12);
  
  // Divider below details
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(15, currentY, w - 15, currentY);
  currentY += 8;
  
  // --- Prescription / Clinical Notes Summary Card ---
  const summaryFields: { label: string; value: string }[] = [];
  if (c.prescription) summaryFields.push({ label: "Rx / Prescription", value: c.prescription });
  if (c.medicines) summaryFields.push({ label: "Medicines", value: c.medicines });
  if (c.tests) summaryFields.push({ label: "Investigations / Tests", value: c.tests });
  if (c.medical_notes) summaryFields.push({ label: "Diagnosis / Notes", value: c.medical_notes });
  
  if (summaryFields.length > 0) {
    let cardHeight = 10; // vertical padding
    cardHeight += 6; // title spacing
    
    const processedFields = summaryFields.map(f => {
      const valLines = doc.splitTextToSize(f.value, w - 65); // Wrap to align next to label
      return { label: f.label, value: f.value, lines: valLines };
    });
    
    processedFields.forEach(f => {
      cardHeight += Math.max(4.5, f.lines.length * 4.5) + 2;
    });
    
    // Draw Card Background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, currentY, w - 30, cardHeight, "F");
    
    // Draw Amber Left Border
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(15, currentY, 1.5, cardHeight, "F");
    
    let cardTextY = currentY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Clinical & Prescription Summary", 20, cardTextY);
    cardTextY += 6;
    
    processedFields.forEach(f => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(`${f.label}:`, 20, cardTextY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(f.lines, 50, cardTextY);
      
      cardTextY += Math.max(4.5, f.lines.length * 4.5) + 2;
    });
    
    currentY += cardHeight + 8;
  }
  
  // --- Billing Breakdown Table ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("BILLING BREAKDOWN", 15, currentY);
  currentY += 6;
  
  // Table Header Background
  doc.setFillColor(51, 65, 85); // slate-700
  doc.rect(15, currentY, w - 30, 8, "F");
  
  // Table Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SR.", 18, currentY + 5.5);
  doc.text("SERVICE / DESCRIPTION", 30, currentY + 5.5);
  doc.text("AMOUNT (INR)", w - 18, currentY + 5.5, { align: "right" });
  currentY += 8;
  
  // Table Row Items
  const rows: [string, number][] = [
    ["Consultation Services", Number(c.consultation_charge ?? 0)],
    ["Pharmacy / Medicines", Number(c.medicine_charge ?? 0)],
    ["Investigations / Tests", Number(c.test_charge ?? 0)],
    ["Other General Charges", Number(c.other_charge ?? 0)],
  ];
  
  rows.forEach(([k, v], idx) => {
    // Alternating Row Backgrounds
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, currentY, w - 30, 8, "F");
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // slate-700
    
    doc.text(String(idx + 1), 18, currentY + 5.5);
    doc.text(k, 30, currentY + 5.5);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Rs. ${v.toFixed(2)}`, w - 18, currentY + 5.5, { align: "right" });
    
    // Row Divider Line
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(15, currentY + 8, w - 15, currentY + 8);
    currentY += 8;
  });
  
  // --- Grand Total Callout Box ---
  const totalBoxWidth = 70;
  const totalBoxHeight = 12;
  const totalBoxX = w - 15 - totalBoxWidth;
  
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(totalBoxX, currentY + 4, totalBoxWidth, totalBoxHeight, "FD");
  
  // Yellow Left Accent Strip on Total Box
  doc.setFillColor(251, 189, 8); // brand yellow
  doc.rect(totalBoxX, currentY + 4, 1.8, totalBoxHeight, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("GRAND TOTAL", totalBoxX + 6, currentY + 11.5);
  
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(`Rs. ${Number(c.total_bill ?? 0).toFixed(2)}`, w - 18, currentY + 12, { align: "right" });
  
  currentY += 25;
  
  // --- Signatures Block ---
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(w - 65, currentY, w - 15, currentY);
  currentY += 4.5;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("Authorized Signatory", w - 15, currentY, { align: "right" });
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Moolatvam Ayurved", w - 15, currentY + 4, { align: "right" });
  
  // --- Footer Block (Fixed Position at Bottom) ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Thank you for choosing Moolatvam Ayurved. Get well soon!", w / 2, h - 18, { align: "center" });
  
  // Yellow Bottom Banner
  doc.setFillColor(251, 189, 8); // brand yellow
  doc.rect(0, h - 12, w, 12, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Contact: +91 9404306548 | +91 8867303202", w - 15, h - 7, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.text("Address: Flat No. 106, Shiv City Center, Miraj Sangli Road, Near Vijaynagar Circle, Sangli - 416416", 15, h - 7);
  
  // Open PDF directly in a new tab
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
}
