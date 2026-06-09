import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import axios from 'axios';

const ALL_ROLES = ['Donor', 'Creator', 'Admin'];

const ROLE_DESCRIPTIONS = {
    Donor: 'Fund campaigns & vote on milestones',
    Creator: 'Create campaigns & receive funding',
    Admin: 'Manage platform & approve creators',
};

const DASHBOARDS = {
    Donor: '/donor/dashboard',
    Creator: '/creator/dashboard',
    Admin: '/admin',
};

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const from = location.state?.from?.pathname || null;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [activeRole, setActiveRole] = useState('Donor');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const [tempToken, setTempToken] = useState(null);
    const [googleRoles, setGoogleRoles] = useState([]);
    const [isGoogleFlow, setIsGoogleFlow] = useState(false);

    useEffect(() => {
        const token = searchParams.get('temp_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setTempToken(token);
                setGoogleRoles(payload.roles || ['Donor']);
                setActiveRole(payload.roles?.[0] || 'Donor');
                setIsGoogleFlow(true);
                toast.success('Google login successful! Pick your role to continue.');
            } catch {
                toast.error('Invalid Google token. Please try again.');
            }
        }
    }, [searchParams]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authAPI.login(email, password, activeRole);
            login(data.user);
            toast.success(`Welcome back! Logged in as ${data.user.role}`);
            navigate(from || DASHBOARDS[data.user.role] || '/', { replace: true });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRoleSelect = async () => {
        setLoading(true);
        try {
            const { data } = await axios.post(
                'http://localhost:80/api/auth/google/select-role',
                { temp_token: tempToken, role: activeRole },
                { withCredentials: true }
            );
            login(data.user || { role: activeRole });
            toast.success(`Logged in as ${activeRole}`);
            navigate(data.dashboard, { replace: true });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const availableRoles = isGoogleFlow ? googleRoles : ALL_ROLES;

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="card p-8">

                    {/* Header */}
                    <div className="mb-8">
                        <span className="section-label">Welcome back</span>
                        <h1 className="text-3xl font-display font-bold mt-1">Log in</h1>
                        <p className="text-sm text-[var(--color-text-muted)] mt-2">
                            {isGoogleFlow
                                ? 'Select your role to continue with Google.'
                                : 'Select your role and sign in to continue.'}
                        </p>
                    </div>

                    {/* Role Selector */}
                    <div className="mb-5">
                        <label className="label">Log in as</label>

                        <div
                            className={clsx(
                                'grid gap-2',
                                availableRoles.length === 1 && 'grid-cols-1',
                                availableRoles.length === 2 && 'grid-cols-2',
                                availableRoles.length === 3 && 'grid-cols-3'
                            )}
                        >
                            {availableRoles.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setActiveRole(role)}
                                    disabled={loading}
                                    className={clsx(
                                        'rounded-[var(--radius-btn)] border px-3 py-2.5 text-sm font-semibold transition-all duration-150 text-center',
                                        activeRole === role
                                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-brand-300'
                                    )}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-[var(--color-text-muted)] mt-2">
                            {ROLE_DESCRIPTIONS[activeRole]}
                        </p>
                    </div>

                    {/* Google Flow */}
                    {isGoogleFlow ? (
                        <button
                            onClick={handleGoogleRoleSelect}
                            disabled={loading}
                            className="btn-primary w-full justify-center py-3 text-base"
                        >
                            {loading ? 'Signing in…' : `Continue as ${activeRole}`}
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <>
                            {/* Email Form */}
                            <form onSubmit={handleLogin} className="space-y-5">

                                {/* Email */}
                                <div>
                                    <label className="label">Email address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input pl-10"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="label">Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input pl-10 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2"
                                        >
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                                    {loading ? 'Signing in…' : `Continue as ${activeRole}`}
                                    <ArrowRight size={16} />
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-3 my-5">
                                <div className="flex-1 h-px bg-[var(--color-border)]" />
                                <span className="text-xs text-[var(--color-text-muted)]">or</span>
                                <div className="flex-1 h-px bg-[var(--color-border)]" />
                            </div>

                            {/* Google Button */}
                            <a
                                href="http://localhost:80/api/auth/google"
                                className="flex items-center justify-center gap-3 w-full border border-[var(--color-border)] rounded-[var(--radius-btn)] py-3 text-sm font-semibold hover:bg-[var(--color-bg-subtle)] transition-colors"
                            >
                                <img
                                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                    alt="Google"
                                    className="w-5 h-5"
                                />
                                Continue with Google
                            </a>
                        </>
                    )}

                    {/* Footer */}
                    <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
                        Don&apos;t have an account?{' '}
                        <Link to="/signup" className="text-brand-600 font-semibold hover:underline">
                            Sign up
                        </Link>
                    </p>

                </div>
            </div>
        </div>
    );
}