import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, FileText, Settings, Building2, Puzzle } from "lucide-react";
import { clearAuth, getUserName } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { label: "Analysis", path: "/analysis", icon: Plus },
  { label: "Deals", path: "/deals", icon: FileText },
  { label: "Extension", path: "/extension", icon: Puzzle },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const userName = getUserName();
  const handleSignOut = () => { clearAuth(); navigate("/login"); };
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
        {userName && <span className="text-xs text-nav-foreground/40">{userName}</span>}
        <span className="text-xs text-nav-foreground/30">v3.0</span>
        <button onClick={handleSignOut} className="text-xs text-nav-foreground/50 hover:text-nav-foreground/80 transition-colors duration-150">Sign out</button>
      </div>
    </nav>
  );
}
