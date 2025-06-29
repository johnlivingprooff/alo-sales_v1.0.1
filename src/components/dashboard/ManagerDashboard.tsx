import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, Users, DollarSign, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddLeadForm } from "@/components/forms/AddLeadForm";
import { LogVisitForm } from "../forms/LogVisitForm";
import { SetGoalsForm } from "../forms/SetGoalsForm";
import { LeadsDetailPage } from "../details/LeadsDetailPage";
import { VisitsDetailPage } from "../details/VisitsDetailPage";
import { ConversionsDetailPage } from "../details/ConversionsDetailPage";
import { GoalsTable } from "../GoalsTable";
import { ConversionsManagement } from "../ConversionsManagement";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { getUserCurrencyContext, convertCurrency } from "@/lib/currency";

type DetailView = 'dashboard' | 'leads' | 'visits' | 'conversions' | 'goals' | 'approval-center';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [setGoalsOpen, setSetGoalsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DetailView>('dashboard');

  // Fetch user's stats (personal stats for the manager)
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['manager-personal-stats', user?.id, selectedPeriod],
    queryFn: async () => {
      if (!user) return null;

      const today = new Date();
      const startDate = new Date();
      if (selectedPeriod === "week") {
        startDate.setDate(today.getDate() - 7);
      } else if (selectedPeriod === "month") {
        startDate.setMonth(today.getMonth() - 1);
      } else {
        startDate.setDate(today.getDate() - 1);
      }

      // Get visits count for the manager
      const { count: visitsCount } = await supabase
        .from('daily_visits')
        .select('*', { count: 'exact', head: true })
        .eq('rep_id', user.id)
        .gte('visit_date', startDate.toISOString().split('T')[0]);

      // Get leads count for the manager
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', startDate.toISOString());

      // Get conversions and revenue for the manager - only approved conversions count
      const { data: conversions } = await supabase
        .from('conversions')
        .select('revenue_amount, currency')
        .eq('rep_id', user.id)
        .eq('status', 'approved')
        .gte('conversion_date', startDate.toISOString().split('T')[0]);

      // Get user's base currency and convert revenue
      const { base } = await getUserCurrencyContext(user);
      let totalRevenue = 0;
      if (conversions && conversions.length > 0) {
        const converted = await Promise.all(
          conversions.map(async (conv) => {
            const amount = Number(conv.revenue_amount) || 0;
            const fromCurrency = conv.currency || 'USD';
            try {
              return await convertCurrency(amount, fromCurrency, base);
            } catch (e) {
              console.error('Currency conversion failed:', e);
              return amount;
            }
          })
        );
        totalRevenue = converted.reduce((sum, val) => sum + val, 0);
      }

      // Get current goals
      const { data: currentGoals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .lte('period_start', today.toISOString().split('T')[0])
        .gte('period_end', today.toISOString().split('T')[0]);

      return {
        visits: visitsCount || 0,
        leads: leadsCount || 0,
        revenue: totalRevenue,
        conversions: conversions?.length || 0,
        goals: currentGoals || [],
        baseCurrency: base
      };
    },
    enabled: !!user
  });

  if (currentView === 'leads') {
    return <LeadsDetailPage onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'visits') {
    return <VisitsDetailPage onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'conversions') {
    return <ConversionsDetailPage onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'goals') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => setCurrentView('dashboard')} variant="outline">
            ← Back to Dashboard
          </Button>
          <Button onClick={() => setSetGoalsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Set New Goal
          </Button>
        </div>
        <GoalsTable />
        <SetGoalsForm 
          open={setGoalsOpen} 
          onOpenChange={(open) => {
            setSetGoalsOpen(open);
            if (!open) refetch();
          }} 
        />
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

  const statCards = [
    {
      title: "Visits",
      value: stats?.visits ?? (isLoading ? '...' : 0),
      icon: Calendar,
      color: "blue",
      description: `This ${selectedPeriod}`,
      onClick: () => setCurrentView('visits')
    },
    {
      title: "Leads Generated",
      value: stats?.leads ?? (isLoading ? '...' : 0),
      icon: Users,
      color: "green",
      description: `This ${selectedPeriod}`,
      onClick: () => setCurrentView('leads')
    },
    {
      title: "Revenue",
      value: stats?.baseCurrency ? `${stats.baseCurrency} ${stats.revenue?.toLocaleString()}` : (isLoading ? '...' : 'USD 0'),
      icon: DollarSign,
      color: "purple",
      description: `This ${selectedPeriod}`,
      onClick: () => setCurrentView('conversions')
    },
    {
      title: "Conversions",
      value: stats?.conversions ?? (isLoading ? '...' : 0),
      icon: Target,
      color: "orange",
      description: `This ${selectedPeriod}`,
      onClick: () => setCurrentView('conversions')
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

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex flex-row flex-wrap gap-4 w-full sm:w-auto mb-2">
        <Button onClick={() => setLogVisitOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
          <Plus className="h-4 w-4 mr-2" />
          Log/Schedule Visit
        </Button>
        <Button onClick={() => setAddLeadOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
        <Button onClick={() => setSetGoalsOpen(true)} variant="outline">
          <Target className="h-4 w-4 mr-2" />
          Set Goals
        </Button>
        <Link to="/clients">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            View Clients
          </Button>
        </Link>
        <Button onClick={() => setCurrentView('approval-center')} variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
          <Target className="h-4 w-4 mr-2" />
          Approval Center
        </Button>
        {/* <NotificationCenter /> */}
      </div>

      {/* Period Selector */}
      <div className="flex flex-row gap-2 w-full sm:w-auto mb-4">
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

      {/* Goals Progress */}
      {isLoading ? (
        <Card className="p-6 bg-white/70 backdrop-blur-sm border-0 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Current Goals</h3>
          <div className="space-y-4">
            {[1, 2].map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-40 bg-gray-200 rounded"></div>
                </div>
                <div className="text-right">
                  <div className="h-5 w-16 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        stats?.goals && stats.goals.length > 0 && (
          <Card className="p-6 bg-white/70 backdrop-blur-sm border-0 shadow-md cursor-pointer" onClick={() => setCurrentView('goals')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Current Goals</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              {stats.goals.slice(0, 3).map((goal: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900 capitalize">{goal.goal_type}</h4>
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {goal.goal_type === 'revenue' && goal.currency
                        ? `${goal.currency} ${Number(goal.current_value).toLocaleString()} / ${Number(goal.target_value).toLocaleString()}`
                        : `${Number(goal.current_value)} / ${Number(goal.target_value)}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100)}% Complete
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      )}

      {/* Forms */}
      <LogVisitForm open={logVisitOpen} onOpenChange={(open) => {
        setLogVisitOpen(open);
        if (!open) refetch();
      }} />
      <AddLeadForm open={addLeadOpen} onOpenChange={(open) => {
        setAddLeadOpen(open);
        if (!open) refetch();
      }} />
      <SetGoalsForm open={setGoalsOpen} onOpenChange={(open) => {
        setSetGoalsOpen(open);
        if (!open) refetch();
      }} />
    </div>
  );
};
