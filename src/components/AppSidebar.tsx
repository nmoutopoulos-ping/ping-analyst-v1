import { Plus, FileText, Settings, MapPin, Puzzle, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  { title: "Assumptions", url: "/settings", icon: Settings },
  { title: "Extension", url: "/extension", icon: Puzzle },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="flex flex-col">
      <SidebarContent className="flex-1 pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
