import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import KmyLayout from '@/components/KmyLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyContact from '@/pages/VerifyContact';
import Dashboard from '@/pages/Dashboard';
import CompanyDetails from '@/pages/CompanyDetails';
import Movers from '@/pages/Movers';
import Screener from '@/pages/Screener';
import SearchScreens from '@/pages/SearchScreens';
import Watchlists from '@/pages/Watchlists';
import Alerts from '@/pages/Alerts';
import Destinations from '@/pages/Destinations';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import SubscriptionsAdmin from '@/pages/SubscriptionsAdmin';
import CustomersAdmin from '@/pages/CustomersAdmin';
import DataQualityAdmin from '@/pages/DataQualityAdmin';
import OperationsAdmin from '@/pages/OperationsAdmin';
import AuditAdmin from '@/pages/AuditAdmin';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyContact />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<KmyLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/company" element={<CompanyDetails />} />
          <Route path="/movers" element={<Movers />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/search" element={<SearchScreens />} />
          <Route path="/watchlists" element={<Watchlists />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/destinations" element={<Destinations />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/subscriptions" element={<SubscriptionsAdmin />} />
          <Route path="/admin/customers" element={<CustomersAdmin />} />
          <Route path="/admin/quality" element={<DataQualityAdmin />} />
          <Route path="/admin/operations" element={<OperationsAdmin />} />
          <Route path="/admin/audit" element={<AuditAdmin />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App