
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ClientSearchInput } from "./ClientSearchInput";
import { AddClientForm } from "./AddClientForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AddLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
  initialValues?: {
    company_name?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    notes?: string;
    address?: string;
    source?: string;
    status?: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
    currency?: string;
    estimated_revenue?: string;
    date?: string;
  };
}

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'TND' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'MWK', name: 'Malawi Kwacha', symbol: 'MK' }
];

export const AddLeadForm = ({ open, onOpenChange, onLeadCreated, initialValues }: AddLeadFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState(initialValues?.company_name || "");
  const [contactName, setContactName] = useState(initialValues?.contact_name || "");
  const [contactEmail, setContactEmail] = useState(initialValues?.contact_email || "");
  const [contactPhone, setContactPhone] = useState(initialValues?.contact_phone || "");
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [address, setAddress] = useState(initialValues?.address || "");
  const [source, setSource] = useState(initialValues?.source || "");
  const [status, setStatus] = useState<"new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost">(initialValues?.status || "new");
  const [currency, setCurrency] = useState(initialValues?.currency || "USD");
  const [estimatedRevenue, setEstimatedRevenue] = useState(initialValues?.estimated_revenue || "");
  const [leadDate, setLeadDate] = useState(initialValues?.date || new Date().toISOString().split("T")[0]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [newSourceValue, setNewSourceValue] = useState("");
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [showCustomSource, setShowCustomSource] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch status options
  const { data: statusOptions } = useQuery({
    queryKey: ['lead-status-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_status_options')
        .select('*')
        .eq('user_id', user?.id)
        .order('label');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch source options
  const { data: sourceOptions } = useQuery({
    queryKey: ['lead-source-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_source_options')
        .select('*')
        .eq('user_id', user?.id)
        .order('label');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Add new status option
  const addStatusOption = useMutation({
    mutationFn: async (label: string) => {
      const value = label.toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase
        .from('lead_status_options')
        .insert({
          user_id: user?.id,
          label,
          value
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-status-options'] });
      setStatus(data.value as any);
      setNewStatusValue("");
      setShowCustomStatus(false);
      toast.success('Status option added');
    }
  });

  // Add new source option
  const addSourceOption = useMutation({
    mutationFn: async (label: string) => {
      const value = label.toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase
        .from('lead_source_options')
        .insert({
          user_id: user?.id,
          label,
          value
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-source-options'] });
      setSource(data.value);
      setNewSourceValue("");
      setShowCustomSource(false);
      toast.success('Source option added');
    }
  });

  useEffect(() => {
    setCompanyName(initialValues?.company_name || "");
    setContactName(initialValues?.contact_name || "");
    setContactEmail(initialValues?.contact_email || "");
    setContactPhone(initialValues?.contact_phone || "");
    setNotes(initialValues?.notes || "");
    setAddress(initialValues?.address || "");
    setSource(initialValues?.source || "");
    setStatus(initialValues?.status || "new");
    setCurrency(initialValues?.currency || "USD");
    setEstimatedRevenue(initialValues?.estimated_revenue || "");
    setLeadDate(initialValues?.date || new Date().toISOString().split("T")[0]);
  }, [initialValues]);

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setCompanyName(client.company_name);
      setContactName(client.contact_person || "");
      setContactEmail(client.email || "");
      setContactPhone(client.phone || "");
      setAddress(client.address || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // If no existing client selected and company name entered, create client first
      let clientId = selectedClient?.id;
      if (!clientId && companyName) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            created_by: user.id,
            company_name: companyName,
            contact_person: contactName || null,
            email: contactEmail || null,
            phone: contactPhone || null,
            address: address || null
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Insert new lead
      const { error } = await supabase
        .from('leads')
        .insert({
          created_by: user.id,
          company_name: companyName,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
          source,
          status,
          notes,
          currency,
          estimated_revenue: estimatedRevenue ? parseFloat(estimatedRevenue) : null,
          lead_date: leadDate
        });

      if (error) throw error;

      // Check for an existing goal
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const { data: goals, error: goalError } = await supabase
        .from('goals')
        .select('current_value')
        .eq('user_id', user.id)
        .eq('goal_type', 'leads')
        .lte('period_start', todayStr)
        .gte('period_end', todayStr);

      if (goalError) throw goalError;

      // Only increment if there's a matching goal
      if (goals && goals.length > 0) {
        const currentValue = goals[0].current_value || 0;
        await supabase
          .from('goals')
          .update({ current_value: currentValue + 1 })
          .eq('user_id', user.id)
          .eq('goal_type', 'leads')
          .lte('period_start', todayStr)
          .gte('period_end', todayStr);
      }

      toast.success('Lead added successfully!');
      onOpenChange(false);
      if (onLeadCreated) onLeadCreated();

      // Reset the form
      resetForm();
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyName("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setSource("");
    setStatus("new");
    setNotes("");
    setCurrency("USD");
    setEstimatedRevenue("");
    setLeadDate(new Date().toISOString().split("T")[0]);
    setSelectedClient(null);
    setShowCustomStatus(false);
    setShowCustomSource(false);
    setNewStatusValue("");
    setNewSourceValue("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-full px-2 py-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <ClientSearchInput
                value={companyName}
                onValueChange={setCompanyName}
                onClientSelect={handleClientSelect}
                placeholder="Search existing clients or type to add new..."
              />
              {selectedClient && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Existing Client</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClientSelect(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="w-full text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="w-full text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="w-full text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadDate">Lead Date</Label>
              <Input
                id="leadDate"
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                required
                className="w-full text-sm sm:text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full text-sm sm:text-base">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg max-h-60">
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code} className="text-sm sm:text-base">
                        {curr.symbol} {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedRevenue">Estimated Revenue</Label>
                <Input
                  id="estimatedRevenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedRevenue}
                  onChange={(e) => setEstimatedRevenue(e.target.value)}
                  required
                  placeholder="0.00"
                  className="w-full text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="source">Lead Source</Label>
                {showCustomSource && newSourceValue && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addSourceOption.mutate(newSourceValue)}
                    disabled={addSourceOption.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add "{newSourceValue}"
                  </Button>
                )}
              </div>
              <Select 
                value={source} 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomSource(true);
                    setNewSourceValue("");
                  } else {
                    setSource(value);
                    setShowCustomSource(false);
                  }
                }}
                required
              >
                <SelectTrigger className="w-full text-sm sm:text-base">
                  <SelectValue placeholder="Select lead source" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg">
                  {sourceOptions?.map((option) => (
                    <SelectItem key={option.id} value={option.value} className="text-sm sm:text-base">
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-sm sm:text-base font-medium">
                    + Add New Source
                  </SelectItem>
                </SelectContent>
              </Select>
              {showCustomSource && (
                <Input
                  placeholder="Enter new source name"
                  value={newSourceValue}
                  onChange={(e) => setNewSourceValue(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="status">Status</Label>
                {showCustomStatus && newStatusValue && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => addStatusOption.mutate(newStatusValue)}
                    disabled={addStatusOption.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add "{newStatusValue}"
                  </Button>
                )}
              </div>
              <Select 
                value={status} 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setShowCustomStatus(true);
                    setNewStatusValue("");
                  } else {
                    setStatus(value as typeof status);
                    setShowCustomStatus(false);
                  }
                }}
              >
                <SelectTrigger className="w-full text-sm sm:text-base">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg">
                  {statusOptions?.map((option) => (
                    <SelectItem key={option.id} value={option.value} className="text-sm sm:text-base">
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-sm sm:text-base font-medium">
                    + Add New Status
                  </SelectItem>
                </SelectContent>
              </Select>
              {showCustomStatus && (
                <Input
                  placeholder="Enter new status name"
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="w-full text-sm sm:text-base min-h-[80px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Saving..." : "Add Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddClientForm
        open={showAddClient}
        onOpenChange={setShowAddClient}
        initialCompanyName={companyName}
        onClientCreated={(client) => {
          handleClientSelect(client);
          setShowAddClient(false);
        }}
      />
    </>
  );
};
