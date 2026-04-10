import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { clearAuth, getUserName, getUserEmail } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AccountPanel() {
  const navigate = useNavigate();
  const fullName = getUserName() || "";
  const email = getUserEmail() || "";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  const handleSignOut = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{fullName || "User"}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">First Name</p>
            <p className="mt-1 text-sm text-foreground">{firstName || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Name</p>
            <p className="mt-1 text-sm text-foreground">{lastName || "—"}</p>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
          <p className="mt-1 text-sm text-foreground">{email}</p>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
