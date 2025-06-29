import { useAuth } from "@/hooks/useAuth";
import { useUserRole, usePendingConversionsCount, useConversions, useEnrichedConversions } from "@/hooks/useConversions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const ConversionsDebug = () => {
  const { user } = useAuth();
  const { data: userRole, isLoading: roleLoading, error: roleError } = useUserRole();
  const { data: pendingCount, isLoading: countLoading, error: countError } = usePendingConversionsCount();
  const { data: conversions, isLoading: conversionsLoading, error: conversionsError } = useConversions();
  const { data: enrichedConversions, isLoading: enrichedLoading, error: enrichedError } = useEnrichedConversions();

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Conversions Debug Info</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium">User Info:</h4>
          <p>User ID: {user?.id || 'Not logged in'}</p>
          <p>Email: {user?.email || 'N/A'}</p>
        </div>
        
        <div>
          <h4 className="font-medium">User Role:</h4>
          <p>Loading: {roleLoading ? 'Yes' : 'No'}</p>
          <p>Role: {userRole?.role || 'N/A'}</p>
          <p>Can Recommend: {userRole?.canRecommend ? 'Yes' : 'No'}</p>
          <p>Can Approve: {userRole?.canApprove ? 'Yes' : 'No'}</p>
          {roleError && <p className="text-red-500">Role Error: {roleError instanceof Error ? roleError.message : String(roleError)}</p>}
        </div>
        
        <div>
          <h4 className="font-medium">Pending Count:</h4>
          <p>Loading: {countLoading ? 'Yes' : 'No'}</p>
          <p>Count: {pendingCount || 0}</p>
          {countError && <p className="text-red-500">Count Error: {countError instanceof Error ? countError.message : String(countError)}</p>}
        </div>
        
        <div>
          <h4 className="font-medium">Basic Conversions:</h4>
          <p>Loading: {conversionsLoading ? 'Yes' : 'No'}</p>
          <p>Count: {conversions?.length || 0}</p>
          {conversionsError && <p className="text-red-500">Basic Error: {conversionsError instanceof Error ? conversionsError.message : String(conversionsError)}</p>}
        </div>
        
        <div>
          <h4 className="font-medium">Enriched Conversions:</h4>
          <p>Loading: {enrichedLoading ? 'Yes' : 'No'}</p>
          <p>Count: {enrichedConversions?.length || 0}</p>
          {enrichedError && <p className="text-red-500">Enriched Error: {enrichedError instanceof Error ? enrichedError.message : String(enrichedError)}</p>}
        </div>
        
        <div>
          <h4 className="font-medium">Data Status:</h4>
          <p>Basic Data: {conversions ? '✅ Loaded' : '❌ Not loaded'}</p>
          <p>Enriched Data: {enrichedConversions ? '✅ Loaded' : '❌ Not loaded'}</p>
          <p>Display Count: {(enrichedConversions || conversions)?.length || 0}</p>
        </div>
      </div>
      
      {conversions && conversions.length > 0 && (
        <div>
          <h4 className="font-medium">Sample Basic Conversion:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-48">
            {JSON.stringify(conversions[0], null, 2)}
          </pre>
        </div>
      )}
      
      {enrichedConversions && enrichedConversions.length > 0 && (
        <div>
          <h4 className="font-medium">Sample Enriched Conversion:</h4>
          <pre className="text-xs bg-blue-50 p-2 rounded overflow-auto max-h-48">
            {JSON.stringify(enrichedConversions[0], null, 2)}
          </pre>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          size="sm"
        >
          Full Refresh
        </Button>
        <Button 
          onClick={() => {
            // Manual refetch - you can add this later if needed
            console.log('Manual refetch triggered');
          }} 
          variant="outline"
          size="sm"
        >
          Refetch Data
        </Button>
      </div>
    </Card>
  );
};
