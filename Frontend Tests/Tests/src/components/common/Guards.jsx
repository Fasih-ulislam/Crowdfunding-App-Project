import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Spinner shown while session is being checked
function Spinner() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
    );
}

// Requires user to be logged in
export function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
}

// Requires user to have a specific role
export function RoleRoute({ children, role }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    if (user.role !== role) return <Navigate to="/" replace />;
    return children;
}

// Redirect already-logged-in users away from auth pages
export function GuestRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <Spinner />;
    if (user) {
        // Redirect to the right dashboard
        const paths = { Donor: '/donor/dashboard', Creator: '/creator/dashboard', Admin: '/admin' };
        return <Navigate to={paths[user.role] || '/'} replace />;
    }
    return children;
}
