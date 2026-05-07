import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api';

export default function SignupPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = email/password, 2 = OTP
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authAPI.register(email, password);
            toast.success('OTP sent to your email!');
            setStep(2);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authAPI.verifyOtp(email, otp);
            toast.success('Account created! Please log in.');
            navigate('/login');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="card p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <span className="section-label">
                            {step === 1 ? 'Create account' : 'Verify email'}
                        </span>
                        <h1 className="text-3xl font-display font-bold mt-1">
                            {step === 1 ? 'Join TrustFund' : 'Check your inbox'}
                        </h1>
                        <p className="text-sm text-[var(--color-text-muted)] mt-2">
                            {step === 1
                                ? 'Start supporting causes that matter to you.'
                                : `We sent a 6-digit OTP to ${email}`}
                        </p>
                    </div>

                    {/* Step 1: Email + Password */}
                    {step === 1 && (
                        <form onSubmit={handleRegister} className="space-y-5">
                            <div>
                                <label className="label">Email address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="input pl-10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className="input pl-10 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((v) => !v)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                                    >
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full justify-center py-3 text-base mt-2"
                            >
                                {loading ? 'Sending OTP…' : 'Continue'}
                                <ArrowRight size={16} />
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div>
                                <label className="label">One-Time Password</label>
                                <div className="relative">
                                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                    <input
                                        type="text"
                                        required
                                        maxLength={10}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter OTP from email"
                                        className="input pl-10 tracking-widest"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full justify-center py-3 text-base"
                            >
                                {loading ? 'Verifying…' : 'Verify & Create Account'}
                                <ArrowRight size={16} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="btn-ghost w-full justify-center text-sm"
                            >
                                ← Back
                            </button>
                        </form>
                    )}
{/* Divider */}
<div className="flex items-center gap-3 my-5">
    <div className="flex-1 h-px bg-[var(--color-border)]" />
    <span className="text-xs text-[var(--color-text-muted)]">or</span>
    <div className="flex-1 h-px bg-[var(--color-border)]" />
</div>

{/* Google Button */}

   <a href="http://localhost:3000/api/auth/google"
    className="flex items-center justify-center gap-3 w-full border border-[var(--color-border)] rounded-[var(--radius-btn)] py-3 text-sm font-semibold hover:bg-[var(--color-bg-subtle)] transition-colors"
>
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
    Continue with Google
</a>
                    {/* Footer */}
                    <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-600 font-semibold hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
