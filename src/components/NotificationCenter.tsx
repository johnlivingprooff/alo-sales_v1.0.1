import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, User, Building, X, Mail, Clock, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isToday, isPast, addDays, isFuture } from "date-fns";
import { showNotificationToast, showSuccessToast, showErrorToast } from "./notifications/NotificationToast";

export const NotificationCenter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastNotificationCheck, setLastNotificationCheck] = useState(Date.now());

  // Get visits that require follow-up or are scheduled
  const { data: notifications, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date();
      const tomorrow = addDays(today, 1);
      
      // Get follow-up visits that are due
      const { data: followUps, error: followUpError } = await supabase
        .from('daily_visits')
        .select('*')
        .eq('rep_id', user.id)
        .eq('follow_up_required', true)
        .lte('follow_up_date', tomorrow.toISOString().split('T')[0])
        .order('follow_up_date', { ascending: true });

      if (followUpError) throw followUpError;

      // Get scheduled visits for today and tomorrow
      const { data: scheduled, error: scheduledError } = await supabase
        .from('daily_visits')
        .select('*')
        .eq('rep_id', user.id)
        .eq('status', 'scheduled')
        .gte('visit_date', today.toISOString().split('T')[0])
        .lte('visit_date', tomorrow.toISOString().split('T')[0])
        .order('visit_date', { ascending: true });

      if (scheduledError) throw scheduledError;

      const allNotifications = [
        ...(followUps || []).map(visit => ({ ...visit, type: 'follow_up' })),
        ...(scheduled || []).map(visit => ({ ...visit, type: 'scheduled' }))
      ];

      return allNotifications;
    },
    enabled: !!user,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // System-wide notification checking
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const newNotifications = notifications.filter(notification => {
      const priority = getNotificationPriority(notification);
      // Only show toast for overdue and today notifications
      return priority === 'overdue' || priority === 'today';
    });

    // Show toast notifications for new high-priority items
    if (newNotifications.length > 0 && Date.now() - lastNotificationCheck > 300000) {
      newNotifications.slice(0, 3).forEach(notification => {
        const priority = getNotificationPriority(notification);
        showNotificationToast({
          id: notification.id,
          type: notification.type as 'follow_up' | 'scheduled',
          company_name: notification.company_name,
          contact_person: notification.contact_person,
          visit_type: notification.visit_type,
          date: notification.type === 'follow_up' 
            ? format(new Date(notification.follow_up_date), 'MMM dd, yyyy')
            : format(new Date(notification.visit_date), 'MMM dd, yyyy'),
          priority: priority as 'overdue' | 'today' | 'upcoming'
        });
      });
      setLastNotificationCheck(Date.now());
    }
  }, [notifications, lastNotificationCheck]);

  const markFollowUpComplete = useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await supabase
        .from('daily_visits')
        .update({ follow_up_required: false })
        .eq('id', visitId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccessToast("Follow-up marked as completed");
    },
    onError: (error) => {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      showErrorToast(`Failed to update follow-up: ${errorMessage}`);
    }
  });

  const markVisitComplete = useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await supabase
        .from('daily_visits')
        .update({ status: 'completed' })
        .eq('id', visitId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSuccessToast("Visit marked as completed");
    },
    onError: (error) => {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      showErrorToast(`Failed to update visit: ${errorMessage}`);
    }
  });

  const sendReminderEmail = useMutation({
    mutationFn: async (visit: any) => {
      if (!visit.contact_email) {
        throw new Error('No contact email available');
      }

      const { error } = await supabase.functions.invoke('send-visit-reminder', {
        body: {
          to: visit.contact_email,
          visitData: {
            company_name: visit.company_name,
            contact_person: visit.contact_person,
            visit_type: visit.visit_type,
            visit_datetime: new Date(visit.visit_date + 'T' + (visit.visit_time || '09:00')).toISOString(),
            rep_name: user?.user_metadata?.full_name || user?.email || 'Sales Representative',
            notes: visit.notes
          }
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccessToast("Reminder email sent successfully");
    },
    onError: (error) => {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      showErrorToast(`Failed to send reminder: ${errorMessage}`);
    }
  });

  const getNotificationPriority = (notification: any) => {
    if (notification.type === 'follow_up') {
      const date = new Date(notification.follow_up_date);
      if (isPast(date) && !isToday(date)) return 'overdue';
      if (isToday(date)) return 'today';
      return 'upcoming';
    } else {
      const date = new Date(notification.visit_date);
      if (isToday(date)) return 'today';
      if (isFuture(date)) return 'upcoming';
      return 'overdue';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'today': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const notificationCount = notifications?.length || 0;
  const highPriorityCount = notifications?.filter(n => {
    const priority = getNotificationPriority(n);
    return priority === 'overdue' || priority === 'today';
  }).length || 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {highPriorityCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 animate-pulse">
            {highPriorityCount}
          </Badge>
        )}
        {notificationCount > 0 && highPriorityCount === 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-blue-500">
            {notificationCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <div
          className={
            typeof window !== 'undefined' && window.innerWidth < 640
              ? 'fixed left-1/2 top-16 z-50 w-96 max-w-[calc(100vw-1rem)] overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xl animate-fade-in transform -translate-x-1/2'
              : 'absolute z-50 w-96 max-w-[calc(100vw-1rem)] overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xl animate-fade-in'
          }
          style={
            typeof window !== 'undefined' && window.innerWidth < 640
              ? { right: undefined, left: undefined, top: '4rem' }
              : { right: 0, top: '3rem', left: undefined }
          }
        >
          <Card className="p-4 bg-white border shadow-xl rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-xs"
                >
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {notificationCount === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications at this time</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications?.map((notification) => {
                  const priority = getNotificationPriority(notification);
                  const isFollowUp = notification.type === 'follow_up';
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-all hover:shadow-sm ${getPriorityColor(priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isFollowUp ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <Calendar className="h-4 w-4" />
                            )}
                            <span className="font-medium text-sm">
                              {isFollowUp ? 'Follow-up Required' : 'Scheduled Visit'}
                            </span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              <span className="font-medium">{notification.company_name}</span>
                            </div>
                            
                            {notification.contact_person && (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>{notification.contact_person}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {isFollowUp 
                                  ? `Follow-up: ${format(new Date(notification.follow_up_date), 'MMM dd, yyyy')}`
                                  : `Visit: ${format(new Date(notification.visit_date), 'MMM dd, yyyy')} ${notification.visit_time || ''}`
                                }
                              </span>
                            </div>

                            <Badge variant="secondary" className="text-xs">
                              {notification.visit_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 ml-3">
                          {isFollowUp ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markFollowUpComplete.mutate(notification.id)}
                              disabled={markFollowUpComplete.isPending}
                              className="flex items-center gap-1 text-xs"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Done
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markVisitComplete.mutate(notification.id)}
                              disabled={markVisitComplete.isPending}
                              className="flex items-center gap-1 text-xs"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Complete
                            </Button>
                          )}
                          
                          {notification.contact_email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReminderEmail.mutate(notification)}
                              disabled={sendReminderEmail.isPending}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Mail className="h-3 w-3" />
                              Email
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
