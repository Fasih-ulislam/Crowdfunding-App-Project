import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, RoleRoute, GuestRoute } from './components/common/Guards';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import SignupPage from './pages/Auth/SignupPage';
import LoginPage from './pages/Auth/LoginPage';
import CampaignsPage from './pages/Landing/CampaignsPage';
import CampaignDetailPage from './pages/Landing/CampaignDetailPage';
import FAQPage from './pages/Landing/FAQPage';

import DonorDashboard from './pages/Donor/DonorDashboard';
import ApplyCreatorPage from './pages/Donor/ApplyCreatorPage';

import CreatorDashboard from './pages/Creator/CreatorDashboard';
import OnboardingStartPage from './pages/Creator/OnboardingStartPage';
import OnboardingCompletePage from './pages/Creator/OnboardingCompletePage';

import AdminDashboard from './pages/Admin/AdminDashboard';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '0.625rem',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout><LandingPage /></Layout>} />
            <Route path="/campaigns" element={<Layout><CampaignsPage /></Layout>} />
            <Route path="/campaigns/:id" element={<Layout><CampaignDetailPage /></Layout>} />
            <Route path="/faq" element={<Layout><FAQPage /></Layout>} />

            {/* Auth routes (guest only) */}
            <Route path="/signup" element={<GuestRoute><Layout><SignupPage /></Layout></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><Layout><LoginPage /></Layout></GuestRoute>} />

            {/* Donor routes */}
            <Route path="/donor/dashboard" element={<RoleRoute role="Donor"><Layout><DonorDashboard /></Layout></RoleRoute>} />
            <Route path="/donor/campaigns" element={<RoleRoute role="Donor"><Layout><CampaignsPage /></Layout></RoleRoute>} />
            <Route path="/donor/apply-creator" element={<RoleRoute role="Donor"><Layout><ApplyCreatorPage /></Layout></RoleRoute>} />

            {/* Creator routes */}
            <Route path="/creator/dashboard" element={<RoleRoute role="Creator"><Layout><CreatorDashboard /></Layout></RoleRoute>} />
            <Route path="/creator/notifications" element={<RoleRoute role="Creator"><Layout><CreatorDashboard defaultTab="notifications" /></Layout></RoleRoute>} />
            <Route path="/onboarding/start" element={<RoleRoute role="Creator"><Layout><OnboardingStartPage /></Layout></RoleRoute>} />
            <Route path="/onboarding/complete" element={<RoleRoute role="Creator"><Layout><OnboardingCompletePage /></Layout></RoleRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<RoleRoute role="Admin"><Layout><AdminDashboard /></Layout></RoleRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="page-container py-24 text-center">
      <p className="font-display font-bold text-6xl text-brand-500 mb-4">404</p>
      <h1 className="font-display font-bold text-2xl mb-2">Page not found</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );
}