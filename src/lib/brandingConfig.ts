// Company branding configuration
// You can customize these values to match your company's branding
import icon from "../assets/icon.png";
// Alternative imports if needed:
// import iconSvg from "../assets/icon.svg";
// import iconIco from "../assets/icon.ico";

export const COMPANY_CONFIG = {
  // Company Information
  name: "Alo—Sales Dashboard",
  website: "81px.vercel.app",
  address: "Sales Performance Analytics Suite",
  phone: "eiteonepixels@gmail.com",
  
  // Visual Branding
  logo: icon, // This will be the imported image URL
  // Alternative: logoSvg: iconSvg, // For SVG version
  primaryColor: "#3B82F6", // Blue color for primary elements
  
  // Report Settings
  csvBranding: true, // Set to false to disable branding in CSV exports
  pdfBranding: true, // Set to false to disable branding in PDF exports
  
  // PDF Export Settings
  pdfOptions: {
    orientation: "portrait", // "portrait" or "landscape"
    format: "a4", // "a4", "letter", etc.
    quality: 2, // Scale factor for image quality (1-3)
  },
  
  // Footer Text for Reports
  confidentialityText: "Confidential | Alo—Sales Dashboard",
};

// You can also customize report titles here
export const REPORT_TITLES = {
  leads: "Lead Analysis Report",
  conversions: "Conversion Analysis Report", 
  revenue: "Revenue Analysis Report",
};

// Custom date format for reports (using date-fns format)
export const DATE_FORMAT = "yyyy-MM-dd";
export const TIMESTAMP_FORMAT = "yyyy-MM-dd HH:mm:ss";
