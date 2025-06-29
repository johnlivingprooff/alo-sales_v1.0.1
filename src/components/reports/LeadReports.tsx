import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportFilters } from "./ReportFilters";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportBrandedCSV, exportTableToPDF, escapeCSV, formatCurrency } from "@/lib/exportUtils";
import { REPORT_TITLES } from "@/lib/brandingConfig";
import { getUserCurrencyContext, convertCurrency } from "@/lib/currency";

type LeadStatus = "all" | "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export const LeadReports = () => {
  const { user, userRole } = useAuth();
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [statusFilter, setStatusFilter] = useState<LeadStatus>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [convertedTotals, setConvertedTotals] = useState<{ revenue: number, base: string } | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['lead-reports', user?.id, userRole, dateRange, statusFilter, sourceFilter],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          profiles!inner(full_name, email)
        `);

      // Filter by user if not manager/admin
      if (!['manager', 'director', 'admin'].includes(userRole || '')) {
        query = query.eq('created_by', user.id);
      }

      // Apply date filter
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply source filter
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  useEffect(() => {
    async function convertAll() {
      if (!user || !leads) return;
      const { base } = await getUserCurrencyContext(user);
      let revenue = 0;
      if (leads.length > 0) {
        const revenueArr = await Promise.all(
          leads.map(async (lead) => {
            const amount = Number(lead.estimated_revenue) || 0;
            const fromCurrency = lead.currency || 'USD';
            try {
              return await convertCurrency(amount, fromCurrency, base);
            } catch {
              return amount;
            }
          })
        );
        revenue = revenueArr.reduce((sum, val) => sum + val, 0);
      }
      setConvertedTotals({ revenue, base });
    }
    convertAll();
  }, [user, leads]);

  const exportReport = () => {
    if (!leads || leads.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = leads.map(lead => [
      format(new Date(lead.created_at), 'yyyy-MM-dd'),
      escapeCSV(lead.company_name),
      escapeCSV(lead.contact_name),
      escapeCSV(lead.source),
      escapeCSV(lead.status),
      formatCurrency(lead.estimated_revenue || 0, lead.currency),
      escapeCSV(lead.profiles?.full_name || lead.profiles?.email || 'Unknown')
    ].join(','));

    exportBrandedCSV(
      csvData,
      ['Date', 'Company', 'Contact', 'Source', 'Status', 'Est. Revenue', 'Sales Rep'],
      'lead-report',
      REPORT_TITLES.leads,
      dateRange
    );
  };

  const exportReportPDF = async () => {
    await exportTableToPDF(
      'leads-table',
      'lead-report',
      REPORT_TITLES.leads,
      dateRange
    );
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      qualified: "bg-purple-100 text-purple-800",
      proposal: "bg-orange-100 text-orange-800",
      negotiation: "bg-indigo-100 text-indigo-800",
      closed_won: "bg-green-100 text-green-800",
      closed_lost: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const leadsByStatus = leads?.reduce((acc, lead) => {
    acc[lead.status || 'unknown'] = (acc[lead.status || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={exportReport}
        onExportPDF={exportReportPDF}
        exportLabel="Export Lead Report"
        additionalFilters={
          <>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="email">Email Campaign</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="cold-call">Cold Call</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{leads?.length || 0}</div>
          <div className="text-sm text-gray-600">Total Leads</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {convertedTotals ? `${convertedTotals.base} ${convertedTotals.revenue.toLocaleString()}` : '...'}
          </div>
          <div className="text-sm text-gray-600">Est. Pipeline Value</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{leadsByStatus['closed_won'] || 0}</div>
          <div className="text-sm text-gray-600">Closed Won</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {leads?.length ? Math.round(((leadsByStatus['closed_won'] || 0) / leads.length) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">Conversion Rate</div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Lead Details</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">Loading...</div>
        ) : (
          <div className="overflow-x-auto" id="leads-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Est. Revenue</TableHead>
                  <TableHead>Sales Rep</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads?.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{format(new Date(lead.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell>{lead.contact_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(lead.status || '')}>
                        {lead.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.estimated_revenue ? (
                        <span>{lead.currency} {Number(lead.estimated_revenue).toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {lead.profiles?.full_name || lead.profiles?.email || 'Unknown'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
