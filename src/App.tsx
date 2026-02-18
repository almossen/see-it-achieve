import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { FavoritesProvider } from "@/hooks/useFavorites";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import MembersPage from "./pages/admin/MembersPage";
import DriversPage from "./pages/admin/DriversPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ProductsPage from "./pages/admin/ProductsPage";
import OrdersPage from "./pages/admin/OrdersPage";
import SettingsPage from "./pages/admin/SettingsPage";
import ElderLayout from "./layouts/ElderLayout";
import ElderHome from "./pages/elder/ElderHome";
import ElderCategory from "./pages/elder/ElderCategory";
import ElderFavorites from "./pages/elder/ElderFavorites";
import ElderCart from "./pages/elder/ElderCart";
import ElderOrders from "./pages/elder/ElderOrders";
import DriverLayout from "./layouts/DriverLayout";
import DriverHome from "./pages/driver/DriverHome";
import DriverOrderProcess from "./pages/driver/DriverOrderProcess";
import DriverCompleted from "./pages/driver/DriverCompleted";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="members" element={<MembersPage />} />
                  <Route path="drivers" element={<DriversPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="/elder" element={<ElderLayout />}>
                  <Route index element={<ElderHome />} />
                  <Route path="category/:categoryId" element={<ElderCategory />} />
                  <Route path="favorites" element={<ElderFavorites />} />
                  <Route path="cart" element={<ElderCart />} />
                  <Route path="orders" element={<ElderOrders />} />
                </Route>
                <Route path="/driver" element={<DriverLayout />}>
                  <Route index element={<DriverHome />} />
                  <Route path="order/:orderId" element={<DriverOrderProcess />} />
                  <Route path="completed" element={<DriverCompleted />} />
                </Route>
                <Route path="/dashboard" element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
