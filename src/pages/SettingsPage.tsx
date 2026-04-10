import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssumptionsPanel from "@/components/settings/AssumptionsPanel";
import ExtensionPanel from "@/components/settings/ExtensionPanel";
import AccountPanel from "@/components/settings/AccountPanel";

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "templates";

  return (
    <div className="max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure assumption presets, manage your Chrome extension, and update
          account details.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v })}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="templates">Assumption Templates</TabsTrigger>
          <TabsTrigger value="extension">Chrome Extension</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <AssumptionsPanel />
        </TabsContent>

        <TabsContent value="extension">
          <ExtensionPanel />
        </TabsContent>

        <TabsContent value="account">
          <AccountPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
