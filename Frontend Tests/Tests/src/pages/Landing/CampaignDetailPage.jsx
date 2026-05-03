import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Target, Heart, HeartOff, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { campaignAPI, milestoneAPI, paymentAPI, voteAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, daysLeft, fundingPercent, statusColor, milestoneStatusColor } from '../../utils/helpers';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function CampaignDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [campaign, setCampaign] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followed, setFollowed] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState(null);
    const [donateAmount, setDonateAmount] = useState('');
    const [donating, setDonating] = useState(false);
    const [voteResults, setVoteResults] = useState({});

    useEffect(() => {
        async function load() {
            try {
                const [campRes, msRes, mediaRes] = await Promise.all([
                    campaignAPI.getById(id),
                    milestoneAPI.getByCampaign(id),
                    campaignAPI.getMedia(id),
                ]);
                setCampaign(campRes.data);
                setMilestones(Array.isArray(msRes.data) ? msRes.data : []);
                setMedia(Array.isArray(mediaRes.data) ? mediaRes.data : []);

                // Load vote results for each milestone
                const results = {};
                for (const ms of (Array.isArray(msRes.data) ? msRes.data : [])) {
                    if (ms.status === 'UnderReview' || ms.status === 'Approved') {
                        try {
                            const vr = await voteAPI.getResults(ms.id);
                            results[ms.id] = vr.data;
                        } catch { /* no votes yet */ }
                    }
                }
                setVoteResults(results);
            } catch (err) {
                toast.error('Campaign not found');
                navigate('/campaigns');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id, navigate]);

    const handleFollow = async () => {
        if (!user) { toast('Log in to follow campaigns', { icon: '🔐' }); navigate('/login'); return; }
        try {
            if (followed) {
                await campaignAPI.unfollow(id);
                setFollowed(false);
                toast.success('Unfollowed campaign');
            } else {
                await campaignAPI.follow(id);
                setFollowed(true);
                toast.success('Campaign followed!');
            }
        } catch (err) { toast.error(err.message); }
    };

    const handleDonate = async () => {
        if (!user) { toast('Log in to donate', { icon: '🔐' }); navigate('/login'); return; }
        if (!selectedMilestone) { toast.error('Select a milestone to donate to'); return; }
        if (!donateAmount || parseFloat(donateAmount) <= 0) { toast.error('Enter a valid amount'); return; }

        setDonating(true);
        try {
            const { data } = await paymentAPI.donate(selectedMilestone.id, parseFloat(donateAmount));
            const stripe = await stripePromise;
            if (!stripe) { toast.error('Payment system unavailable. Check Stripe key.'); return; }
            const { error } = await stripe.confirmCardPayment(data.clientSecret);
            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Donation successful! Thank you 💚');
                setDonateAmount('');
                setSelectedMilestone(null);
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDonating(false);
        }
    };

    const handleVote = async (milestoneId, vote) => {
        if (!user) { navigate('/login'); return; }
        try {
            await voteAPI.cast(milestoneId, vote);
            toast.success(`Vote cast: ${vote ? 'Yes ✅' : 'No ❌'}`);
            // Refresh vote results
            const vr = await voteAPI.getResults(milestoneId);
            setVoteResults((prev) => ({ ...prev, [milestoneId]: vr.data }));
        } catch (err) { toast.error(err.message); }
    };

    if (loading) {
        return (
            <div className="page-container py-12">
                <div className="animate-pulse space-y-4">
                    <div className="h-64 bg-[var(--color-surface-3)] rounded-2xl" />
                    <div className="h-8 bg-[var(--color-surface-3)] rounded w-2/3" />
                    <div className="h-4 bg-[var(--color-surface-3)] rounded w-full" />
                </div>
            </div>
        );
    }

    if (!campaign) return null;

    const raised = campaign.raised_amount ?? 0;
    const percent = fundingPercent(raised, campaign.total_goal);
    const days = daysLeft(campaign.deadline);
    const coverImg = media.find((m) => m.media_type === 'image');

    return (
        <div className="page-container py-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Cover image */}
                    <div className="aspect-[16/9] bg-[var(--color-surface-3)] rounded-2xl overflow-hidden">
                        {coverImg ? (
                            <img src={`${API_BASE}${coverImg.url}`} alt={campaign.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Target size={48} className="text-[var(--color-text-muted)]" />
                            </div>
                        )}
                    </div>

                    {/* Title & category */}
                    <div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {campaign.category_name && (
                                <span className="badge bg-brand-50 text-brand-700">{campaign.category_name}</span>
                            )}
                            <span className={clsx('badge', statusColor(campaign.status))}>{campaign.status}</span>
                        </div>
                        <h1 className="font-display font-bold text-3xl mb-3">{campaign.title}</h1>
                        <p className="text-[var(--color-text-secondary)] leading-relaxed">{campaign.description}</p>
                    </div>

                    {/* Milestones */}
                    <div>
                        <h2 className="font-display font-bold text-xl mb-4">Milestones</h2>
                        {milestones.length === 0 ? (
                            <p className="text-[var(--color-text-muted)] text-sm">No milestones added yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {milestones.map((ms) => {
                                    const vr = voteResults[ms.id];
                                    return (
                                        <div
                                            key={ms.id}
                                            className={clsx(
                                                'card p-5 cursor-pointer transition-all',
                                                selectedMilestone?.id === ms.id && 'ring-2 ring-brand-500'
                                            )}
                                            onClick={() => setSelectedMilestone(ms.id === selectedMilestone?.id ? null : ms)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={clsx('badge text-xs', milestoneStatusColor(ms.status))}>
                                                            {ms.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold text-sm">{ms.title}</h3>
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{ms.description}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-bold text-brand-600 text-sm">{formatCurrency(ms.target_amount)}</p>
                                                    <p className="text-xs text-[var(--color-text-muted)]">{daysLeft(ms.deadline)}d left</p>
                                                </div>
                                            </div>

                                            {/* Vote section for UnderReview milestones */}
                                            {ms.status === 'UnderReview' && user?.role === 'Donor' && (
                                                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                                                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
                                                        Vote on milestone completion:
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleVote(ms.id, true); }}
                                                            className="btn-primary py-1.5 px-4 text-xs gap-1.5"
                                                        >
                                                            <CheckCircle size={13} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleVote(ms.id, false); }}
                                                            className="btn-secondary py-1.5 px-4 text-xs gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                                                        >
                                                            <AlertCircle size={13} /> Reject
                                                        </button>
                                                    </div>
                                                    {vr && (
                                                        <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                                            Yes: {vr.yes_count ?? 0} · No: {vr.no_count ?? 0}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: sidebar */}
                <div className="space-y-5">
                    {/* Funding progress card */}
                    <div className="card p-6">
                        <p className="font-display font-bold text-2xl text-brand-600">{formatCurrency(raised)}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mb-3">
                            raised of {formatCurrency(campaign.total_goal)} goal
                        </p>
                        <div className="progress-bar mb-2">
                            <div className="progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-5">
                            <span>{percent}% funded</span>
                            <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {days > 0 ? `${days} days left` : 'Ended'}
                            </span>
                        </div>

                        {/* Donate */}
                        {campaign.status === 'Active' && (
                            <>
                                {selectedMilestone && (
                                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-3 text-xs">
                                        <p className="text-brand-700 font-semibold">Donating to:</p>
                                        <p className="text-brand-600">{selectedMilestone.title}</p>
                                    </div>
                                )}
                                <div className="relative mb-3">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm font-medium">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={donateAmount}
                                        onChange={(e) => setDonateAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="input pl-7"
                                    />
                                </div>
                                {!selectedMilestone && (
                                    <p className="text-xs text-[var(--color-text-muted)] mb-3">
                                        ↑ Select a milestone above to donate
                                    </p>
                                )}
                                <button
                                    onClick={handleDonate}
                                    disabled={donating || !selectedMilestone}
                                    className="btn-primary w-full justify-center py-3"
                                >
                                    {donating ? 'Processing…' : 'Donate Now'}
                                </button>
                            </>
                        )}

                        {/* Follow button */}
                        <button onClick={handleFollow} className="btn-secondary w-full justify-center py-2.5 mt-3 gap-2">
                            {followed ? <HeartOff size={15} /> : <Heart size={15} />}
                            {followed ? 'Unfollow' : 'Follow Campaign'}
                        </button>
                    </div>

                    {/* Quick stats */}
                    <div className="card p-5 space-y-3">
                        <p className="section-label">Campaign Info</p>
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-text-muted)]">Goal</span>
                            <span className="font-semibold">{formatCurrency(campaign.total_goal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-text-muted)]">Deadline</span>
                            <span className="font-semibold">{new Date(campaign.deadline).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-text-muted)]">Milestones</span>
                            <span className="font-semibold">{milestones.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
