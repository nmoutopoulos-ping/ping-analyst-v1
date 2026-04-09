import { useState, useEffect } from "react";
import { Plus, FileText, Settings, MapPin, Puzzle, Shield, PanelLeftClose, PanelLeftOpen, BarChart2, FileUp } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Analysis", url: "/analysis", icon: Plus },
  { title: "Deals", url: "/deals", icon: FileText },
  { title: "Comps", url: "/comps", icon: MapPin },
  { title: "Market", url: "/market", icon: BarChart2 },
  { title: "Lease Parser", url: "/lease-parser", icon: FileUp },
  { title: "Assumptions", url: "/settings", icon: Settings },
  { title: "Extension", url: "/extension", icon: Puzzle },
];

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

  useEffect(() => {
    setShowAdmin(isAdmin());
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const allItems = showAdmin
    ? [...navItems, { title: "Admin", url: "/admin", icon: Shield }]
    : navItems;

  return (
    <Sidebar collapsible="icon" className="flex flex-col">
      <SidebarContent className="flex-1 pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={false}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              <span>Collapse sidebar</span>
            </>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
