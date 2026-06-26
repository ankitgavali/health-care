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

function getLogoDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="300" height="300">
      <circle cx="50" cy="50" r="48" fill="none" stroke="#4C7A34" stroke-width="1.2" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#4C7A34" stroke-width="0.4" />
      <circle cx="50" cy="50" r="35" fill="#4C7A34" />
      <path id="curve-top" d="M 12 50 A 38 38 0 1 1 88 50" fill="none" />
      <text fill="#4C7A34" font-family="sans-serif" font-weight="bold" font-size="9.5px" letter-spacing="0.8">
        <textPath href="#curve-top" xlink:href="#curve-top" startOffset="50%" text-anchor="middle">MOOLATVAM AYURVED</textPath>
      </text>
      <path id="curve-bottom" d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />
      <text fill="#4C7A34" font-family="sans-serif" font-weight="bold" font-size="3.5px" letter-spacing="0.2px">
        <textPath href="#curve-bottom" xlink:href="#curve-bottom" startOffset="50%" text-anchor="middle">स्वस्थस्य स्वास्थ्यरक्षणं...व्याधिमोक्षणार्थं च</textPath>
      </text>
      <path d="M 50 63 L 50 39 A 10 10 0 0 1 70 39 L 70 63 Z" fill="none" stroke="white" stroke-width="2.5" />
      <path d="M 50 44 L 70 44" stroke="white" stroke-width="2.5" />
      <path d="M 50 49 L 70 49" stroke="white" stroke-width="2.5" />
      <path d="M 50 54 L 70 54" stroke="white" stroke-width="2.5" />
      <path d="M 42 69 C 38 69 36 65 36 65" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M 42 67 C 26 67 26 47 30 43 C 38 47 42 59 42 67 Z" fill="#fbbd08" />
      <path d="M 42 67 C 34 63 30 43 30 43" stroke="#4C7A34" stroke-width="1.2" fill="none" stroke-linecap="round" />
      <path d="M 42 67 C 30 51 42 35 46 35 C 50 47 46 63 42 67 Z" fill="#fbbd08" />
      <path d="M 42 67 C 40 55 46 35 46 35" stroke="#4C7A34" stroke-width="1.2" fill="none" stroke-linecap="round" />
      <path d="M 42 67 C 58 71 70 59 70 51 C 62 47 50 59 42 67 Z" fill="#fbbd08" />
      <path d="M 42 67 C 54 65 70 51 70 51" stroke="#4C7A34" stroke-width="1.2" fill="none" stroke-linecap="round" />
    </svg>`;

    const img = new Image();
    try {
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      img.src = 'data:image/svg+xml;base64,' + base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 300, 300);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = (e) => {
        console.error("Logo SVG load error:", e);
        resolve('');
      };
    } catch (err) {
      console.error("Logo SVG base64 encode error:", err);
      resolve('');
    }
  });
}

function getWatermarkDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="600" height="600" opacity="0.08">
      <circle cx="50" cy="50" r="48" fill="none" stroke="#4C7A34" stroke-width="1.2" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#4C7A34" stroke-width="0.4" />
      <circle cx="50" cy="50" r="35" fill="#4C7A34" />
      <path id="wm-curve-top" d="M 12 50 A 38 38 0 1 1 88 50" fill="none" />
      <text fill="#4C7A34" font-family="sans-serif" font-weight="bold" font-size="9.5px" letter-spacing="0.8">
        <textPath href="#wm-curve-top" xlink:href="#wm-curve-top" startOffset="50%" text-anchor="middle">MOOLATVAM AYURVED</textPath>
      </text>
      <path id="wm-curve-bottom" d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />
      <text fill="#4C7A34" font-family="sans-serif" font-weight="bold" font-size="3.5px" letter-spacing="0.2px">
        <textPath href="#wm-curve-bottom" xlink:href="#wm-curve-bottom" startOffset="50%" text-anchor="middle">स्वस्थस्य स्वास्थ्यरक्षणं...व्याधिमोक्षणार्थं च</textPath>
      </text>
      <path d="M 50 63 L 50 39 A 10 10 0 0 1 70 39 L 70 63 Z" fill="none" stroke="white" stroke-width="2.5" />
      <path d="M 50 44 L 70 44" stroke="white" stroke-width="2.5" />
      <path d="M 50 49 L 70 49" stroke="white" stroke-width="2.5" />
      <path d="M 50 54 L 70 54" stroke="white" stroke-width="2.5" />
      <path d="M 42 69 C 38 69 36 65 36 65" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M 42 67 C 26 67 26 47 30 43 C 38 47 42 59 42 67 Z" fill="#fbbd08" />
      <path d="M 42 67 C 34 63 30 43 30 43" stroke="#4C7A34" stroke-width="1.2" fill="none" stroke-linecap="round" />
      <path d="M 42 67 C 30 51 42 35 46 35 C 50 47 46 63 42 67 Z" fill="#fbbd08" />
      <path d="M 42 67 C 40 55 46 35 46 35" stroke="#4C7A34" stroke-width="1.2" fill="none" stroke-linecap="round" />
      <path d="M 42 67 C 58 71 70 59 70 51 C 62 47 50 59 42 67 Z" fill="#fbbd08" />
      <path d="M 42 67 C 54 65 70 51 70 51" stroke="#4C7A34" stroke-width="1.2" fill="none" stroke-linecap="round" />
    </svg>`;

    const img = new Image();
    try {
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      img.src = 'data:image/svg+xml;base64,' + base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 600, 600);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = (e) => {
        console.error("Watermark SVG load error:", e);
        resolve('');
      };
    } catch (err) {
      console.error("Watermark SVG base64 encode error:", err);
      resolve('');
    }
  });
}

function parseMedicineLine(line: string, index: number, totalMedicineCharge: number, totalLinesCount: number) {
  // Remove leading numbers like "1.", "1)", etc.
  let cleaned = line.replace(/^\s*\d+[\s\.)\-:]+\s*/, "").trim();
  if (!cleaned) return null;

  let qty = 1;
  let amount: number | null = null;

  // Try to find quantity in parenthesis like (60)
  const parenthesizedQty = cleaned.match(/\((\d+)\s*(?:qty|pcs|tab|tabs)?\)/i);
  if (parenthesizedQty) {
    qty = parseInt(parenthesizedQty[1], 10);
    cleaned = cleaned.replace(parenthesizedQty[0], "").trim();
  } else {
    // Try to find quantity with prefixes like qty: 60, qty 60, x 60, x60
    const wordQty = cleaned.match(/(?:qty|quantity|x)[\s\.:\-=]*(\d+)/i);
    if (wordQty) {
      qty = parseInt(wordQty[1], 10);
      cleaned = cleaned.replace(wordQty[0], "").trim();
    }
  }

  // Try to find amount: e.g., "450Rs", "450 Rs", "450₹", "450 ₹", "Rs. 450", "Rs 450"
  const rupeeMatch = cleaned.match(/(?:rs\.?|₹|inr|price|amt|amount|cost)[\s\.:\-=]*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs\.?|₹|inr|rupees|rs)/i);
  if (rupeeMatch) {
    amount = parseFloat(rupeeMatch[1] || rupeeMatch[2]);
    cleaned = cleaned.replace(rupeeMatch[0], "").trim();
  }

  // If amount is still not found, check the end of the line
  if (amount === null) {
    const endNumberMatch = /[\s\-,:\/|]+(\d+(?:\.\d+)?)\s*$/;
    const match = cleaned.match(endNumberMatch);
    if (match) {
      amount = parseFloat(match[1]);
      cleaned = cleaned.replace(endNumberMatch, "").trim();

      // If quantity was not found, check if there is a number before amount
      const preNumberMatch = /[\s\-,:\/|]+(\d+)\s*$/;
      const qMatch = cleaned.match(preNumberMatch);
      if (qMatch) {
        qty = parseInt(qMatch[1], 10);
        cleaned = cleaned.replace(preNumberMatch, "").trim();
      }
    }
  }

  cleaned = cleaned.replace(/[\s\-,:|]+$/, "").replace(/^[\s\-,:|]+/, "").trim();

  if (amount === null) {
    amount = totalMedicineCharge > 0 ? totalMedicineCharge / totalLinesCount : 0;
  }

  return {
    name: cleaned || `Medicine ${index + 1}`,
    qty,
    amount
  };
}

export async function generateInvoicePDF(c: CaseRow) {
  // Create PDF with A4 dimensions (210mm x 297mm)
  const doc = new jsPDF("p", "mm", "a4");
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  
  // --- Background (Clean White) ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");
  
  // --- Load Logo and Watermark as PNG Data URLs ---
  const logoDataUrl = await getLogoDataUrl();
  const watermarkDataUrl = await getWatermarkDataUrl();
  
  // Draw primary logo
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 15, 12, 30, 30);
  }
  
  // --- Top-Right: Invoice Title & Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(76, 122, 52); // Forest Green
  doc.text("INVOICE", w - 15, 25, { align: "right" });
  
  // Date & Invoice Number Box Table
  doc.setDrawColor(0, 0, 0); // Black thin border
  doc.setLineWidth(0.3);
  const boxX = w - 61;
  const boxY = 30;
  const boxW = 46;
  const boxH = 15;
  doc.rect(boxX, boxY, boxW, boxH, "D");
  doc.line(boxX, boxY + 7.5, boxX + boxW, boxY + 7.5);
  
  // Get invoice number from case ID
  let numericPart = c.id.replace(/\D/g, "");
  if (!numericPart) {
    let hash = 0;
    for (let i = 0; i < c.id.length; i++) {
      hash = c.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    numericPart = Math.abs(hash).toString();
  }
  const invoiceNo = numericPart.slice(-4) || "2237";
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date : ${new Date(c.created_at || Date.now()).toLocaleDateString("en-GB")}`, boxX + 4, boxY + 5.2);
  doc.text(`Invoice No : ${invoiceNo}`, boxX + 4, boxY + 12.7);
  
  // --- BILL TO / FROM Section ---
  const sectionY = 52;
  const bannerW = 70;
  const bannerH = 6;
  
  // Billed To Header Bar
  doc.setFillColor(196, 214, 189); // Sage green #C4D6BD
  doc.rect(15, sectionY, bannerW, bannerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("BILL TO", 18, sectionY + 4.5);
  
  // From Header Bar
  doc.setFillColor(196, 214, 189); // Sage green #C4D6BD
  doc.rect(w - 85, sectionY, bannerW, bannerH, "F");
  doc.text("FROM", w - 82, sectionY + 4.5);
  
  // Patient details (Left column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text(c.full_name.toUpperCase(), 15, sectionY + 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const patientAddrLines = doc.splitTextToSize((c.address || "").toUpperCase(), bannerW);
  doc.text(patientAddrLines, 15, sectionY + 17);
  
  const phoneY = sectionY + 17 + patientAddrLines.length * 4.5;
  doc.text(c.mobile || "", 15, phoneY);
  
  // Clinic Details (Right column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("MOOLATVAM AYURVED HOSPITAL", w - 85, sectionY + 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("SHIV CITY CENTER,", w - 85, sectionY + 17);
  doc.text("VIJAYNAGAR CIRCLE, SANGLI.", w - 85, sectionY + 21.5);
  doc.text("PH. 9834623909", w - 85, sectionY + 26);
  
  // --- Table Data Setup ---
  const activeRows: { name: string; qty: number; amount: number }[] = [];
  
  // 1. Consultation Services
  if (Number(c.consultation_charge ?? 0) > 0) {
    activeRows.push({ name: "Consultation Services", qty: 1, amount: Number(c.consultation_charge) });
  }
  
  // 2. Medicines
  let medicinesParsed = false;
  if (c.medicines && c.medicines.trim()) {
    const lines = c.medicines.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const parsedItems: { name: string; qty: number; amount: number }[] = [];
    
    lines.forEach((line, idx) => {
      const parsed = parseMedicineLine(line, idx, Number(c.medicine_charge ?? 0), lines.length);
      if (parsed) {
        parsedItems.push(parsed);
      }
    });
    
    if (parsedItems.length > 0) {
      activeRows.push(...parsedItems);
      medicinesParsed = true;
    }
  }
  
  if (!medicinesParsed && Number(c.medicine_charge ?? 0) > 0) {
    activeRows.push({ name: "Pharmacy / Medicines", qty: 1, amount: Number(c.medicine_charge) });
  }
  
  // 3. Tests
  if (Number(c.test_charge ?? 0) > 0) {
    activeRows.push({ name: "Investigations / Tests", qty: 1, amount: Number(c.test_charge) });
  }
  
  // 4. Other Charges
  if (Number(c.other_charge ?? 0) > 0) {
    activeRows.push({ name: "Other General Charges", qty: 1, amount: Number(c.other_charge) });
  }
  
  // Fallback row if no charges entered
  if (activeRows.length === 0) {
    activeRows.push({ name: "Consultation Services", qty: 1, amount: 0 });
  }
  
  const total = activeRows.reduce((sum, r) => sum + r.amount, 0);
  
  // --- Billing Invoice Table (x = 15, y = 90) ---
  const tableY = 90;
  const colSLWidth = 20;
  const colDescWidth = 100;
  const colQtyWidth = 20;
  const colAmtWidth = 40;
  const tableWidth = colSLWidth + colDescWidth + colQtyWidth + colAmtWidth; // 180mm
  
  // Center watermark on the table
  const tableHeight = 8 + activeRows.length * 8;
  const tableCenterY = tableY + tableHeight / 2;
  const watermarkSize = 110;
  const watermarkX = 105 - watermarkSize / 2;
  const watermarkY = tableCenterY - watermarkSize / 2;
  
  if (watermarkDataUrl) {
    doc.addImage(watermarkDataUrl, "PNG", watermarkX, watermarkY, watermarkSize, watermarkSize);
  }
  
  // Table Header Background (Sage Green #C4D6BD)
  doc.setFillColor(196, 214, 189);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(15, tableY, tableWidth, 8, "FD");
  
  // Table Header Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text("SL", 15 + colSLWidth / 2, tableY + 5.5, { align: "center" });
  doc.text("Description", 15 + colSLWidth + 3, tableY + 5.5);
  doc.text("Qty.", 15 + colSLWidth + colDescWidth + colQtyWidth / 2, tableY + 5.5, { align: "center" });
  doc.text("Amount", 15 + colSLWidth + colDescWidth + colQtyWidth + colAmtWidth / 2, tableY + 5.5, { align: "center" });
  
  // Table Rows Loop
  let currentY = tableY + 8;
  
  activeRows.forEach((row, idx) => {
    // Draw row separator line
    doc.line(15, currentY + 8, 15 + tableWidth, currentY + 8);
    
    // SL
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(String(idx + 1) + ".", 15 + colSLWidth / 2, currentY + 5.5, { align: "center" });
    
    // Description
    const isTab = row.name.toLowerCase().startsWith("tab") || row.name.toLowerCase().startsWith("cap");
    doc.setFont("helvetica", isTab ? "normal" : "italic");
    doc.text(row.name, 15 + colSLWidth + 3, currentY + 5.5);
    
    // Qty
    doc.setFont("helvetica", "normal");
    doc.text(String(row.qty), 15 + colSLWidth + colDescWidth + colQtyWidth / 2, currentY + 5.5, { align: "center" });
    
    // Amount
    doc.text(`${Math.round(row.amount)}₹`, 15 + colSLWidth + colDescWidth + colQtyWidth + colAmtWidth / 2, currentY + 5.5, { align: "center" });
    
    currentY += 8;
  });
  
  // Draw vertical borders down the table height
  const tableBottomY = currentY;
  doc.line(15, tableY, 15, tableBottomY); // Left outer border
  doc.line(15 + colSLWidth, tableY, 15 + colSLWidth, tableBottomY); // SL vertical border
  doc.line(15 + colSLWidth + colDescWidth, tableY, 15 + colSLWidth + colDescWidth, tableBottomY); // Description vertical border
  doc.line(15 + colSLWidth + colDescWidth + colQtyWidth, tableY, 15 + colSLWidth + colDescWidth + colQtyWidth, tableBottomY); // Qty vertical border
  doc.line(15 + tableWidth, tableY, 15 + tableWidth, tableBottomY); // Right outer border
  
  // --- Total Row ---
  doc.setFillColor(196, 214, 189); // Sage green background #C4D6BD
  doc.rect(15, tableBottomY, tableWidth, 8, "FD");
  
  // Draw borders for Total Row
  doc.line(15, tableBottomY + 8, 15 + tableWidth, tableBottomY + 8); // Bottom boundary
  doc.line(15, tableBottomY, 15, tableBottomY + 8); // Left border
  doc.line(15 + tableWidth, tableBottomY, 15 + tableWidth, tableBottomY + 8); // Right border
  doc.line(15 + colSLWidth + colDescWidth + colQtyWidth, tableBottomY, 15 + colSLWidth + colDescWidth + colQtyWidth, tableBottomY + 8); // Line before amount
  
  // Total Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Total", 18, tableBottomY + 5.5);
  
  // Grand Total amount text (centered in Amount column)
  doc.text(`${Math.round(total)}₹`, 15 + colSLWidth + colDescWidth + colQtyWidth + colAmtWidth / 2, tableBottomY + 5.5, { align: "center" });
  
  // --- Download PDF directly ---
  const fileName = `Invoice-${c.full_name.replace(/\s+/g, "-")}-${invoiceNo}.pdf`;
  const pdfBlob = doc.output("blob");
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
