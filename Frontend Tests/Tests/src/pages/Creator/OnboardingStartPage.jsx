import { useState } from 'react';
import { Wallet, ArrowRight, ExternalLink } from 'lucide-react';
import { paymentAPI } from '../../api';
import toast from 'react-hot-toast';

export default function OnboardingStartPage() {
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        setLoading(true);
        try {
            const { data } = await paymentAPI.startOnboarding();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Could not get onboarding URL.');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="card p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
                        <Wallet size={28} className="text-brand-600" />
                    </div>
                    <span className="section-label">Stripe Connect</span>
                    <h1 className="font-display font-bold text-2xl mt-1 mb-3">Set up payouts</h1>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-8">
                        To receive funds from your campaigns, you need to connect a Stripe account.
                        This is a one-time setup that takes a few minutes.
                    </p>
                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="btn-primary w-full justify-center py-3 text-base"
                    >
                        {loading ? 'Redirecting…' : 'Connect with Stripe'}
                        <ExternalLink size={15} />
                    </button>
                    <p className="text-xs text-[var(--color-text-muted)] mt-4">
                        You will be redirected to Stripe's secure onboarding flow.
                    </p>
                </div>
            </div>
        </div>
    );
}