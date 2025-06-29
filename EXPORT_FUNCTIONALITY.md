# Enhanced Export Functionality

## Overview
The ALO Sales Dashboard now supports both branded CSV and PDF export functionality for all report types. This enhancement provides professional, branded reports that can be easily shared with stakeholders.

## Features

### 🏷️ **Branded CSV Exports**
- Company logo, name, and contact information header
- Report metadata (type, generation date, period)
- Professional formatting with proper escaping
- Configurable branding that can be enabled/disabled

### 📄 **PDF Exports**
- Captures the exact table layout and styling
- Professional branded header with company information
- Configurable page orientation (portrait/landscape)
- High-quality image rendering
- Footer with confidentiality notice

### 📊 **Available Report Types**
1. **Lead Reports** - Complete lead analysis with status, source, and revenue data
2. **Conversion Reports** - Detailed conversion tracking with approval workflow status
3. **Revenue Reports** - Comprehensive revenue analysis with charts and breakdowns

## How to Use

### Exporting Reports
1. Navigate to any report page (Leads, Conversions, or Revenue)
2. Use the date range filter to select your desired time period
3. Apply any additional filters (status, source, etc.)
4. Click the "Export Report" dropdown button
5. Choose either:
   - **Export as CSV** - For data analysis and spreadsheet import
   - **Export as PDF** - For presentations and sharing

### CSV Export Features
- Branded header with company information
- Report metadata (date range, generation time)
- Clean, properly formatted data
- Ready for import into Excel, Google Sheets, etc.

### PDF Export Features
- Professional layout matching the on-screen table
- High-quality rendering suitable for printing
- Branded header and footer
- Automatic page sizing and orientation

## Customization

### Company Branding
Edit `/src/lib/brandingConfig.ts` to customize:

```typescript
export const COMPANY_CONFIG = {
  name: "Your Company Name",
  website: "www.yourcompany.com", 
  address: "Your Business Address",
  phone: "your-contact@email.com",
  logo: "🏢", // Replace with logo path or emoji
  
  // Enable/disable branding
  csvBranding: true,
  pdfBranding: true,
  
  // PDF settings
  pdfOptions: {
    orientation: "landscape", // or "portrait"
    format: "a4", // or "letter", "legal", etc.
    quality: 2, // 1-3, higher = better quality
  }
};
```

### Report Titles
Customize report titles in the same file:

```typescript
export const REPORT_TITLES = {
  leads: "Your Custom Lead Report Title",
  conversions: "Your Custom Conversion Report Title", 
  revenue: "Your Custom Revenue Report Title",
};
```

## Technical Implementation

### Files Added/Modified
- `src/lib/exportUtils.ts` - Core export functionality
- `src/lib/brandingConfig.ts` - Branding configuration
- `src/components/reports/ReportFilters.tsx` - Enhanced filter UI with export dropdown
- `src/components/reports/ConversionReports.tsx` - Updated with new export functions
- `src/components/reports/RevenueReports.tsx` - Updated with new export functions  
- `src/components/reports/LeadReports.tsx` - Updated with new export functions

### Dependencies Added
- `jspdf` - PDF generation library
- `html2canvas` - HTML to image conversion for PDF exports

### CSV Format
```
🎯 ALO Sales Dashboard
Sales Performance Analytics Suite  
www.alosales.com | info@alosales.com

Report Type: Lead Analysis Report
Generated: 2025-06-29 14:30:25
Period: 2025-01-01 to 2025-06-29

Date,Company,Contact,Source,Status,Est. Revenue,Sales Rep
2025-06-01,"Acme Corp","John Doe",website,qualified,"USD 50,000","Jane Smith"
...
```

### PDF Features
- Automatic orientation detection based on content
- Proper scaling to fit page dimensions
- Professional typography and spacing
- Branded header and footer
- High-resolution rendering for crisp printing

## Performance Considerations

### CSV Exports
- Instant generation for most datasets
- Memory efficient for large datasets
- No external dependencies required

### PDF Exports  
- May take a few seconds for complex tables
- Loading indicator shown during generation
- Optimized image compression for reasonable file sizes
- Best performance on modern browsers

## Browser Compatibility
- **CSV Export**: All modern browsers
- **PDF Export**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

## Troubleshooting

### PDF Export Issues
1. **Large Tables**: PDF export works best with tables that fit reasonably on screen
2. **Performance**: Complex tables with many rows may take longer to generate
3. **Quality**: Adjust the `quality` setting in brandingConfig.ts if needed

### CSV Encoding
- Uses UTF-8 encoding for international character support
- Proper escaping of commas, quotes, and special characters
- Compatible with Excel, Google Sheets, and other spreadsheet applications

## Future Enhancements
- Multi-page PDF support for very large tables
- Excel (.xlsx) export format
- Email integration for direct report sharing
- Scheduled report generation
- Custom report templates
