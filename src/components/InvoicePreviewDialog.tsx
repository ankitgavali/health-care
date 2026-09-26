import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, Eye } from "lucide-react";
import { generateInvoicePDF } from "@/lib/pdf";
import type { CaseRow } from "@/lib/case-utils";
import { toast } from "sonner";

interface InvoicePreviewDialogProps {
  caseRow: CaseRow;
  trigger?: React.ReactNode;
}

export function InvoicePreviewDialog({ caseRow, trigger }: InvoicePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (open) {
      setLoading(true);
      generateInvoicePDF(caseRow, "blob")
        .then((url) => {
          if (active) {
            setPdfUrl(url);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to generate PDF preview", err);
          toast.error("Failed to load PDF preview");
          if (active) {
            setLoading(false);
          }
        });
    } else {
      // Clean up blob URL when dialog closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
    return () => {
      active = false;
    };
  }, [open, caseRow]);

  const handleDownload = async () => {
    const tId = toast.loading("Downloading Invoice...");
    try {
      await generateInvoicePDF(caseRow, "download");
      toast.success("Downloaded successfully", { id: tId });
    } catch (e) {
      toast.error("Download failed", { id: tId });
    }
  };

  const handlePrint = async () => {
    const tId = toast.loading("Preparing Print...");
    try {
      await generateInvoicePDF(caseRow, "print");
      toast.success("Print dialog opened", { id: tId });
    } catch (e) {
      toast.error("Print failed", { id: tId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="rounded-xl h-9">
            <Eye className="mr-1.5 h-4 w-4" /> Preview & Download
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[96vh] flex flex-col rounded-2xl p-4 sm:p-5 bg-background">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold">
            Invoice Preview — {caseRow.full_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 w-full mt-4 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Generating PDF preview...</p>
            </div>
          ) : pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="Invoice Preview" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Failed to load PDF preview.
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-4 shrink-0">
          <Button variant="outline" onClick={handlePrint} className="rounded-xl h-10 px-4">
            <Printer className="mr-1.5 h-4.5 w-4.5" /> Print
          </Button>
          <Button onClick={handleDownload} className="rounded-xl h-10 px-4 bg-yellow-600 hover:bg-yellow-700 text-white">
            <Download className="mr-1.5 h-4.5 w-4.5" /> Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
