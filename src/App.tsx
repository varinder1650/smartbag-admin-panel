import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { wsService } from "@/services/websocket";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Brands from "./pages/Brands";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Help from './pages/Help';
import Requests from './pages/Requests';
import DiscountCoupons from "./pages/Discount";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import NotificationsPage from "@/pages/Notifications";
import PincodesPage from "./pages/Pincodes";
import Monitoring from "./pages/Monitoring";
import WarehousesPage from "./pages/Warehouses";
import HubsPage from "./pages/Hubs";
import WarehousesPgPage from "./pages/WarehousesPg";
import InventoryMgmtPage from "./pages/InventoryMgmt";

const AppContent = () => {
  const { isAuthenticated, user } = useAuthStore();

  useSessionTimeout(30);

  const connectingRef = useRef(false);

  // Connect WebSocket once on mount
  useEffect(() => {
    if (connectingRef.current) return;
    connectingRef.current = true;

    wsService.connect()
      .then(() => {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
          wsService.send({ type: 'authenticate', payload: { token } });
        }
      })
      .catch(() => {})
      .finally(() => { connectingRef.current = false; });

    return () => {
      if (wsService.isConnected()) {
        wsService.disconnect();
      }
    };
  }, []);

  // Re-authenticate when user logs in (token changes)
  useEffect(() => {
    if (isAuthenticated && user?.token && wsService.isConnected()) {
      wsService.send({ type: 'authenticate', payload: { token: user.token } });
    }
  }, [isAuthenticated, user?.token]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="brands" element={<Brands />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="users" element={<Users />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="discount" element={<DiscountCoupons />} />
        <Route path="help" element={<Help />} />
        <Route path="requests" element={<Requests />} />
        <Route path= "notifications" element= {<NotificationsPage />}/>
        <Route path= "pincodes" element= {<PincodesPage />}/>
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="hubs" element={<HubsPage />} />
        <Route path="warehouses-pg" element={<WarehousesPgPage />} />
        <Route path="inventory" element={<InventoryMgmtPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  </TooltipProvider>
);

export default App;