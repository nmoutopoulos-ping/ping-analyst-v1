import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Plus,
  LayoutDashboard,
  FileText,
  MapPin,
  BarChart2,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
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

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    setShowAdmin(isAdmin());
  }, []);

  // Fetch active deal count
  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    supabaseGetDeals(apiKey).then((deals) => {
      const count = deals.filter((d: any) => d.stage !== "Closed").length;
      setActiveCount(count);
    }).catch(() => {});
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar
      collapsible="icon"
      className="flex flex-col border-r-0"
      style={{ ["--sidebar-background" as any]: "#1E3A5F" }}
    >
      <SidebarContent className="flex-1 pt-4" style={{ background: "#1E3A5F" }}>
        {/* CTA — New Search */}
        <div className={collapsed ? "px-1.5 mb-2" : "px-3 mb-2"}>
          <NavLink
            to="/analysis"
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              boxShadow: "0 2px 8px rgba(59,130,246,0.35)",
            }}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New search</span>}
          </NavLink>
        </div>

        {/* Primary nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/deals")} tooltip="Deals">
                  <NavLink
                    to="/deals"
                    className={({ isActive: active }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-[#294C7A] text-white font-medium"
                          : "text-slate-200 hover:bg-[#294C7A]"
                      }`
                    }
                  >
                    {({ isActive: active }) => (
                      <>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#60A5FA]" />
                        )}
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span>Deals</span>
                            {activeCount > 0 && (
                              <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                                {activeCount}
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/documents") || isActive("/lease-parser")} tooltip="Documents">
                  <NavLink
                    to="/documents"
                    className={({ isActive: active }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-[#294C7A] text-white font-medium"
                          : "text-slate-200 hover:bg-[#294C7A]"
                      }`
                    }
                  >
                    {({ isActive: active }) => (
                      <>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#60A5FA]" />
                        )}
                        <FileText className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Documents</span>}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Research group */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel
              className="px-3 text-[10.5px] uppercase tracking-[0.1em] font-semibold"
              style={{ color: "#64748B" }}
            >
              Research
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/comps")} tooltip="Comps">
                  <NavLink
                    to="/comps"
                    className={({ isActive: active }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-[#294C7A] text-white font-medium"
                          : "text-slate-200 hover:bg-[#294C7A]"
                      }`
                    }
                  >
                    {({ isActive: active }) => (
                      <>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#60A5FA]" />
                        )}
                        <MapPin className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Comps</span>}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/market")} tooltip="Market">
                  <NavLink
                    to="/market"
                    className={({ isActive: active }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-[#294C7A] text-white font-medium"
                          : "text-slate-200 hover:bg-[#294C7A]"
                      }`
                    }
                  >
                    {({ isActive: active }) => (
                      <>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#60A5FA]" />
                        )}
                        <BarChart2 className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Market</span>}
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom-pinned: Settings + collapse */}
      <SidebarFooter
        className="mt-auto p-2"
        style={{ background: "#1E3A5F", borderTop: "1px solid #2A4566" }}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
              <NavLink
                to="/settings"
                className={({ isActive: active }) =>
                  `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-[#294C7A] text-white font-medium"
                      : "text-slate-200 hover:bg-[#294C7A]"
                  }`
                }
              >
                {({ isActive: active }) => (
                  <>
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#60A5FA]" />
                    )}
                    <SettingsIcon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                  </>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {showAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin">
                <NavLink
                  to="/admin"
                  className={({ isActive: active }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-[#294C7A] text-white font-medium"
                        : "text-slate-200 hover:bg-[#294C7A]"
                    }`
                  }
                >
                  {({ isActive: active }) => (
                    <>
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[#60A5FA]" />
                      )}
                      <Shield className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Admin</span>}
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#294C7A] hover:text-slate-200"
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
