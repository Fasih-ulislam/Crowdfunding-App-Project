import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, PlusCircle, BookOpen, Bell, ChevronRight,
    CheckCircle, AlertCircle, Clock, Wallet
} from 'lucide-react';
import { campaignAPI, milestoneAPI, notificationAPI, paymentAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, daysLeft, statusColor, milestoneStatusColor, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'campaigns', label: 'My Campaigns', icon: BookOpen },
    { id: 'create', label: 'Create Campaign', icon: PlusCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell },
];

const CAMPAIGN_STATUS_OPTS = ['Draft', 'PendingApproval', 'Active', 'Funded', 'Failed'];

function CreateCampaignForm({ categories, onCreated }) {
    const [form, setForm] = useState({
        title: '', description: '', total_goal: '', deadline: '', category_id: '',
    });
    const [mediaFile, setMediaFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await campaignAPI.create({
                ...form,
                total_goal: parseFloat(form.total_goal),
                category_id: parseInt(form.category_id),
            });
            // Upload media if selected
            if (mediaFile) {
                const fd = new FormData();
                fd.append('media', mediaFile);
                await campaignAPI.uploadMedia(data.campaign.id, fd);
            }
            toast.success('Campaign created!');
            onCreated?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-8 max-w-2xl space-y-5">
            <div>
                <label className="label">Campaign title *</label>
                <input required type="text" value={form.title} onChange={set('title')} placeholder="e.g. Help Ali Fight Cancer" className="input" />
            </div>
            <div>
                <label className="label">Description *</label>
                <textarea required rows={4} value={form.description} onChange={set('description')} placeholder="Describe your campaign and why it matters…" className="input resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Total goal (USD) *</label>
                    <input required type="number" min="1" step="0.01" value={form.total_goal} onChange={set('total_goal')} placeholder="5000" className="input" />
                </div>
                <div>
                    <label className="label">Deadline *</label>
                    <input required type="date" value={form.deadline} onChange={set('deadline')} className="input" />
                </div>
            </div>
            <div>
                <label className="label">Category *</label>
                <select required value={form.category_id} onChange={set('category_id')} className="input">
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="label">Cover image (optional)</label>
                <input type="file" accept="image/*,video/*" onChange={(e) => setMediaFile(e.target.files[0])} className="input py-2" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary py-3 px-8 text-base">
                {loading ? 'Creating…' : 'Create Campaign'}
            </button>
        </form>
    );
}

function AddMilestoneModal({ campaign, onClose, onAdded }) {
    const [form, setForm] = useState({ title: '', description: '', target_amount: '', deadline: '' });
    const [loading, setLoading] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await milestoneAPI.create(campaign.id, {
                ...form,
                target_amount: parseFloat(form.target_amount),
            });
            toast.success('Milestone added!');
            onAdded?.();
            onClose?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card p-8 w-full max-w-md">
                <h2 className="font-display font-bold text-xl mb-1">Add Milestone</h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-5">to: {campaign.title}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Title *</label>
                        <input required type="text" value={form.title} onChange={set('title')} placeholder="e.g. Phase 1 — Research" className="input" />
                    </div>
                    <div>
                        <label className="label">Description *</label>
                        <textarea required rows={3} value={form.description} onChange={set('description')} className="input resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Target (USD) *</label>
                            <input required type="number" min="1" value={form.target_amount} onChange={set('target_amount')} className="input" />
                        </div>
                        <div>
                            <label className="label">Deadline *</label>
                            <input required type="date" value={form.deadline} onChange={set('deadline')} className="input" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2.5">
                            {loading ? 'Saving…' : 'Add Milestone'}
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary px-5">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function CreatorDashboard({ defaultTab = 'overview' }) {
    const { user } = useAuth();
    const [tab, setTab] = useState(defaultTab);
    const [campaigns, setCampaigns] = useState([]);
    const [categories, setCategories] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [milestoneMap, setMilestoneMap] = useState({});
    const [expandedCampaign, setExpandedCampaign] = useState(null);
    const [milestoneModalFor, setMilestoneModalFor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [onboarding, setOnboarding] = useState(false);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const { data } = await campaignAPI.getAll({ creator_id: user?.id });
            setCampaigns(Array.isArray(data) ? data : []);
        } catch { setCampaigns([]); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        loadCampaigns();
        campaignAPI.getCategories().then(({ data }) => setCategories(data || [])).catch(() => { });
        notificationAPI.getAll().then(({ data }) => setNotifications(Array.isArray(data) ? data : [])).catch(() => { });
        userAPI.getProfile().then(({ data }) => setProfile(data)).catch(() => { });
    }, []);

    const loadMilestones = async (campaignId) => {
        try {
            const { data } = await milestoneAPI.getByCampaign(campaignId);
            setMilestoneMap((prev) => ({ ...prev, [campaignId]: Array.isArray(data) ? data : [] }));
        } catch { /* no milestones */ }
    };

    const handleExpandCampaign = async (cid) => {
        if (expandedCampaign === cid) { setExpandedCampaign(null); return; }
        setExpandedCampaign(cid);
        if (!milestoneMap[cid]) await loadMilestones(cid);
    };

    const handleSubmitMilestone = async (milestoneId) => {
        try {
            await milestoneAPI.submitForReview(milestoneId);
            toast.success('Milestone submitted for review!');
            if (expandedCampaign) await loadMilestones(expandedCampaign);
        } catch (err) { toast.error(err.message); }
    };

    const handleStripeOnboarding = async () => {
        setOnboarding(true);
        try {
            const { data } = await paymentAPI.startOnboarding();
            window.location.href = data.url;
        } catch (err) {
            toast.error(err.message);
            setOnboarding(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            toast.success('All notifications marked as read');
        } catch (err) { toast.error(err.message); }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <div className="page-container py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <span className="section-label text-brand-600">Creator Studio</span>
                    <h1 className="font-display font-bold text-3xl mt-0.5">
                        {profile?.display_name || 'My Studio'}
                    </h1>
                </div>
                {/* Stripe onboarding CTA */}
                {!profile?.stripe_account_id && (
                    <button onClick={handleStripeOnboarding} disabled={onboarding} className="btn-primary gap-2">
                        <Wallet size={15} />
                        {onboarding ? 'Redirecting…' : 'Setup Payouts'}
                    </button>
                )}
            </div>

            {/* Stripe warning */}
            {!profile?.stripe_account_id && (
                <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-xl p-4 mb-6 flex items-center gap-3">
                    <AlertCircle size={18} className="text-brand-600 shrink-0" />
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Complete Stripe onboarding to receive funds when milestones are approved.
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--color-border)] mb-8">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px relative ${tab === id
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            }`}
                    >
                        <Icon size={15} />
                        {label}
                        {id === 'notifications' && unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="card p-5">
                            <p className="section-label">Total Campaigns</p>
                            <p className="font-display font-bold text-3xl mt-1">{campaigns.length}</p>
                        </div>
                        <div className="card p-5">
                            <p className="section-label">Active</p>
                            <p className="font-display font-bold text-3xl text-brand-500 mt-1">
                                {campaigns.filter((c) => c.status === 'Active').length}
                            </p>
                        </div>
                        <div className="card p-5">
                            <p className="section-label">Unread Notifications</p>
                            <p className="font-display font-bold text-3xl mt-1">{unreadCount}</p>
                        </div>
                    </div>

                    <div>
                        <h2 className="font-display font-bold text-xl mb-4">Recent Campaigns</h2>
                        {campaigns.slice(0, 3).map((c) => (
                            <div key={c.id} className="card p-4 mb-3 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-sm">{c.title}</p>
                                    <span className={clsx('badge text-xs mt-1', statusColor(c.status))}>{c.status}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-brand-600">{formatCurrency(c.total_goal)}</p>
                                    <p className="text-xs text-[var(--color-text-muted)]">{daysLeft(c.deadline)}d left</p>
                                </div>
                            </div>
                        ))}
                        {campaigns.length === 0 && (
                            <div className="text-center py-10 text-[var(--color-text-muted)]">
                                <p className="text-sm">No campaigns yet.</p>
                                <button onClick={() => setTab('create')} className="btn-primary mt-4">
                                    Create your first campaign
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* My Campaigns Tab */}
            {tab === 'campaigns' && (
                <div className="space-y-4">
                    <div className="flex justify-end mb-2">
                        <button onClick={() => setTab('create')} className="btn-primary gap-2">
                            <PlusCircle size={15} /> New Campaign
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => <div key={n} className="card h-20 animate-pulse bg-[var(--color-surface-3)]" />)}
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-16 text-[var(--color-text-muted)]">
                            No campaigns yet. Create one!
                        </div>
                    ) : campaigns.map((c) => (
                        <div key={c.id} className="card overflow-hidden">
                            <button
                                onClick={() => handleExpandCampaign(c.id)}
                                className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-[var(--color-surface-3)] transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={clsx('badge text-xs', statusColor(c.status))}>{c.status}</span>
                                    </div>
                                    <p className="font-semibold text-sm truncate">{c.title}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                        Goal: {formatCurrency(c.total_goal)} · {daysLeft(c.deadline)}d left
                                    </p>
                                </div>
                                <ChevronRight
                                    size={16}
                                    className={clsx(
                                        'text-[var(--color-text-muted)] shrink-0 transition-transform',
                                        expandedCampaign === c.id && 'rotate-90'
                                    )}
                                />
                            </button>

                            {/* Expanded: milestones */}
                            {expandedCampaign === c.id && (
                                <div className="border-t border-[var(--color-border)] p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Milestones</p>
                                        <button
                                            onClick={() => setMilestoneModalFor(c)}
                                            className="btn-secondary text-xs py-1.5 px-3 gap-1"
                                        >
                                            <PlusCircle size={13} /> Add Milestone
                                        </button>
                                    </div>

                                    {!(milestoneMap[c.id]?.length) ? (
                                        <p className="text-xs text-[var(--color-text-muted)]">No milestones yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {milestoneMap[c.id].map((ms) => (
                                                <div key={ms.id} className="bg-[var(--color-surface-3)] rounded-xl p-4 flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={clsx('badge text-xs', milestoneStatusColor(ms.status))}>
                                                                {ms.status}
                                                            </span>
                                                        </div>
                                                        <p className="font-semibold text-sm">{ms.title}</p>
                                                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{ms.description}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-brand-600">{formatCurrency(ms.target_amount)}</p>
                                                        {ms.status === 'Active' && (
                                                            <button
                                                                onClick={() => handleSubmitMilestone(ms.id)}
                                                                className="btn-primary text-xs py-1 px-3 mt-2 gap-1"
                                                            >
                                                                <CheckCircle size={12} /> Submit Review
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Campaign Tab */}
            {tab === 'create' && (
                <CreateCampaignForm
                    categories={categories}
                    onCreated={() => { loadCampaigns(); setTab('campaigns'); }}
                />
            )}

            {/* Notifications Tab */}
            {tab === 'notifications' && (
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-display font-bold text-xl">Notifications</h2>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="btn-ghost text-sm">
                                Mark all read
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="text-center py-16 text-[var(--color-text-muted)]">
                            <Bell size={36} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm">No notifications yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={clsx(
                                        'card p-4 flex items-start gap-3',
                                        !n.is_read && 'border-brand-200 bg-brand-50/30'
                                    )}
                                >
                                    <div className={clsx(
                                        'w-2 h-2 rounded-full mt-2 shrink-0',
                                        n.is_read ? 'bg-[var(--color-border)]' : 'bg-brand-500'
                                    )} />
                                    <div className="flex-1">
                                        <p className="text-sm text-[var(--color-text-primary)]">{n.message || n.content || 'New notification'}</p>
                                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{timeAgo(n.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add milestone modal */}
            {milestoneModalFor && (
                <AddMilestoneModal
                    campaign={milestoneModalFor}
                    onClose={() => setMilestoneModalFor(null)}
                    onAdded={() => loadMilestones(milestoneModalFor.id)}
                />
            )}
        </div>
    );
}
