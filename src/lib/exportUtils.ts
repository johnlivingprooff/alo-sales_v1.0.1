import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { COMPANY_CONFIG, REPORT_TITLES, TIMESTAMP_FORMAT } from "./brandingConfig";

// Generate branded CSV header
export const generateBrandedCSVHeader = (reportType: string, dateRange?: { from?: Date; to?: Date }) => {
  if (!COMPANY_CONFIG.csvBranding) return [];
  
  const currentDate = format(new Date(), TIMESTAMP_FORMAT);
  const period = dateRange?.from && dateRange?.to 
    ? `${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}`
    : 'All Time';

  // For CSV, we'll use the company name without the logo image
  return [
    [`${COMPANY_CONFIG.name}`],
    [`${COMPANY_CONFIG.address}`],
    [`${COMPANY_CONFIG.website} | ${COMPANY_CONFIG.phone}`],
    [''],
    [`Report Type: ${reportType}`],
    [`Generated: ${currentDate}`],
    [`Period: ${period}`],
    [''],
    ['']
  ];
};

// Enhanced CSV export with branding
export const exportBrandedCSV = (
  data: any[], 
  headers: string[], 
  filename: string, 
  reportType: string,
  dateRange?: { from?: Date; to?: Date }
) => {
  if (!data || data.length === 0) {
    toast.error("No data to export");
    return;
  }

  const brandHeader = generateBrandedCSVHeader(reportType, dateRange);
  
  const csvContent = [
    ...brandHeader.map(row => row.join(',')),
    headers.join(','),
    ...data
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV report exported successfully!");
};

// PDF export function
export const exportTableToPDF = async (
  elementId: string, 
  filename: string, 
  reportType: string,
  dateRange?: { from?: Date; to?: Date }
) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error("Table not found for PDF export");
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("Generating PDF...");

    // Create canvas from the table
    const canvas = await html2canvas(element, {
      scale: COMPANY_CONFIG.pdfOptions.quality,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: COMPANY_CONFIG.pdfOptions.orientation as 'portrait' | 'landscape',
      unit: 'mm',
      format: COMPANY_CONFIG.pdfOptions.format as any
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    if (COMPANY_CONFIG.pdfBranding) {
      // Company header with logo
      let yPosition = 20;
      
      // Add logo if it's an image URL
      if (typeof COMPANY_CONFIG.logo === 'string' && COMPANY_CONFIG.logo.startsWith('data:') || COMPANY_CONFIG.logo.includes('.')) {
        try {
          // For imported images, we can add them to the PDF
          const logoImg = new Image();
          logoImg.src = COMPANY_CONFIG.logo;
          
          // Add logo (small size)
          pdf.addImage(COMPANY_CONFIG.logo, 'PNG', 20, yPosition, 15, 15);
          
          // Company name next to logo
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          pdf.text(COMPANY_CONFIG.name, 40, yPosition + 10);
          yPosition += 20;
        } catch (error) {
          // Fallback: just use text
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          pdf.text(COMPANY_CONFIG.name, 20, yPosition);
          yPosition += 10;
        }
      } else {
        // For emoji or text logos
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${COMPANY_CONFIG.logo} ${COMPANY_CONFIG.name}`, 20, yPosition);
        yPosition += 10;
      }
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(COMPANY_CONFIG.address, 20, yPosition + 8);
      pdf.text(`${COMPANY_CONFIG.website} | ${COMPANY_CONFIG.phone}`, 20, yPosition + 14);
      
      // Report details
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Report: ${reportType}`, 20, yPosition + 25);
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Generated: ${format(new Date(), TIMESTAMP_FORMAT)}`, 20, yPosition + 32);
      
      if (dateRange?.from && dateRange?.to) {
        pdf.text(`Period: ${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}`, 20, yPosition + 38);
      }
    }

    // Calculate image dimensions to fit page
    const headerHeight = COMPANY_CONFIG.pdfBranding ? 80 : 20;
    const maxWidth = pageWidth - 40; // 20mm margin on each side
    const maxHeight = pageHeight - headerHeight - 20; // Space for header and footer
    
    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * maxWidth) / canvas.width;
    
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = (canvas.width * maxHeight) / canvas.height;
    }

    // Add the table image
    const yPosition = COMPANY_CONFIG.pdfBranding ? 65 : 15;
    pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
    
    if (COMPANY_CONFIG.pdfBranding) {
      // Add footer
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Page 1 of 1`, pageWidth - 30, pageHeight - 10);
      pdf.text(COMPANY_CONFIG.confidentialityText, 20, pageHeight - 10);
    }

    // Save the PDF
    pdf.save(`${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast.dismiss(loadingToast);
    toast.success("PDF report exported successfully!");
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error("Failed to generate PDF report");
  }
};

// Multi-format export function
export const exportReport = async (
  format: 'csv' | 'pdf',
  csvData?: {
    data: any[];
    headers: string[];
    filename: string;
    reportType: string;
  },
  pdfData?: {
    elementId: string;
    filename: string;
    reportType: string;
  },
  dateRange?: { from?: Date; to?: Date }
) => {
  if (format === 'csv' && csvData) {
    exportBrandedCSV(
      csvData.data,
      csvData.headers,
      csvData.filename,
      csvData.reportType,
      dateRange
    );
  } else if (format === 'pdf' && pdfData) {
    await exportTableToPDF(
      pdfData.elementId,
      pdfData.filename,
      pdfData.reportType,
      dateRange
    );
  }
};

// Format currency for exports
export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return `${currency} ${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Escape CSV content
export const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};
