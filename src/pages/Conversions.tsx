import { ConversionsManagement } from "@/components/ConversionsManagement";
// import { ConversionsDebug } from "@/components/ConversionsDebug";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Navigation } from "@/components/Navigation";

export const ConversionsPage = () => {
  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales Conversions</h1>
          {/* <NotificationCenter /> */}
        </div>
        
        {/* <ConversionsDebug /> */}
        <ConversionsManagement />
      </div>
    </>
  );
};
