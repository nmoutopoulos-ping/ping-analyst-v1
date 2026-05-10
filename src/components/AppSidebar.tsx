import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Plus,
  LayoutDashboard,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  CheckSquare,
  FileText,
  BarChart3,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getApiKey } from "@/lib/api";
import { supabaseGetDeals } from "@/lib/supabase";

function isAdmin(): boolean {
  try {
    const token = localStorage.getItem("sb_access_token");
    if (!token) return false;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_metadata?.role === "admin";
  } catch {
    return false;
  }
}

function NavRow({
  to,
  icon: Icon,
  label,
  badge,
  collapsed,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  collapsed: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={label}>
        <NavLink
          to={to}
          className={({ isActive }) =>
            `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span>{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    setShowAdmin(isAdmin());
  }, []);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    supabaseGetDeals(apiKey).then((deals) => {
      setActiveCount(deals.filter((d: any) => d.stage !== "Closed").length);
    }).catch(() => {});
  }, [location.pathname]);

  return (
    <Sidebar collapsible="icon" className="flex flex-col">
      <SidebarContent className="flex-1 pt-4">
        {/* CTA — New Search */}
        <div className={collapsed ? "px-1.5 mb-2" : "px-3 mb-2"}>
          <NavLink
            to="/analysis"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New search</span>}
          </NavLink>
        </div>

        {/* Primary nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavRow to="/deals" icon={LayoutDashboard} label="Deals" badge={activeCount} collapsed={collapsed} />
              <NavRow to="/tasks" icon={CheckSquare} label="Tasks" collapsed={collapsed} />
              <NavRow to="/documents" icon={FileText} label="Documents" collapsed={collapsed} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Research */}
        <SidebarGroup>
          <SidebarGroupLabel>Research</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavRow to="/comps" icon={BarChart3} label="Comps" collapsed={collapsed} />
              <NavRow to="/market" icon={Search} label="Market" collapsed={collapsed} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom-pinned */}
      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
        <SidebarMenu>
          <NavRow to="/settings" icon={SettingsIcon} label="Settings" collapsed={collapsed} />
          {showAdmin && (
            <NavRow to="/admin" icon={Shield} label="Admin" collapsed={collapsed} />
          )}
        </SidebarMenu>

        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
