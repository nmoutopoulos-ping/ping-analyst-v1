import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <TopNav />
      <div className="flex w-full mt-12">
        <AppSidebar />
        <main className="flex-1 min-h-[calc(100svh-3rem)] overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
