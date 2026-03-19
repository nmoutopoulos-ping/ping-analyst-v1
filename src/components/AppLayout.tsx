import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <TopNav />
      <div className="flex w-full mt-12">
        <AppSidebar />
        <main className="flex-1 min-h-[calc(100svh-3rem)] overflow-auto">
          <div className="flex items-center h-10 px-2 border-b border-border bg-card">
            <SidebarTrigger />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
