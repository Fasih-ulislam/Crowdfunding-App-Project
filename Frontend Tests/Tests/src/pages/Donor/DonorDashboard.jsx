import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, LayoutDashboard, ChevronRight, TrendingUp } from 'lucide-react';
import { campaignAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import CampaignCard from '../../components/common/CampaignCard';
import toast from 'react-hot-toast';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'browse', label: 'Browse Campaigns', icon: BookOpen },
    { id: 'favourites', label: 'Followed', icon: Heart },
];

export default function DonorDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState('overview');
    const [profile, setProfile] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ category: '', sort: 'newest', search: '' });

    useEffect(() => {
        userAPI.getProfile()
            .then(({ data }) => setProfile(data))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (tab !== 'browse' && tab !== 'overview') return;
        setLoading(true);
        const params = { status: 'Active' };
        if (filter.category) params.category_id = filter.category;
        campaignAPI.getAll(params)
            .then(({ data }) => setCampaigns(Array.isArray(data) ? data : []))
            .catch(() => setCampaigns([]))
            .finally(() => setLoading(false));
    }, [tab, filter.category]);

    useEffect(() => {
        campaignAPI.getCategories()
            .then(({ data }) => setCategories(data || []))
            .catch(() => { });
    }, []);

    const filtered = campaigns
        .filter((c) => c.title?.toLowerCase().includes(filter.search.toLowerCase()))
        .sort((a, b) => {
            if (filter.sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (filter.sort === 'goal') return b.total_goal - a.total_goal;
            return 0;
        });

    return (
        <div className="page-container py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <span className="section-label text-brand-600">Donor Portal</span>
                    <h1 className="font-display font-bold text-3xl mt-0.5">
                        Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
                    </h1>
                </div>
                <Link to="/donor/apply-creator" className="btn-secondary text-sm">
                    Become a Creator <ChevronRight size={14} />
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--color-border)] mb-8">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === id
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            }`}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div className="space-y-8">
                    {/* Quick stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="card p-5">
                            <p className="section-label">Trust Score</p>
                            <p className="font-display font-bold text-3xl text-brand-500 mt-1">{user?.trust_score ?? 100}</p>
                        </div>
                        <div className="card p-5">
                            <p className="section-label">Campaigns Followed</p>
                            <p className="font-display font-bold text-3xl mt-1">—</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">Follow feature coming soon</p>
                        </div>
                        <div className="card p-5">
                            <p className="section-label">Total Donated</p>
                            <p className="font-display font-bold text-3xl mt-1">—</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">History feature coming soon</p>
                        </div>
                    </div>

                    {/* Featured campaigns */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-display font-bold text-xl">Active Campaigns</h2>
                            <button onClick={() => setTab('browse')} className="btn-ghost text-sm">
                                Browse all <ChevronRight size={14} />
                            </button>
                        </div>
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                {[1, 2, 3].map((n) => <div key={n} className="card h-64 animate-pulse bg-[var(--color-surface-3)]" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                {campaigns.slice(0, 3).map((c) => (
                                    <CampaignCard key={c.id} campaign={c} linkBase="/campaigns" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Browse Tab */}
            {tab === 'browse' && (
                <div>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <input
                            type="text"
                            placeholder="Search campaigns…"
                            value={filter.search}
                            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                            className="input flex-1"
                        />
                        <select
                            value={filter.category}
                            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
                            className="input w-auto min-w-[150px]"
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <select
                            value={filter.sort}
                            onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value }))}
                            className="input w-auto min-w-[140px]"
                        >
                            <option value="newest">Newest First</option>
                            <option value="goal">Highest Goal</option>
                        </select>
                    </div>

                    <p className="text-xs text-[var(--color-text-muted)] mb-5">{filtered.length} campaigns</p>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="card h-64 animate-pulse bg-[var(--color-surface-3)]" />
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map((c) => (
                                <CampaignCard key={c.id} campaign={c} linkBase="/campaigns" />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-[var(--color-text-muted)]">
                            No campaigns match your filters.
                        </div>
                    )}
                </div>
            )}

            {/* Favourites Tab */}
            {tab === 'favourites' && (
                <div className="text-center py-20">
                    <Heart size={40} className="mx-auto text-[var(--color-text-muted)] mb-4" />
                    <h3 className="font-display font-bold text-xl mb-2">Your followed campaigns</h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6">
                        The followed campaigns endpoint is being built. Follow any campaign from its detail page.
                    </p>
                    <Link to="/campaigns" className="btn-primary">Browse Campaigns</Link>
                </div>
            )}
        </div>
    );
}
