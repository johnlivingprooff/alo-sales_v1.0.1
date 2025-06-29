import { useEffect, useState } from "react";
import { getUserCurrencyContext, convertCurrency } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportFilters } from "./ReportFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { exportBrandedCSV, exportTableToPDF, escapeCSV, formatCurrency } from "@/lib/exportUtils";
import { REPORT_TITLES } from "@/lib/brandingConfig";

export const RevenueReports = () => {
  const { user, userRole } = useAuth();
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subMonths(new Date(), 11),
    to: new Date()
  });
  const [groupBy, setGroupBy] = useState("month");

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-reports', user?.id, userRole, dateRange, groupBy],
    queryFn: async () => {
      if (!user) return { conversions: [], monthlyData: [], currencyData: [] };
      
      let query = supabase
        .from('conversions')
        .select(`
          *,
          leads (
            company_name,
            contact_name,
            source
          ),
          profiles!inner(full_name, email)
        `)
        .eq('status', 'approved'); // Only include approved conversions for revenue reports

      // Filter by user if not manager/admin
      if (!['manager', 'director', 'admin'].includes(userRole || '')) {
        query = query.eq('rep_id', user.id);
      }

      // Apply date filter
      if (dateRange.from) {
        query = query.gte('conversion_date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        query = query.lte('conversion_date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data: conversions, error } = await query.order('conversion_date', { ascending: false });
      if (error) throw error;

      // Group data by month
      const monthlyData = eachMonthOfInterval({
        start: startOfMonth(dateRange.from || subMonths(new Date(), 11)),
        end: endOfMonth(dateRange.to || new Date())
      }).map(month => {
        const monthConversions = conversions?.filter(conv => {
          const convDate = new Date(conv.conversion_date);
          return convDate >= startOfMonth(month) && convDate <= endOfMonth(month);
        }) || [];

        // Find the most common currency for the month, fallback to USD
        const currencyCounts = monthConversions.reduce((acc, conv) => {
          const currency = conv.currency || 'USD';
          acc[currency] = (acc[currency] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostCommonCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';

        return {
          month: format(month, 'MMM yyyy'),
          revenue: monthConversions.reduce((sum, conv) => sum + Number(conv.revenue_amount), 0),
          commission: monthConversions.reduce((sum, conv) => sum + (Number(conv.commission_amount) || 0), 0),
          conversions: monthConversions.length,
          currency: mostCommonCurrency
        };
      });

      // Group by currency
      const currencyData = conversions?.reduce((acc, conv) => {
        const currency = conv.currency || 'USD';
        const existing = acc.find(item => item.currency === currency);
        if (existing) {
          existing.revenue += Number(conv.revenue_amount);
          existing.conversions += 1;
        } else {
          acc.push({
            currency,
            revenue: Number(conv.revenue_amount),
            conversions: 1
          });
        }
        return acc;
      }, [] as Array<{ currency: string; revenue: number; conversions: number }>) || [];

      return { conversions: conversions || [], monthlyData, currencyData };
    },
    enabled: !!user
  });

  const [convertedTotals, setConvertedTotals] = useState<{ revenue: number, commission: number, avgCommissionRate: number, base: string } | null>(null);
  useEffect(() => {
    async function convertAll() {
      if (!user || !revenueData?.conversions) return;
      const { base } = await getUserCurrencyContext(user);
      let revenue = 0;
      let commission = 0;
      let avgCommissionRate = 0;
      if (revenueData.conversions.length > 0) {
        const revenueArr = await Promise.all(
          revenueData.conversions.map(async (conv) => {
            const amount = Number(conv.revenue_amount) || 0;
            const fromCurrency = conv.currency || 'USD';
            try {
              return await convertCurrency(amount, fromCurrency, base);
            } catch {
              return amount;
            }
          })
        );
        revenue = revenueArr.reduce((sum, val) => sum + val, 0);
        const commissionArr = await Promise.all(
          revenueData.conversions.map(async (conv) => {
            const amount = Number(conv.commission_amount) || 0;
            const fromCurrency = conv.currency || 'USD';
            try {
              return await convertCurrency(amount, fromCurrency, base);
            } catch {
              return amount;
            }
          })
        );
        commission = commissionArr.reduce((sum, val) => sum + val, 0);
        avgCommissionRate = revenue > 0 ? (commission / revenue * 100) : 0;
      }
      setConvertedTotals({ revenue, commission, avgCommissionRate, base });
    }
    convertAll();
  }, [user, revenueData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const [convertedExportRows, setConvertedExportRows] = useState<any[] | null>(null);
  useEffect(() => {
    async function convertExportRows() {
      if (!user || !revenueData?.monthlyData) return;
      const { base } = await getUserCurrencyContext(user);
      // Convert monthlyData
      const convertedRows = await Promise.all(
        revenueData.monthlyData.map(async (item) => {
          // For each month, convert revenue and commission
          const revenue = await convertCurrency(item.revenue, item.currency, base).catch(() => item.revenue);
          const commission = await convertCurrency(item.commission, item.currency, base).catch(() => item.commission);
          return {
            ...item,
            revenue,
            commission,
            base
          };
        })
      );
      setConvertedExportRows(convertedRows);
    }
    convertExportRows();
  }, [user, revenueData]);

  const exportReport = async () => {
    if (!revenueData?.conversions || revenueData.conversions.length === 0) {
      toast.error("No data to export");
      return;
    }
    if (!convertedExportRows) {
      toast.error("Currency conversion in progress, please try again in a moment.");
      return;
    }

    // Prepare CSV data sections
    const monthlyData = convertedExportRows.map(item => [
      escapeCSV(item.month),
      item.revenue.toFixed(2),
      item.commission.toFixed(2),
      item.conversions.toString()
    ].join(','));

    const conversionsData = revenueData.conversions.map(conv => [
      format(new Date(conv.conversion_date), 'yyyy-MM-dd'),
      escapeCSV(conv.leads?.company_name || 'Unknown'),
      conv.revenue_amount.toFixed(2),
      (conv.commission_amount || 0).toFixed(2),
      escapeCSV(conv.currency || 'USD'),
      escapeCSV(conv.profiles?.full_name || conv.profiles?.email || 'Unknown')
    ].join(','));

    const currencyData = revenueData.currencyData.map(item => [
      escapeCSV(item.currency),
      item.revenue.toFixed(2),
      item.conversions.toString()
    ].join(','));

    // Combine all sections
    const allData = [
      '',
      'Monthly Revenue',
      'Month,Revenue,Commission,Conversions',
      ...monthlyData,
      '',
      'Individual Conversions',
      'Date,Company,Revenue,Commission,Currency,Sales Rep',
      ...conversionsData,
      '',
      'Currency Breakdown',
      'Currency,Revenue,Conversions',
      ...currencyData
    ];

    exportBrandedCSV(
      allData,
      [], // Headers are included in the data sections
      'revenue-report',
      REPORT_TITLES.revenue,
      dateRange
    );
  };

  const exportReportPDF = async () => {
    await exportTableToPDF(
      'revenue-charts',
      'revenue-report',
      REPORT_TITLES.revenue,
      dateRange
    );
  };

  return (
    <div className="space-y-6">
      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={exportReport}
        onExportPDF={exportReportPDF}
        exportLabel="Export Revenue Report"
        additionalFilters={
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="quarter">By Quarter</SelectItem>
              <SelectItem value="year">By Year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {convertedTotals ? `${convertedTotals.base} ${convertedTotals.revenue.toLocaleString()}` : '...'}
          </div>
          <div className="text-sm text-gray-600">Approved Revenue</div>
          <div className="text-xs text-gray-500 mt-1">
            Only approved conversions counted
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {convertedTotals ? `${convertedTotals.base} ${convertedTotals.commission.toLocaleString()}` : '...'}
          </div>
          <div className="text-sm text-gray-600">Approved Commission</div>
          <div className="text-xs text-gray-500 mt-1">
            Only approved conversions counted
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {convertedTotals ? `${convertedTotals.avgCommissionRate.toFixed(1)}%` : '...'}
          </div>
          <div className="text-sm text-gray-600">Avg Commission Rate</div>
          <div className="text-xs text-gray-500 mt-1">
            Based on approved conversions
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{revenueData?.conversions?.length || 0}</div>
          <div className="text-sm text-gray-600">Approved Conversions</div>
          <div className="text-xs text-gray-500 mt-1">
            Only approved conversions shown
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="revenue-charts">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData?.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue by Currency</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueData?.currencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {revenueData?.currencyData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: string, props: any) => {
                  // Show value with correct currency symbol
                  const entry = props && props.payload;
                  const currency = entry && entry.currency ? entry.currency : '';
                  return [`${currency} ${Number(value).toLocaleString()}`, 'Revenue'];
                }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
};
