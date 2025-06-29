import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface ClientSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onClientSelect: (client: Client | null) => void;
  placeholder?: string;
}

export const ClientSearchInput = ({
  value,
  onValueChange,
  onClientSelect,
  placeholder = "Search or add company..."
}: ClientSearchInputProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length >= 1) {
      searchTimeout.current = setTimeout(() => {
        searchClients(value);
      }, 300); // shorter debounce for better UX
    } else {
      setClients([]);
    }

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const searchClients = async (searchTerm: string) => {
    if (!user) {
      setClients([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .or(`company_name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error searching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange(newValue);
    // Always keep dropdown open while typing if there's content
    if (newValue.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
      setClients([]); // Clear clients when input is empty
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown' && !open && value.length > 0) {
      setOpen(true);
    }
  };

  const handleClientSelect = (client: Client) => {
    onValueChange(client.company_name);
    onClientSelect(client);
    setOpen(false);
    setClients([]); // Clear search results after selection
  };

  const handleAddNewClient = () => {
    onClientSelect(null);
    setOpen(false);
    setClients([]); // Clear search results
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pr-10"
        onFocus={() => {
          if (value.length > 0) {
            setOpen(true);
          }
        }}
        onBlur={(e) => {
          // Delay closing to allow for click on dropdown items
          setTimeout(() => {
            // Only close if the focus is not within the container
            if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
              setOpen(false);
            }
          }, 150);
        }}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          <Command>
            <CommandList className="max-h-[200px] overflow-y-auto">
              {loading && (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  Searching clients...
                </div>
              )}
              {!loading && clients.length === 0 && value.length >= 1 && (
                <CommandEmpty>
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-blue-50"
                      onClick={handleAddNewClient}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add "{value}" as new client
                    </Button>
                  </div>
                </CommandEmpty>
              )}
              {!loading && value.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Start typing to search for existing clients...
                </div>
              )}
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.company_name}
                  onSelect={() => handleClientSelect(client)}
                  className="cursor-pointer hover:bg-blue-50 px-3 py-2"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
                >
                  <div className="flex flex-col w-full">
                    <span className="font-medium">{client.company_name}</span>
                    {client.contact_person && (
                      <span className="text-sm text-muted-foreground">{client.contact_person}</span>
                    )}
                    {client.email && (
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    )}
                  </div>
                  <Check className="ml-auto h-4 w-4 opacity-0 group-data-[selected]:opacity-100" />
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
