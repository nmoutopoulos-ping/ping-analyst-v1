import { Link, useLocation } from "react-router-dom";
import { Plus, FileText, Settings, Building2, MapPin, User } from "lucide-react";
import { getUserName } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { label: "Analysis", path: "/analysis", icon: Plus },
  { label: "Deals", path: "/deals", icon: FileText },
  { label: "Comps", path: "/comps", icon: MapPin },
  { label: "Assumptions", path: "/settings", icon: Settings },
];

export default function TopNav() {
  const location = useLocation();
  const userName = getUserName();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="relative sticky top-0 z-50 flex h-12 items-center bg-nav px-4">
      <Link to="/deals" className="flex items-center gap-2 mr-8">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-nav-muted">
          <Building2 className="h-4 w-4 text-nav-foreground" />
        </div>
        <span className="text-sm font-bold text-nav-foreground">Ping Analyst</span>
      </Link>
      <div className="flex items-center gap-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <Link key={path} to={path} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${isActive(path) ? "bg-nav-muted text-nav-foreground" : "text-nav-foreground/50 hover:text-nav-foreground/80"}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Center - NotificationBell */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <NotificationBell />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="text-xs text-nav-foreground/30">v3.0</span>
        <Link to="/profile" className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 ${isActive("/profile") ? "bg-nav-muted text-nav-foreground" : "text-nav-foreground/50 hover:text-nav-foreground/80"}`}>
          <User className="h-3.5 w-3.5" />
          {userName && <span className="text-xs">{userName}</span>}
        </Link>
      </div>
    </nav>
  );
}
