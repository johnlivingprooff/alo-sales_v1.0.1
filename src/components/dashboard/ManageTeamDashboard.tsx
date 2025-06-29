import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Target, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getUserCurrencyContext, convertCurrency } from "@/lib/currency";
import { DetailedLeadsTable } from "../tables/DetailedLeadsTable";
import { DetailedConversionsTable } from "../tables/DetailedConversionsTable";
import { DetailedUsersTableDialog } from "../tables/DetailedUsersTable";
import { DetailedVisitsTable } from "../tables/DetailedVisitsTable";
import { ConversionsManagement } from "../ConversionsManagement";

type ManageTeamView = 'dashboard' | 'approval-center';

export const ManageTeamDashboard = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [convertedTotals, setConvertedTotals] = useState<{ revenue: number, base: string } | null>(null);
  const [showLeadsTable, setShowLeadsTable] = useState(false);
  const [showConversionsTable, setShowConversionsTable] = useState(false);
  const [showUsersTable, setShowUsersTable] = useState(false);
  const [showVisitsTable, setShowVisitsTable] = useState(false);
  const [currentView, setCurrentView] = useState<ManageTeamView>('dashboard');

  // Fetch team overview stats
  const { data: teamStats, isLoading } = useQuery({
    queryKey: ['team-stats', selectedPeriod],
    queryFn: async () => {
      const today = new Date();
      let startDate: Date;
      
      if (selectedPeriod === "day") {
        startDate = today;
      } else if (selectedPeriod === "week") {
        startDate = new Date(today.setDate(today.getDate() - 7));
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
      
      // Get all team members with their roles
      const { data: teamMembers } = await supabase
        .from('profiles_with_roles')
        .select('*');

      // Get total visits
      const { count: totalVisits } = await supabase
        .from('daily_visits')
        .select('*', { count: 'exact', head: true })
        .gte('visit_date', startDate.toISOString().split('T')[0]);

      // Get total leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Get total conversions and revenue - only approved conversions count
      const { data: conversions } = await supabase
        .from('conversions')
        .select('revenue_amount, currency')
        .eq('status', 'approved')
        .gte('conversion_date', startDate.toISOString().split('T')[0]);

      return {
        teamSize: teamMembers?.length || 0,
        totalVisits: totalVisits || 0,
        totalLeads: totalLeads || 0,
        totalConversions: conversions?.length || 0,
        conversions: conversions || [],
        teamMembers: teamMembers || []
      };
    }
  });

  // Convert revenue to user's preferred currency
  useEffect(() => {
    async function convertAll() {
      if (!user || !teamStats?.conversions) return;
      const { base } = await getUserCurrencyContext(user);
      let revenue = 0;
      if (teamStats.conversions.length > 0) {
        const revenueArr = await Promise.all(
          teamStats.conversions.map(async (conv) => {
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
      }
      setConvertedTotals({ revenue, base });
    }
    convertAll();
  }, [user, teamStats]);

  // Fetch individual rep performance
  const { data: repPerformance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['rep-performance', selectedPeriod],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date();
      if (selectedPeriod === "week") {
        startDate.setDate(today.getDate() - 7);
      } else if (selectedPeriod === "month") {
        startDate.setMonth(today.getMonth() - 1);
      } else {
        startDate.setDate(today.getDate() - 1);
      }

      // Get all reps with their performance data
      const { data: reps } = await supabase
        .from('profiles_with_roles')
        .select('*')
        .in('role', ['rep', 'manager']);

      if (!reps) return [];

      const repData = await Promise.all(
        reps.map(async (rep) => {
          // Get visits for this rep
          const { count: visits } = await supabase
            .from('daily_visits')
            .select('*', { count: 'exact', head: true })
            .eq('rep_id', rep.id)
            .gte('visit_date', startDate.toISOString().split('T')[0]);

          // Get leads for this rep
          const { count: leads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', rep.id)
            .gte('created_at', startDate.toISOString());

          // Get conversions and revenue for this rep - only approved conversions count
          const { data: conversions } = await supabase
            .from('conversions')
            .select('revenue_amount, currency')
            .eq('rep_id', rep.id)
            .eq('status', 'approved')
            .gte('conversion_date', startDate.toISOString().split('T')[0]);

          // Convert revenue to user's base currency
          let revenue = 0;
          if (conversions && conversions.length > 0 && user) {
            const { base } = await getUserCurrencyContext(user);
            const convertedAmounts = await Promise.all(
              conversions.map(async (conv) => {
                const amount = Number(conv.revenue_amount) || 0;
                const fromCurrency = conv.currency || 'USD';
                try {
                  return await convertCurrency(amount, fromCurrency, base);
                } catch {
                  return amount;
                }
              })
            );
            revenue = convertedAmounts.reduce((sum, val) => sum + val, 0);
          }

          return {
            ...rep,
            visits: visits || 0,
            leads: leads || 0,
            revenue,
            conversions: conversions?.length || 0
          };
        })
      );

      return repData;
    }
  });

  const statCards = [
    {
      title: "Team Members",
      value: teamStats?.teamSize || 0,
      icon: Users,
      color: "blue",
      description: "Active representatives",
      onClick: () => setShowUsersTable(true)
    },
    {
      title: `${selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'} Visits`,
      value: teamStats?.totalVisits || 0,
      icon: TrendingUp,
      color: "green",
      description: "All teams",
      onClick: () => setShowVisitsTable(true)
    },
    {
      title: `${selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'} Leads`,
      value: teamStats?.totalLeads || 0,
      icon: Target,
      color: "purple",
      description: "Organization wide",
      onClick: () => setShowLeadsTable(true)
    },
    {
      title: "Revenue",
      value: convertedTotals ? `${convertedTotals.base} ${convertedTotals.revenue.toLocaleString()}` : '...',
      icon: DollarSign,
      color: "orange",
      description: `${selectedPeriod === 'day' ? 'Today' : selectedPeriod === 'week' ? 'This week' : 'This month'}`,
      onClick: () => setShowConversionsTable(true)
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "from-blue-500 to-blue-600",
      green: "from-green-500 to-green-600",
      purple: "from-purple-500 to-purple-600",
      orange: "from-orange-500 to-orange-600"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentView === 'approval-center') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => setCurrentView('dashboard')} variant="outline">
            ← Back to Dashboard
          </Button>
        </div>
        <ConversionsManagement />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Overview</h2>
          <p className="text-gray-600">Monitor your team's performance and progress</p>
        </div>
        <div className="flex gap-2">
          <Link to="/clients">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              View Clients
            </Button>
          </Link>
          <Button 
            onClick={() => setCurrentView('approval-center')} 
            variant="outline" 
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <Target className="h-4 w-4 mr-2" />
            Approval Center
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        <Button 
          variant={selectedPeriod === "day" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPeriod("day")}
        >
          Today
        </Button>
        <Button 
          variant={selectedPeriod === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPeriod("week")}
        >
          This Week
        </Button>
        <Button 
          variant={selectedPeriod === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPeriod("month")}
        >
          This Month
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card 
        key={index} 
        className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 shadow-md bg-white/70 backdrop-blur-sm cursor-pointer min-w-0"
        onClick={stat.onClick}
          >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{stat.title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">
          {isLoading ? (
            <span className="animate-pulse text-gray-400">...</span>
          ) : (
            stat.value
          )}
            </p>
            <p className="text-xs text-gray-500 truncate">{stat.description}</p>
          </div>
          <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-r ${getColorClasses(stat.color)}`}>
            <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
          </Card>
        ))}
      </div>

      {/* Team Performance Table */}
      <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-md">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Team Performance</h3>
        <div className="flex flex-col gap-4">
          {repPerformance?.map((rep, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={rep?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg font-semibold">
                  {rep?.full_name 
                    ? getInitials(rep.full_name)
                    : rep?.email ? getInitials(rep.email) : 'U'
                  }
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base truncate max-w-[180px] sm:max-w-xs md:max-w-sm">{rep.full_name || rep.email}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 capitalize">{rep.role}</p>
                  </div>
                  <Badge variant={rep.role === 'admin' ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                    {rep.role}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-2">
                  <div className="bg-blue-50 rounded-lg p-2 flex flex-col items-center">
                    <p className="text-xs text-gray-500">Visits</p>
                    <p className="font-semibold text-gray-900 text-base">{rep.visits}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2 flex flex-col items-center">
                    <p className="text-xs text-gray-500">Leads</p>
                    <p className="font-semibold text-gray-900 text-base">{rep.leads}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 flex flex-col items-center">
                    <p className="text-xs text-gray-500">Conversions</p>
                    <p className="font-semibold text-gray-900 text-base">{rep.conversions}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2 flex flex-col items-center">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="font-semibold text-green-600 text-base">
                      {convertedTotals ? `${convertedTotals.base} ${rep.revenue.toLocaleString()}` : `USD ${rep.revenue.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed Tables */}
      {!isLoading && (
        <>
          <DetailedLeadsTable 
            open={showLeadsTable} 
            onOpenChange={setShowLeadsTable}
            dateFilter={selectedPeriod as 'today' | 'week' | 'month'}
            title="Team Leads"
            scope="team"
          />
          <DetailedConversionsTable 
            open={showConversionsTable} 
            onOpenChange={setShowConversionsTable}
            dateFilter={selectedPeriod as 'today' | 'week' | 'month'}
            title="Team Conversions"
            scope="team"
          />
          <DetailedVisitsTable 
            open={showVisitsTable} 
            onOpenChange={setShowVisitsTable}
            dateFilter={selectedPeriod as 'today' | 'week' | 'month'}
            title="Team Visits"
            scope="team"
          />
          <DetailedUsersTableDialog open={showUsersTable} onOpenChange={setShowUsersTable} />
        </>
      )}
    </div>
  );
};
