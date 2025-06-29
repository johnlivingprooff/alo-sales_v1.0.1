import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a client with the given company name already exists
 * @param companyName - The company name to check
 * @param userId - The user ID (optional, for user-specific checks)
 * @returns Promise<{ exists: boolean, client?: any }>
 */
export async function checkClientExists(companyName: string, userId?: string) {
  if (!companyName || companyName.trim().length === 0) {
    return { exists: false };
  }

  try {
    // Normalize the company name for comparison
    const normalizedName = companyName.trim().toLowerCase();

    const query = supabase
      .from('clients')
      .select('id, company_name, contact_person, email, created_by')
      .ilike('company_name', normalizedName);

    // If userId is provided, we can optionally check globally or per user
    // For now, we'll check globally to prevent any duplicates across the system
    
    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error checking for duplicate client:', error);
      // If there's an error, we'll allow the creation to proceed
      // to avoid blocking legitimate operations
      return { exists: false };
    }

    if (data && data.length > 0) {
      return { 
        exists: true, 
        client: data[0] 
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error in checkClientExists:', error);
    // Return false to allow creation if there's an unexpected error
    return { exists: false };
  }
}

/**
 * Validate and create client if it doesn't exist
 * @param clientData - The client data to create
 * @param options - Options for handling duplicates
 * @returns Promise<{ success: boolean, client?: any, isDuplicate?: boolean, error?: string }>
 */
export async function createClientSafely(
  clientData: {
    created_by: string;
    company_name: string;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    industry?: string | null;
    notes?: string | null;
  },
  options: {
    skipDuplicateCheck?: boolean;
    updateIfExists?: boolean;
    returnExistingIfDuplicate?: boolean;
  } = {}
) {
  const { 
    skipDuplicateCheck = false, 
    updateIfExists = false, 
    returnExistingIfDuplicate = true 
  } = options;

  try {
    // Check for duplicates unless explicitly skipped
    if (!skipDuplicateCheck) {
      const duplicateCheck = await checkClientExists(clientData.company_name, clientData.created_by);
      
      if (duplicateCheck.exists && duplicateCheck.client) {
        if (updateIfExists) {
          // Update the existing client
          const { data: updatedClient, error: updateError } = await supabase
            .from('clients')
            .update({
              contact_person: clientData.contact_person,
              email: clientData.email,
              phone: clientData.phone,
              address: clientData.address,
              industry: clientData.industry,
              notes: clientData.notes,
              updated_at: new Date().toISOString()
            })
            .eq('id', duplicateCheck.client.id)
            .select()
            .single();

          if (updateError) {
            return { 
              success: false, 
              error: `Failed to update existing client: ${updateError.message}`,
              isDuplicate: true 
            };
          }

          return { 
            success: true, 
            client: updatedClient, 
            isDuplicate: true 
          };
        } else if (returnExistingIfDuplicate) {
          // Return the existing client
          return { 
            success: true, 
            client: duplicateCheck.client, 
            isDuplicate: true 
          };
        } else {
          // Block creation due to duplicate
          return { 
            success: false, 
            error: `A client with the name "${clientData.company_name}" already exists`,
            isDuplicate: true,
            client: duplicateCheck.client
          };
        }
      }
    }

    // Create new client
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (createError) {
      return { 
        success: false, 
        error: `Failed to create client: ${createError.message}` 
      };
    }

    return { 
      success: true, 
      client: newClient, 
      isDuplicate: false 
    };
  } catch (error) {
    console.error('Error in createClientSafely:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
