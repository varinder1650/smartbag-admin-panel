import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  LogOut,
  Menu,
  Tag,
  FolderTree,
  CircleHelp,
  LightbulbIcon,
  Store,
  Bell,
  Activity,
  Warehouse,
  Building2,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { useConnectionStore } from "@/store/connectionStore";
import { ConnectionIndicator } from "@/components/ui/connection-indicator";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { wsService } from "@/services/websocket";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Marketing",
    href: "/dashboard/marketing",
    icon: Megaphone,
  },
  {
    name: "Products",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    name: "Brands",
    href: "/dashboard/brands",
    icon: Tag,
  },
  {
    name: "Categories", 
    href: "/dashboard/categories",
    icon: FolderTree,
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    name: "Help & Suggestions",
    href: "/dashboard/help",
    icon: CircleHelp,
  },
  {
    name: "Product Requests",
    href: "/dashboard/requests",
    icon: LightbulbIcon,
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    name: "Discount Coupons",
    href: "/dashboard/discount",
    icon: Users,
  },
  {
    name: "Warehouses",
    href: "/dashboard/warehouses",
    icon: Warehouse,
  },
  {
    name: "Hubs",
    href: "/dashboard/hubs",
    icon: Building2,
  },
  {
    name: "Inv. Warehouses",
    href: "/dashboard/warehouses-pg",
    icon: Warehouse,
  },
  {
    name: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
  },
  {
    name: "Pincodes",
    href: "/dashboard/pincodes",
    icon: Users,
  },
  {
    name: "Pricing",
    href: "/dashboard/pricing",
    icon: DollarSign,
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    name: "Monitoring",
    href: "/dashboard/monitoring",
    icon: Activity,
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isConnected } = useConnectionStore();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  
  // ✅ Shop status states
  const [shopOpen, setShopOpen] = useState(true);
  const [loadingShopStatus, setLoadingShopStatus] = useState(false);

  // ✅ Fetch shop status when WebSocket connects
  useEffect(() => {
    if (wsService.isConnected()) {
      // Wait a bit for connection to stabilize
      setTimeout(() => {
        fetchShopStatus();
      }, 500);
    }
  }, [isConnected]);

  // ✅ Fetch current shop status via WebSocket
  const fetchShopStatus = () => {
    if (!wsService.isConnected()) {
      return;
    }

    try {
      wsService.send({
        type: 'get_shop_status'
      });
    } catch (error) {
      // silently ignore
    }
  };

  // ✅ Register message handlers with wsService
  useEffect(() => {
    const handleShopStatusMessages = (message: any) => {
      // Handle shop status response
      if (message.type === 'shop_status') {
        setShopOpen(message.is_open);
        setLoadingShopStatus(false);
      } 
      // Handle shop status update confirmation
      else if (message.type === 'shop_status_updated') {
        setShopOpen(message.is_open);
        setLoadingShopStatus(false);
        
        toast({
          title: message.is_open ? "Shop Opened ✅" : "Shop Closed 🔒",
          description: message.message || `Shop is now ${message.is_open ? 'open' : 'closed'}`,
        });
      }
      // Handle broadcast status changes from other admins
      else if (message.type === 'shop_status_changed') {
        setShopOpen(message.is_open);
        
        toast({
          title: "Shop Status Changed",
          description: message.message || `Shop is now ${message.is_open ? 'open' : 'closed'}`,
        });
      }
      // Handle errors
      else if (message.type === 'error' && loadingShopStatus) {
        setLoadingShopStatus(false);
        
        toast({
          title: "Error",
          description: message.message || "Failed to update shop status",
          variant: "destructive",
        });
      }
    };

    wsService.onMessage('*', handleShopStatusMessages);

    // No cleanup needed - wsService manages handlers internally
  }, [toast, loadingShopStatus]);

  // ✅ Handle shop status toggle via WebSocket
  const handleShopToggle = async (checked: boolean) => {
    if (!wsService.isConnected()) {
      toast({
        title: "Error",
        description: "Not connected to server. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setLoadingShopStatus(true);

    try {
      const message = {
        type: 'update_shop_status',
        data: {
          is_open: checked,
          reason: checked ? null : 'Manually closed by admin',
          reopen_time: null,
        }
      };
      
      wsService.send(message);

      // Optimistic update
      setShopOpen(checked);
      
      // Set timeout to reset loading if no response in 5 seconds
      setTimeout(() => {
        if (loadingShopStatus) {
          setLoadingShopStatus(false);
        }
      }, 5000);
      
    } catch (error) {
      setLoadingShopStatus(false);
      setShopOpen(!checked); // Revert
      
      toast({
        title: "Error",
        description: "Failed to send update. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <h1 className="text-xl font-bold text-sidebar-foreground">Admin Dashboard</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* ✅ Shop Status Toggle - Expanded */}
      {!collapsed && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/50">
            <div className="flex items-center gap-2">
              <Store className={cn(
                "h-5 w-5 transition-colors",
                shopOpen ? "text-green-600" : "text-red-600"
              )} />
              <div>
                <p className="text-sm font-medium text-sidebar-foreground">
                  Shop Status
                </p>
                <p className={cn(
                  "text-xs font-semibold",
                  shopOpen ? "text-green-600" : "text-red-600"
                )}>
                  {loadingShopStatus ? 'Updating...' : (shopOpen ? '🟢 Open' : '🔴 Closed')}
                </p>
              </div>
            </div>
            <Switch
              checked={shopOpen}
              onCheckedChange={handleShopToggle}
              disabled={loadingShopStatus || !isConnected}
            />
          </div>
        </div>
      )}

      {/* ✅ Shop Status Toggle - Collapsed */}
      {collapsed && (
        <div className="p-4 border-b border-sidebar-border flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="relative group"
            title={`Shop is ${shopOpen ? 'Open' : 'Closed'}`}
          >
            <Store className={cn(
              "h-6 w-6 transition-colors",
              shopOpen ? "text-green-600" : "text-red-600"
            )} />
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-sidebar",
              shopOpen ? "bg-green-600 animate-pulse" : "bg-red-600 animate-pulse"
            )} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-sidebar-border space-y-4">
        <ConnectionIndicator isConnected={isConnected} />
        
        {!collapsed && user && (
          <div className="text-sm text-sidebar-foreground">
            <p className="font-medium">{user.name}</p>
            <p className="text-sidebar-foreground/70">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  );
}