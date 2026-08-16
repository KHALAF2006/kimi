import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import SmartInvestorLayout from '@/components/SmartInvestorLayout';
import { PreferencesProvider } from '@/lib/preferences';
import { AuthorizationProvider } from '@/lib/AuthorizationContext';
import { ActiveMarketProvider } from '@/lib/MarketContext';
import PermissionGate from '@/components/PermissionGate';
import AppErrorBoundary from '@/components/AppErrorBoundary';

import { lazy, Suspense } from 'react';

const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Courses = lazy(() => import('@/pages/Courses'));
const ApplicationStatus = lazy(() => import('@/pages/ApplicationStatus'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CompanyDetails = lazy(() => import('@/pages/CompanyDetails'));
const Movers = lazy(() => import('@/pages/Movers'));
const Screener = lazy(() => import('@/pages/Screener'));
const SearchScreens = lazy(() => import('@/pages/SearchScreens'));
const Watchlists = lazy(() => import('@/pages/Watchlists'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const Destinations = lazy(() => import('@/pages/Destinations'));
const Profile = lazy(() => import('@/pages/Profile'));
const MarketApplications = lazy(() => import('@/pages/MarketApplications'));
const MessageCenter = lazy(() => import('@/pages/MessageCenter'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SubscriptionsAdmin = lazy(() => import('@/pages/SubscriptionsAdmin'));
const CustomersAdmin = lazy(() => import('@/pages/CustomersAdmin'));
const AccessAdmin = lazy(() => import('@/pages/AccessAdmin'));
const CoursesAdmin = lazy(() => import('@/pages/CoursesAdmin'));
const DataQualityAdmin = lazy(() => import('@/pages/DataQualityAdmin'));
const OperationsAdmin = lazy(() => import('@/pages/OperationsAdmin'));
const AuditAdmin = lazy(() => import('@/pages/AuditAdmin'));
const RolesAdmin = lazy(() => import('@/pages/RolesAdmin'));

const ProtectedProviders = () => (
  <AuthProvider>
    <AuthorizationProvider>
      <ActiveMarketProvider>
        <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />
      </ActiveMarketProvider>
    </AuthorizationProvider>
  </AuthProvider>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" /></div>}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthProvider><Login /></AuthProvider>} />
      <Route path="/register" element={<Register />} />
      <Route path="/application-status" element={<ApplicationStatus />} />
      <Route path="/verify" element={<Navigate to="/application-status" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/courses" element={<Courses />} />
      <Route element={<ProtectedProviders />}>
        <Route element={<SmartInvestorLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/company" element={<CompanyDetails />} />
          <Route path="/movers" element={<Movers />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/search" element={<SearchScreens />} />
          <Route path="/watchlists" element={<Watchlists />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/market-applications" element={<MarketApplications />} />
          <Route path="/messages" element={<MessageCenter />} />
          <Route path="/admin" element={<PermissionGate permission="dashboard.owner.read"><AdminDashboard /></PermissionGate>} />
          <Route path="/admin/subscriptions" element={<PermissionGate permission="subscriptions.read"><SubscriptionsAdmin /></PermissionGate>} />
          <Route path="/admin/customers" element={<PermissionGate permission="customers.masked.read" ownerOnly><CustomersAdmin /></PermissionGate>} />
          <Route path="/admin/access" element={<PermissionGate permission="customers.full.read" ownerOnly><AccessAdmin /></PermissionGate>} />
          <Route path="/admin/courses" element={<PermissionGate permission="settings.manage" ownerOnly><CoursesAdmin /></PermissionGate>} />
          <Route path="/admin/quality" element={<PermissionGate permission="data.quality.manage"><DataQualityAdmin /></PermissionGate>} />
          <Route path="/admin/operations" element={<PermissionGate permission="data.operations.read"><OperationsAdmin /></PermissionGate>} />
          <Route path="/admin/audit" element={<PermissionGate permission="audit.read"><AuditAdmin /></PermissionGate>} />
          <Route path="/admin/roles" element={<PermissionGate permission="roles.manage"><RolesAdmin /></PermissionGate>} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <PreferencesProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppErrorBoundary><AppRoutes /></AppErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </PreferencesProvider>
  )
}

export default App
