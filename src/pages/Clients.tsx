import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Building, Mail, Phone, MapPin, Calendar, Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { LogVisitForm } from "@/components/forms/LogVisitForm";
import { AddClientForm } from "@/components/forms/AddClientForm";

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
}

export const Clients = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [selectedClientForVisit, setSelectedClientForVisit] = useState<Client | null>(null);

  const { data: clients, isLoading, error, refetch } = useQuery({
    queryKey: ['clients', searchTerm],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('clients')
        .select(`
          id,
          company_name,
          contact_person,
          email,
          phone,
          address,
          industry,
          notes,
          created_at,
          created_by
        `)
        .order('created_at', { ascending: false });

      if (searchTerm.trim()) {
        query = query.or(`
          company_name.ilike.%${searchTerm}%,
          contact_person.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%,
          industry.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const filteredClients = clients || [];

  const handleScheduleVisit = (client: Client) => {
    setSelectedClientForVisit(client);
    setLogVisitOpen(true);
  };

  const handleLogVisitClose = () => {
    setLogVisitOpen(false);
    setSelectedClientForVisit(null);
  };

  const handleClientAdded = () => {
    refetch(); // Refresh the clients list
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto p-6">
          <Card className="p-6 text-center">
            <p className="text-red-600">Error loading clients: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Clients Directory
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and view all clients in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
          </Badge>
          <Button onClick={() => setAddClientOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients by company name, contact person, email, or industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Clients Grid */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Company Name */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-600" />
                      {client.company_name}
                    </h3>
                    {client.industry && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {client.industry}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-2">
                  {client.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {client.contact_person}
                    </div>
                  )}
                  
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${client.email}`} className="hover:text-blue-600 hover:underline">
                        {client.email}
                      </a>
                    </div>
                  )}
                  
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${client.phone}`} className="hover:text-blue-600 hover:underline">
                        {client.phone}
                      </a>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {client.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {client.notes}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-3">
                  <Button 
                    onClick={() => handleScheduleVisit(client)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    size="sm"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Visit
                  </Button>
                </div>

                {/* Footer Info */}
                <div className="border-t pt-3 flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Added {format(new Date(client.created_at), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredClients.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No clients found" : "No clients yet"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? `No clients match your search for "${searchTerm}"`
              : "Start by adding leads and converting them to build your client base."
            }
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear search
            </Button>
          )}
        </Card>
      )}

      {/* Forms */}
      <LogVisitForm 
        open={logVisitOpen} 
        onOpenChange={handleLogVisitClose}
        initialValues={selectedClientForVisit ? {
          company_name: selectedClientForVisit.company_name,
          contact_person: selectedClientForVisit.contact_person || "",
          contact_email: selectedClientForVisit.email || ""
        } : undefined}
      />
      
      <AddClientForm 
        open={addClientOpen} 
        onOpenChange={setAddClientOpen}
        onClientCreated={handleClientAdded}
      />
      </div>
    </div>
  );
};
