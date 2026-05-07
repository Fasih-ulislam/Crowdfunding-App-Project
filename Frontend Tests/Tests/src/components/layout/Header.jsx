import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, LayoutDashboard, BookOpen, Users, Bell, Menu, X, CircleDot, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Header() {
    const { user, logout, isRole } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [exploreOpen, setExploreOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handler(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setExploreOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        navigate('/');
    };

    // Build explore links based on auth state
    const exploreLinks = user
        ? [
            ...(isRole('Donor') ? [
                { to: '/donor/campaigns', icon: BookOpen, label: 'Browse Campaigns' },
                { to: '/donor/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
            ] : []),
            ...(isRole('Creator') ? [
                { to: '/creator/dashboard', icon: LayoutDashboard, label: 'Creator Studio' },
                { to: '/creator/campaigns', icon: BookOpen, label: 'My Campaigns' },
            ] : []),
            ...(isRole('Admin') ? [
                { to: '/admin', icon: Users, label: 'Admin Panel' },
            ] : []),
            { to: '/faq', icon: CircleDot, label: 'FAQ' },
        ]
        : [
            { to: '/campaigns', icon: BookOpen, label: 'Browse Campaigns' },
            { to: '/faq', icon: CircleDot, label: 'FAQ' },
        ];

    return (
        <header className="sticky top-0 z-50 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] transition-colors duration-300">
            <div className="page-container">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-xl text-[var(--color-text-primary)]">
                        <span className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
                            <span className="w-3 h-3 rounded-full bg-white" />
                        </span>
                        TrustFund
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {/* Explore dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setExploreOpen((v) => !v)}
                                className={clsx(
                                    'btn-ghost text-base',
                                    exploreOpen && 'bg-[var(--color-surface-3)]'
                                )}
                            >
                                Explore
                                <ChevronDown
                                    size={16}
                                    className={clsx('transition-transform duration-200', exploreOpen && 'rotate-180')}
                                />
                            </button>

                            {exploreOpen && (
                                <div className="absolute top-full right-0 mt-2 w-52 card p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                    {exploreLinks.map(({ to, icon: Icon, label }) => (
                                        <Link
                                            key={to}
                                            to={to}
                                            onClick={() => setExploreOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] transition-colors"
                                        >
                                            <Icon size={15} className="text-brand-500" />
                                            {label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dark mode toggle */}
                        <button
                            onClick={toggle}
                            className="btn-ghost p-2.5"
                            aria-label="Toggle dark mode"
                            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Right-side actions */}
                        {user ? (
                            <div className="flex items-center gap-2 ml-1">
                                {/* Notification bell — only for Creator */}
                                {isRole('Creator') && (
                                    <Link to="/creator/notifications" className="btn-ghost p-2">
                                        <Bell size={18} />
                                    </Link>
                                )}
                                {/* Role pill */}
                                <span className="badge bg-brand-50 text-brand-700 border border-brand-200 text-xs">
                                    {user.role}
                                </span>
                                {/* Logout */}
                                <button onClick={handleLogout} className="btn-ghost gap-2 text-base text-red-500 hover:bg-red-50 hover:text-red-600">
                                    <LogOut size={15} />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 ml-1">
                                <Link to="/login" className="btn-ghost text-base">Log in</Link>
                                <Link to="/signup" className="btn-primary text-base">Get Started</Link>
                            </div>
                        )}
                    </nav>

                    {/* Mobile: dark toggle + hamburger */}
                    <div className="md:hidden flex items-center gap-1">
                        <button
                            onClick={toggle}
                            className="btn-ghost p-2"
                            aria-label="Toggle dark mode"
                        >
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={() => setMobileOpen((v) => !v)}
                            className="btn-ghost p-2"
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div className="page-container py-3 flex flex-col gap-1">
                        {exploreLinks.map(({ to, icon: Icon, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="flex items-center gap-3 px-3 py-3 rounded-lg text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                            >
                                <Icon size={16} className="text-brand-500" />
                                {label}
                            </Link>
                        ))}
                        <div className="border-t border-[var(--color-border)] mt-2 pt-2">
                            {user ? (
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-base text-red-500 hover:bg-red-50"
                                >
                                    <LogOut size={15} />
                                    Logout
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <Link to="/login" className="btn-secondary flex-1 justify-center text-base">Log in</Link>
                                    <Link to="/signup" className="btn-primary flex-1 justify-center text-base">Sign up</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
