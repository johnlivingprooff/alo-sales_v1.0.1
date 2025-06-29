import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { usePendingConversionsCount } from "@/hooks/useConversions";
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Users, 
  LogOut,
  User,
  Shield,
  UserCog,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import icon from "@/assets/icon.png";

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: pendingCount } = usePendingConversionsCount();

  // Get user profile for avatar
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path: string) => location.pathname === path;
  
  const canManageUsers = ['admin', 'director'].includes(userRole || '');
  const isManager = userRole === 'manager';
  const isAdminOrDirector = ['admin', 'director'].includes(userRole || '');
  const canViewConversions = ['manager', 'director', 'admin'].includes(userRole || '');

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex flex-row items-center justify-between h-16 w-full relative">
          {/* Left: Logo + App Name + Menus */}
          <div className="flex items-center gap-2 w-auto">
            <img src={icon} alt="Alo—Sales" className="h-8 w-8" />
            <span className="hidden sm:inline text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent ml-2">
              Alo—Sales
            </span>
            {/* Hamburger for mobile and tablet */}
            <button
              className="ml-2 flex lg:hidden items-center px-2 py-1 focus:outline-none"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Desktop Menus */}
            <div className="hidden lg:flex flex-row items-center gap-1 ml-4">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              {isManager && (
                <Link
                  to="/manage-team"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/manage-team') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <UserCog className="h-4 w-4" /> Team
                </Link>
              )}
              {canViewConversions && (
                <Link
                  to="/conversions"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${isActive('/conversions') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <TrendingUp className="h-4 w-4" /> Conversions&nbsp;
                  {pendingCount && pendingCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </Badge>
                  )}
                </Link>
              )}
              <Link
                to="/clients"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/clients') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <Users className="h-4 w-4" /> Clients
              </Link>
              <Link
                to="/reports"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/reports') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <FileText className="h-4 w-4" /> Reports
              </Link>
              {/* {isAdminOrDirector && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )} */}
            </div>
          </div>

          {/* Center: empty for spacing */}
          <div className="flex-1" />

          {/* Right: Profile, Settings, Notification, Logout */}
          <div className="flex flex-row items-center space-x-2 lg:space-x-4 w-auto">
            <Link
              to="/profile"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/profile') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">Hi! {profile?.full_name}</span>
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/settings') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <NotificationCenter />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile/Tablet Nav - Hamburger controlled */}
          {mobileMenuOpen && (
            <div className="flex lg:hidden flex-col w-full space-y-1 bg-white/95 rounded shadow-lg absolute left-0 top-16 z-50 p-4 animate-fade-in">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              {isManager && (
                <Link
                  to="/manage-team"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/manage-team') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCog className="h-4 w-4" /> Manage Team
                </Link>
              )}
              {canViewConversions && (
                <Link
                  to="/conversions"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/conversions') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <TrendingUp className="h-4 w-4" /> Conversions
                  {pendingCount && pendingCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </Badge>
                  )}
                </Link>
              )}
              <Link
                to="/clients"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/clients') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="h-4 w-4" /> Clients
              </Link>
              <Link
                to="/reports"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/reports') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileText className="h-4 w-4" /> Reports
              </Link>
              {isAdminOrDirector && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
