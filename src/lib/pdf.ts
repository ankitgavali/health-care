import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { HOSPITAL_NAME, doctorName } from "./case-utils";
import type { CaseRow } from "./case-utils";

export async function generatePDFFromElementId(elementId: string, filename: string, action: 'download' | 'share' = 'download') {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("Element not found for PDF generation");
    }

    // Capture the element using html2canvas
    // Scroll to top to avoid html2canvas clipping bugs
    window.scrollTo(0, 0);
    
    const imgData = await toPng(element, {
      pixelRatio: window.devicePixelRatio > 1 ? 1.5 : 1,
      backgroundColor: "#ffffff",
    });

    const rect = element.getBoundingClientRect();
    
    // Calculate PDF dimensions (A4 size is 210x297 mm)
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (rect.height * pdfWidth) / rect.width;
    
    // Add image to PDF
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    
    const finalFilename = `${filename.replace(/\s+/g, "-")}.pdf`;
    const pdfBlob = pdf.output("blob");

    if (action === 'share') {
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
      } else {
        alert("Sharing is not supported on this browser. Downloading instead.");
      }
    }

    // Fallback or standard action: standard anchor tag download
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
    alert("प्रगत PDF जनरेशनमध्ये तांत्रिक अडचण आली: " + (error instanceof Error ? error.message : String(error)) + " आम्ही तुम्हाला 'Print / Save as PDF' च्या मूळ ऑप्शनवर घेऊन जात आहोत.");
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
    const dName = c.assigned_doctor_name || doctorName[c.assigned_doctor as "doctor1" | "doctor2"] || "Doctor";
    doc.text(dName, w - 14, footerY + 28, { align: "right" });
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
  
  // --- Background (Clean White - No Letterhead Color Strip) ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");
  
  // --- Top-Left: Circular Logo Emblem ---
  const logoX = 27;
  const logoY = 27;
  
  // Outer green rings
  doc.setDrawColor(76, 122, 52); // Forest Green (#4C7A34)
  doc.setLineWidth(0.6);
  doc.circle(logoX, logoY, 12, "D");
  doc.setLineWidth(0.2);
  doc.circle(logoX, logoY, 11.4, "D");
  
  // Inner solid green circle
  doc.setFillColor(76, 122, 52);
  doc.circle(logoX, logoY, 8.5, "F");
  
  // White capsule outline (Shivalinga)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(logoX - 1.8, logoY - 3.5, 3.6, 6.8, 1.8, 1.8, "D");
  
  // Three horizontal lines inside capsule
  doc.line(logoX - 1.2, logoY - 1, logoX + 1.2, logoY - 1);
  doc.line(logoX - 1.2, logoY, logoX + 1.2, logoY);
  doc.line(logoX - 1.2, logoY + 1, logoX + 1.2, logoY + 1);
  
  // Three yellow leaves overlapping bottom left of capsule
  doc.setFillColor(241, 196, 15); // Yellow
  doc.setDrawColor(76, 122, 52);
  doc.setLineWidth(0.15);
  doc.circle(logoX - 2.5, logoY + 1.2, 1.2, "FD");
  doc.circle(logoX - 1.0, logoY + 2.4, 1.2, "FD");
  doc.circle(logoX - 2.5, logoY + 3.2, 1.2, "FD");
  
  // Curved Text: "MOOLATVAM AYURVED" in top arc
  const text = "MOOLATVAM AYURVED";
  const R = 9.8;
  const startAngle = 200; // degrees
  const endAngle = 340;   // degrees
  const totalChars = text.length;
  const step = (endAngle - startAngle) / (totalChars - 1);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(76, 122, 52);
  
  for (let i = 0; i < totalChars; i++) {
    const char = text[i];
    const angleDeg = startAngle + i * step;
    const angleRad = angleDeg * Math.PI / 180;
    const charX = logoX + R * Math.cos(angleRad);
    const charY = logoY + R * Math.sin(angleRad);
    const rotation = angleDeg - 270;
    doc.text(char, charX, charY, { align: "center", angle: rotation });
  }
  
  // Curved Text: "SWASTHASYA RAKSHANARTHAM" in bottom arc
  const bottomText = "SWASTHASYA RAKSHANARTHAM";
  const startAngleBottom = 25; // degrees
  const endAngleBottom = 155;   // degrees
  const totalCharsBottom = bottomText.length;
  const stepBottom = (endAngleBottom - startAngleBottom) / (totalCharsBottom - 1);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.2);
  doc.setTextColor(100, 116, 139);
  
  for (let i = 0; i < totalCharsBottom; i++) {
    const char = bottomText[i];
    const angleDeg = startAngleBottom + i * stepBottom;
    const angleRad = angleDeg * Math.PI / 180;
    const charX = logoX + R * Math.cos(angleRad);
    const charY = logoY + R * Math.sin(angleRad);
    const rotation = angleDeg - 90;
    doc.text(char, charX, charY, { align: "center", angle: rotation });
  }
  
  // --- Top-Right: Invoice Title & Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(76, 122, 52); // Forest Green
  doc.text("INVOICE", w - 15, 24, { align: "right" });
  
  // Date & Invoice Number Box Table
  doc.setDrawColor(76, 122, 52);
  doc.setLineWidth(0.3);
  doc.rect(w - 65, 30, 50, 12, "D");
  doc.line(w - 65, 36, w - 15, 36);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date : ${new Date(c.created_at || Date.now()).toLocaleDateString("en-IN")}`, w - 62, 34.2);
  doc.text(`Invoice No : ${c.id.slice(0, 8).toUpperCase()}`, w - 62, 40.2);
  
  // --- BILL TO / FROM Section ---
  const sectionY = 53;
  // Billed To Header Bar
  doc.setFillColor(76, 122, 52);
  doc.rect(15, sectionY, 60, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("BILL TO", 18, sectionY + 4);
  
  // From Header Bar
  doc.setFillColor(76, 122, 52);
  doc.rect(w - 75, sectionY, 60, 5.5, "F");
  doc.text("FROM", w - 72, sectionY + 4);
  
  // Patient details (Left column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(c.full_name.toUpperCase(), 15, sectionY + 11);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700
  const patientAddrLines = doc.splitTextToSize(c.address || "—", 55);
  doc.text(patientAddrLines, 15, sectionY + 15.5);
  
  const phoneY = sectionY + 15.5 + patientAddrLines.length * 4.2 + 1;
  doc.text(c.mobile || "—", 15, phoneY);
  
  // Clinic Details (Right column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("MOOLATVAM AYURVED HOSPITAL", w - 75, sectionY + 11);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("SHIV CITY CENTER,", w - 75, sectionY + 15.5);
  doc.text("VIJAYNAGAR CIRCLE, SANGLI.", w - 75, sectionY + 20);
  doc.text("PH. 9834623909", w - 75, sectionY + 24.5);
  
  // --- Table Data Setup ---
  const activeRows: { name: string; amount: number }[] = [];
  if (Number(c.consultation_charge ?? 0) > 0) {
    activeRows.push({ name: "Consultation Services", amount: Number(c.consultation_charge) });
  }
  if (Number(c.medicine_charge ?? 0) > 0) {
    activeRows.push({ name: "Pharmacy / Medicines", amount: Number(c.medicine_charge) });
  }
  if (Number(c.test_charge ?? 0) > 0) {
    activeRows.push({ name: "Investigations / Tests", amount: Number(c.test_charge) });
  }
  if (Number(c.other_charge ?? 0) > 0) {
    activeRows.push({ name: "Other General Charges", amount: Number(c.other_charge) });
  }
  
  // Fallback row if no charges entered
  if (activeRows.length === 0) {
    activeRows.push({ name: "Consultation Services", amount: 0 });
  }
  
  const total = activeRows.reduce((sum, r) => sum + r.amount, 0);
  
  // --- Watermark (Drawn in background before table text) ---
  const watermarkX = w / 2;
  const watermarkY = 135;
  doc.setDrawColor(240, 246, 238); // extremely light green
  doc.setLineWidth(1.5);
  doc.circle(watermarkX, watermarkY, 32, "D");
  doc.circle(watermarkX, watermarkY, 28, "D");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(240, 246, 238);
  doc.text("MOOLATVAM AYURVED", watermarkX, watermarkY + 2.5, { align: "center", angle: 25 });
  
  // --- Billing Invoice Table (x = 15, y = 88) ---
  const tableY = 88;
  const colSLWidth = 15;
  const colDescWidth = 110;
  const colQtyWidth = 20;
  const colAmtWidth = 35;
  const tableWidth = colSLWidth + colDescWidth + colQtyWidth + colAmtWidth; // 180mm
  
  // Table Header Background (Sage Green #B9C7B6)
  doc.setFillColor(185, 199, 182);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(15, tableY, tableWidth, 7.5, "FD");
  
  // Table Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text("SL", 15 + colSLWidth / 2, tableY + 5.2, { align: "center" });
  doc.text("Description", 15 + colSLWidth + 3, tableY + 5.2);
  doc.text("Qty.", 15 + colSLWidth + colDescWidth + colQtyWidth / 2, tableY + 5.2, { align: "center" });
  doc.text("Amount", 15 + tableWidth - 3, tableY + 5.2, { align: "right" });
  
  // Table Rows Loop
  let currentY = tableY + 7.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  activeRows.forEach((row, idx) => {
    // Draw row separator line
    doc.line(15, currentY + 8, 15 + tableWidth, currentY + 8);
    
    // SL
    doc.text(String(idx + 1) + ".", 15 + colSLWidth / 2, currentY + 5.5, { align: "center" });
    
    // Description
    doc.text(row.name, 15 + colSLWidth + 3, currentY + 5.5);
    
    // Qty
    doc.text("1", 15 + colSLWidth + colDescWidth + colQtyWidth / 2, currentY + 5.5, { align: "center" });
    
    // Amount
    doc.text(`${row.amount.toFixed(2)} Rs.`, 15 + tableWidth - 3, currentY + 5.5, { align: "right" });
    
    currentY += 8;
  });
  
  // Draw vertical borders down the table height
  const tableBottomY = currentY;
  doc.line(15, tableY, 15, tableBottomY); // Left border
  doc.line(15 + colSLWidth, tableY, 15 + colSLWidth, tableBottomY); // SL border
  doc.line(15 + colSLWidth + colDescWidth, tableY, 15 + colSLWidth + colDescWidth, tableBottomY); // Description border
  doc.line(15 + colSLWidth + colDescWidth + colQtyWidth, tableY, 15 + colSLWidth + colDescWidth + colQtyWidth, tableBottomY); // Qty border
  doc.line(15 + tableWidth, tableY, 15 + tableWidth, tableBottomY); // Right border
  
  // --- Total Row ---
  doc.setFillColor(185, 199, 182); // Sage green background
  doc.rect(15, tableBottomY, tableWidth, 7.5, "FD");
  
  // Vertical column borders for Total Row
  doc.line(15 + colSLWidth, tableBottomY, 15 + colSLWidth, tableBottomY + 7.5);
  doc.line(15 + colSLWidth + colDescWidth, tableBottomY, 15 + colSLWidth + colDescWidth, tableBottomY + 7.5);
  doc.line(15 + colSLWidth + colDescWidth + colQtyWidth, tableBottomY, 15 + colSLWidth + colDescWidth + colQtyWidth, tableBottomY + 7.5);
  
  // Total Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Total", 18, tableBottomY + 5.2);
  
  // Grand Total amount text
  doc.text(`${total.toFixed(2)} Rs.`, 15 + tableWidth - 3, tableBottomY + 5.2, { align: "right" });
  
  // --- Authorized Signatory Signblock ---
  let footerY = tableBottomY + 30;
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(w - 65, footerY, w - 15, footerY);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Authorized Signatory", w - 15, footerY + 4.5, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Moolatvam Ayurved", w - 15, footerY + 8.5, { align: "right" });
  
  // --- Footer message ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for choosing Moolatvam Ayurved. Get well soon!", w / 2, h - 18, { align: "center" });
  
  // Open PDF in new tab
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
}
