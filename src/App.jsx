import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Layouts
import PublicLayout from '@/components/layout/PublicLayout';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Public Pages
import Home from '@/pages/Home';
import Search from '@/pages/Search';
import Rent from '@/pages/Rent';
import Sell from '@/pages/Sell';
import PropertyDetail from '@/pages/PropertyDetail';
import Mortgage from '@/pages/Mortgage';
import HomeValues from '@/pages/HomeValues';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Help from '@/pages/Help';
import FairHousing from '@/pages/FairHousing';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Favorites from '@/pages/Favorites';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';

// Auth Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';

// Dashboard Pages
import Dashboard from '@/pages/dashboard/Dashboard';
import Listings from '@/pages/dashboard/Listings';
import ListingEditor from '@/pages/dashboard/ListingEditor';
import Leads from '@/pages/dashboard/Leads';
import Applications from '@/pages/dashboard/Applications';
import DashboardRequests from '@/pages/dashboard/DashboardRequests';
import Messages from '@/pages/dashboard/Messages';

// Admin Page
import Admin from '@/pages/admin/Admin';

// 404
import PageNotFound from '@/lib/PageNotFound';

function AppRoutes() {
  const { authError } = useAuth() || {};

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* Standalone Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />

      {/* Main Public Website Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/rent" element={<Rent />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/mortgage" element={<Mortgage />} />
        <Route path="/home-values" element={<HomeValues />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/fair-housing" element={<FairHousing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Authenticated Dashboard Routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/listings" element={<Listings />} />
          <Route path="/dashboard/listings/new" element={<ListingEditor />} />
          <Route path="/dashboard/listings/:id/edit" element={<ListingEditor />} />
          <Route path="/dashboard/leads" element={<Leads />} />
          <Route path="/dashboard/applications" element={<Applications />} />
          <Route path="/dashboard/requests" element={<DashboardRequests />} />
          <Route path="/dashboard/messages" element={<Messages />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      {/* Fallback 404 Route */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppRoutes />
          <Toaster />
          <SonnerToaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}
