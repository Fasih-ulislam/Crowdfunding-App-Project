import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { paymentAPI } from '../../api';
import toast from 'react-hot-toast';

export default function OnboardingCompletePage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | success | error

    useEffect(() => {
        async function complete() {
            try {
                await paymentAPI.completeOnboarding();
                setStatus('success');
                toast.success('Stripe account connected!');
            } catch (err) {
                setStatus('error');
                toast.error(err.message);
            }
        }
        complete();
    }, []);

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="card p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-6" />
                            <h1 className="font-display font-bold text-xl">Completing setup…</h1>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={28} className="text-brand-600" />
                            </div>
                            <h1 className="font-display font-bold text-2xl mb-3">You're all set!</h1>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">
                                Your Stripe account is connected. You can now receive funds from your campaigns.
                            </p>
                            <button
                                onClick={() => navigate('/creator/dashboard')}
                                className="btn-primary w-full justify-center py-3 text-base"
                            >
                                Go to Creator Dashboard <ArrowRight size={15} />
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                                <AlertCircle size={28} className="text-red-500" />
                            </div>
                            <h1 className="font-display font-bold text-2xl mb-3">Something went wrong</h1>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">
                                We couldn't complete the Stripe setup. Please try again.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/onboarding/start')}
                                    className="btn-primary flex-1 justify-center py-2.5"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => navigate('/creator/dashboard')}
                                    className="btn-secondary flex-1 justify-center py-2.5"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}