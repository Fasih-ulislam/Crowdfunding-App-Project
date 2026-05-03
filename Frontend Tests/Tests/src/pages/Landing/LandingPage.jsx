import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Users, TrendingUp } from 'lucide-react';
import { campaignAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import CampaignCard from '../../components/common/CampaignCard';
import toast from 'react-hot-toast';

const WHY_CARDS = [
    {
        icon: Shield,
        title: 'One Platform. Infinite Impact.',
        desc: 'Support causes across the world and help ideas grow beyond limits.',
    },
    {
        icon: Users,
        title: 'Built on Trust, Powered by People',
        desc: 'Transparent campaigns, community that holds each other accountable.',
    },
    {
        icon: TrendingUp,
        title: 'Support Dreams, Not Just Projects',
        desc: 'Every contribution fuels a real person and a real story.',
    },
];

export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);

    useEffect(() => {
        async function fetchFeatured() {
            try {
                const { data } = await campaignAPI.getAll({ status: 'Active' });
                setCampaigns(Array.isArray(data) ? data.slice(0, 3) : []);
            } catch {
                setCampaigns([]);
            } finally {
                setLoadingCampaigns(false);
            }
        }
        fetchFeatured();
    }, []);

    const handleFundNow = () => {
        if (user) {
            navigate('/donor/campaigns');
        } else {
            toast('Please log in to fund a campaign', { icon: '🔐' });
            navigate('/login');
        }
    };

    const handleStartCampaign = () => {
        if (user) {
            if (user.role === 'Creator') navigate('/creator/dashboard');
            else {
                toast('Creator role required. Apply from your dashboard.', { icon: 'ℹ️' });
                navigate('/donor/dashboard');
            }
        } else {
            navigate('/signup');
        }
    };

    return (
        <div className="flex flex-col">

            {/* ── Hero ────────────────────────────────────────────────────────
                Full viewport width. Inner text uses max-w-7xl mx-auto px-10
                (identical to .page-container) so it aligns with logo & nav.
            ─────────────────────────────────────────────────────────────────── */}
            <section
                className="relative overflow-hidden"
                style={{
                    backgroundImage: 'url(/plantingtrees.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '420px',
                }}
            >
                <div className="absolute inset-0 bg-black/55" />
                <div className="page-container relative z-10 py-10 md:py-22 flex flex-col items-start gap-6">
                    <span className="section-label text-brand-400">Serve a Cause</span>
                    <h1 className="font-display font-extrabold text-5xl md:text-7xl text-white leading-none max-w-xl">
                        SERVE<br />
                        <span className="text-brand-400">A CAUSE</span>
                    </h1>
                    <p className="text-white/80 text-lg md:text-xl max-w-lg leading-relaxed">
                        Fundraise at the speed of thought. Elevate your cause in just a minute with our lightning-fast platform.
                    </p>
                    <button onClick={handleFundNow} className="btn-primary py-3.5 px-10 text-base md:text-lg">
                        Fund Now <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {/* Why TrustFund */}
            <section className="page-container">
                <div className="py-20">
                    <div className="mb-12">
                        <span className="section-label text-brand-600">Why TrustFund?</span>
                        <h2 className="font-display font-bold text-3xl md:text-4xl mt-2 mb-3">Built for impact.</h2>
                        <p className="text-[var(--color-text-secondary)] text-base md:text-lg max-w-xl">
                            Fundraise at the speed of thought. Elevate your cause in just a minute with our lightning-fast platform.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {WHY_CARDS.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="card p-7">
                                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-5">
                                    <Icon size={22} className="text-brand-600" />
                                </div>
                                <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                                <p className="text-sm md:text-base text-[var(--color-text-muted)]">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Active Campaigns */}
            <section className="page-container">
                <div className="py-6">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <span className="section-label text-brand-600">Make an Impact Now</span>
                            <h2 className="font-display font-bold text-2xl md:text-3xl mt-1">Fund a real cause.</h2>
                        </div>
                        <Link to="/campaigns" className="btn-ghost text-sm md:text-base">
                            Browse all <ArrowRight size={15} />
                        </Link>
                    </div>

                    {loadingCampaigns ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="card h-72 animate-pulse bg-[var(--color-surface-3)]" />
                            ))}
                        </div>
                    ) : campaigns.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {campaigns.map((c) => (
                                <CampaignCard key={c.id} campaign={c} linkBase="/campaigns" />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[var(--color-text-muted)] text-base py-8 text-center">
                            No active campaigns yet. Be the first to start one!
                        </p>
                    )}
                </div>
            </section>

            <section
                className="relative w-full overflow-hidden"
                style={{
                    backgroundImage: 'url(/cleanwater.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-black/60" />
                <div className="page-container relative z-10 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-16">

                    {/* Left: About Us */}
                    <div className="flex-1">
                        <span className="section-label text-brand-400">About Us</span>
                        <p className="text-white/85 text-base md:text-lg mt-4 leading-relaxed max-w-xl">
                            We&apos;re a platform where people come together to support ideas and causes they care about.
                            From creative projects to real-world needs, we make it easy to discover, fund, and make a difference.
                            With proper checks in place, we focus on keeping things transparent and trustworthy — so you can give with confidence and see real impact.
                        </p>
                    </div>

                    {/* Right: Stat + CTA */}
                    <div className="shrink-0 text-center md:text-right">
                        <p className="text-white/60 text-sm md:text-base font-medium mb-1">
                            Be a part of our community with over
                        </p>
                        <p className="font-display font-extrabold text-6xl md:text-8xl text-white leading-none mb-1">
                            12,000+
                        </p>
                        <p className="text-white/50 text-sm md:text-base mb-8">members from around the globe</p>
                        <button onClick={handleFundNow} className="btn-primary py-3 px-8 text-base">
                            Fund Now
                        </button>
                    </div>

                </div>
            </section>

            {/* CTA Strip */}
            <section className="w-full">
                <div className="page-container py-12 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="font-display font-bold text-2xl md:text-3xl">Ready to make an impact?</h2>
                        <p className="text-[var(--color-text-muted)] text-base mt-2">
                            Join thousands of creators and supporters who are already changing the world.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/campaigns" className="btn-secondary text-base py-3 px-6">Browse Campaigns</Link>
                        <button onClick={handleStartCampaign} className="btn-primary text-base py-3 px-6">
                            Start a Campaign
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
