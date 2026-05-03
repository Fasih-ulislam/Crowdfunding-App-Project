import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { campaignAPI } from '../../api';
import CampaignCard from '../../components/common/CampaignCard';
import clsx from 'clsx';

const STATUSES = ['All', 'Active', 'Funded', 'PendingApproval'];

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('Active');

    useEffect(() => {
        campaignAPI.getCategories()
            .then(({ data }) => setCategories(data || []))
            .catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;
        if (selectedCategory) params.category_id = selectedCategory;

        campaignAPI.getAll(params)
            .then(({ data }) => setCampaigns(Array.isArray(data) ? data : []))
            .catch(() => setCampaigns([]))
            .finally(() => setLoading(false));
    }, [selectedStatus, selectedCategory]);

    const filtered = campaigns.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-container py-10">
            {/* Hero banner */}
            <div className="bg-[var(--color-footer-bg)] rounded-2xl p-8 md:p-12 mb-10 relative overflow-hidden">
                <span className="section-label text-brand-400">Live Now</span>
                <h1 className="font-display font-bold text-3xl md:text-5xl text-white mt-2 mb-3">
                    Active Campaigns
                </h1>
                <p className="text-white/60 text-sm max-w-md">
                    Support a cause today. Every contribution moves the needle.
                </p>
                {/* Decorative circle */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-white/10 hidden md:block" />
                <div className="absolute right-20 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/10 hidden md:block" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search campaigns…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10"
                    />
                </div>

                {/* Category filter */}
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input w-auto min-w-[160px]"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Status tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
                {STATUSES.map((s) => (
                    <button
                        key={s}
                        onClick={() => setSelectedStatus(s)}
                        className={clsx(
                            'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                            selectedStatus === s
                                ? 'bg-brand-500 text-white'
                                : 'bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                        )}
                    >
                        {s}
                    </button>
                ))}
                <span className="ml-auto text-xs text-[var(--color-text-muted)] self-center">
                    {filtered.length} campaigns
                </span>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card h-72 animate-pulse bg-[var(--color-surface-3)]" />
                    ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((c) => (
                        <CampaignCard key={c.id} campaign={c} linkBase="/campaigns" />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Filter size={32} className="mx-auto text-[var(--color-text-muted)] mb-3" />
                    <p className="text-[var(--color-text-secondary)] font-medium">No campaigns found</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Try adjusting your filters</p>
                </div>
            )}
        </div>
    );
}
