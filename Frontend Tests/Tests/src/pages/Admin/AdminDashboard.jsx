import { useEffect, useState } from 'react';
import { Users, BookOpen, Shield, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { applicationAPI, campaignAPI, milestoneAPI, paymentAPI } from '../../api';
import { formatCurrency, statusColor, milestoneStatusColor, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TABS = [
    { id: 'applications', label: 'Creator Applications', icon: Users },
    { id: 'campaigns', label: 'All Campaigns', icon: BookOpen },
    { id: 'escrow', label: 'Escrow Actions', icon: Shield },
];

export default function AdminDashboard() {
    const [tab, setTab] = useState('applications');
    const [applications, setApplications] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [expandedApp, setExpandedApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    const loadApplications = async () => {
        try {
            const { data } = await applicationAPI.getAll();
            setApplications(Array.isArray(data) ? data : []);
        } catch { setApplications([]); }
    };

    const loadCampaigns = async () => {
        try {
            const { data } = await campaignAPI.getAll();
            setCampaigns(Array.isArray(data) ? data : []);
        } catch { setCampaigns([]); }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([loadApplications(), loadCampaigns()])
            .finally(() => setLoading(false));
    }, []);

    const handleApprove = async (appId, approve) => {
        setActionLoading((p) => ({ ...p, [appId]: true }));
        try {
            await applicationAPI.approveOrReject(appId, approve ? 'Approved' : 'Rejected');
            toast.success(approve ? 'Application approved! User is now a Creator.' : 'Application rejected.');
            await loadApplications();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionLoading((p) => ({ ...p, [appId]: false }));
        }
    };

    const handleEscrowRelease = async (milestoneId) => {
        setActionLoading((p) => ({ ...p, [milestoneId]: true }));
        try {
            await paymentAPI.releaseEscrow(milestoneId);
            toast.success('Escrow released to creator.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionLoading((p) => ({ ...p, [milestoneId]: false }));
        }
    };

    const handleEscrowRefund = async (milestoneId) => {
        setActionLoading((p) => ({ ...p, [`refund-${milestoneId}`]: true }));
        try {
            await paymentAPI.processRefunds(milestoneId);
            toast.success('Refunds processed to donors.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionLoading((p) => ({ ...p, [`refund-${milestoneId}`]: false }));
        }
    };

    const pendingApps = applications.filter((a) => a.status === 'Pending');
    const reviewCampaigns = campaigns.filter((c) => c.status === 'PendingApproval');

    return (
        <div className="page-container py-8">
            <div className="mb-8">
                <span className="section-label text-brand-600">Admin Panel</span>
                <h1 className="font-display font-bold text-3xl mt-0.5">Platform Management</h1>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Pending Applications', value: pendingApps.length, color: 'text-yellow-600' },
                    { label: 'Total Campaigns', value: campaigns.length, color: 'text-brand-600' },
                    { label: 'Awaiting Approval', value: reviewCampaigns.length, color: 'text-orange-600' },
                    { label: 'Total Applications', value: applications.length, color: 'text-[var(--color-text-primary)]' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="card p-5">
                        <p className="section-label">{label}</p>
                        <p className={clsx('font-display font-bold text-3xl mt-1', color)}>{value}</p>
                    </div>
                ))}
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

            {/* Applications Tab */}
            {tab === 'applications' && (
                <div className="space-y-3">
                    <div className="flex gap-3 mb-5">
                        {['All', 'Pending', 'Approved', 'Rejected'].map((s) => (
                            <span key={s} className="text-xs text-[var(--color-text-muted)]">
                                {s}: {s === 'All' ? applications.length : applications.filter((a) => a.status === s).length}
                            </span>
                        ))}
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => <div key={n} className="card h-16 animate-pulse bg-[var(--color-surface-3)]" />)}
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-16 text-[var(--color-text-muted)]">No applications yet.</div>
                    ) : applications.map((app) => (
                        <div key={app.id} className="card overflow-hidden">
                            <button
                                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                                className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-[var(--color-surface-3)] transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={clsx('badge text-xs', {
                                            'bg-yellow-100 text-yellow-700': app.status === 'Pending',
                                            'bg-green-100 text-green-700': app.status === 'Approved',
                                            'bg-red-100 text-red-600': app.status === 'Rejected',
                                        })}>
                                            {app.status}
                                        </span>
                                    </div>
                                    <p className="font-semibold text-sm">{app.work_email || app.email || 'Applicant'}</p>
                                    <p className="text-xs text-[var(--color-text-muted)]">{timeAgo(app.created_at)}</p>
                                </div>
                                {expandedApp === app.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {expandedApp === app.id && (
                                <div className="border-t border-[var(--color-border)] p-5 space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        {[
                                            ['Phone', app.phone],
                                            ['Work Email', app.work_email],
                                            ['Address', app.address],
                                            ['Facebook', app.facebook_url || '—'],
                                            ['Instagram', app.instagram_url || '—'],
                                            ['LinkedIn', app.linkedin_url || '—'],
                                        ].map(([label, value]) => (
                                            <div key={label}>
                                                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                                                <p className="font-medium text-sm break-all">{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {app.status === 'Pending' && (
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => handleApprove(app.id, true)}
                                                disabled={actionLoading[app.id]}
                                                className="btn-primary py-2 px-5 gap-2"
                                            >
                                                <CheckCircle size={14} />
                                                {actionLoading[app.id] ? 'Approving…' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleApprove(app.id, false)}
                                                disabled={actionLoading[app.id]}
                                                className="btn-secondary py-2 px-5 gap-2 text-red-500 border-red-200 hover:bg-red-50"
                                            >
                                                <XCircle size={14} />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Campaigns Tab */}
            {tab === 'campaigns' && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => <div key={n} className="card h-16 animate-pulse bg-[var(--color-surface-3)]" />)}
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-16 text-[var(--color-text-muted)]">No campaigns.</div>
                    ) : campaigns.map((c) => (
                        <div key={c.id} className="card p-5 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={clsx('badge text-xs', statusColor(c.status))}>{c.status}</span>
                                </div>
                                <p className="font-semibold text-sm truncate">{c.title}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Goal: {formatCurrency(c.total_goal)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Escrow Tab */}
            {tab === 'escrow' && (
                <div className="space-y-4">
                    <div className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-xl p-4 flex items-start gap-3 mb-6">
                        <AlertCircle size={18} className="text-brand-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Use these controls carefully. Releasing escrow transfers funds to the creator. Refund processes send money back to donors.
                            These actions are triggered per milestone ID.
                        </p>
                    </div>

                    <EscrowActionForm
                        label="Release Escrow to Creator"
                        description="Trigger after a milestone is voted Approved."
                        action={handleEscrowRelease}
                        actionLabel="Release Funds"
                        loadingKey={actionLoading}
                        loadingKeyPrefix=""
                    />
                    <EscrowActionForm
                        label="Process Refunds to Donors"
                        description="Trigger after a milestone is voted Rejected."
                        action={handleEscrowRefund}
                        actionLabel="Process Refunds"
                        loadingKey={actionLoading}
                        loadingKeyPrefix="refund-"
                    />
                </div>
            )}
        </div>
    );
}

function EscrowActionForm({ label, description, action, actionLabel, loadingKey, loadingKeyPrefix }) {
    const [milestoneId, setMilestoneId] = useState('');
    const key = `${loadingKeyPrefix}${milestoneId}`;

    return (
        <div className="card p-6">
            <h3 className="font-semibold text-sm mb-1">{label}</h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">{description}</p>
            <div className="flex gap-3">
                <input
                    type="text"
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                    placeholder="Milestone UUID"
                    className="input flex-1 font-mono text-xs"
                />
                <button
                    onClick={() => milestoneId && action(milestoneId)}
                    disabled={!milestoneId || loadingKey[key]}
                    className="btn-primary px-5 py-2.5 shrink-0"
                >
                    {loadingKey[key] ? 'Processing…' : actionLabel}
                </button>
            </div>
        </div>
    );
}
