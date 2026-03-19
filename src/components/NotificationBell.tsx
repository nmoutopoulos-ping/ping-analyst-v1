import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  const handleClick = async (id: string, searchId: string) => {
    await markAsRead(id);
    navigate(`/deals/${searchId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold" variant="destructive">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3" />Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">You'll be notified when underwriting completes.</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif, idx) => (
                <div key={notif.id}>
                  <button
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 items-start ${!notif.read ? "bg-primary/5" : ""}`}
                    onClick={() => handleClick(notif.id, notif.search_id)}
                  >
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={`h-2 w-2 rounded-full ${!notif.read ? "bg-primary" : "bg-transparent"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!notif.read ? "font-medium" : "text-muted-foreground"}`}>{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(notif.created_at)}</p>
                    </div>
                  </button>
                  {idx < notifications.length - 1 && <Separator className="opacity-50" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => navigate("/deals")}>View all deals →</Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
