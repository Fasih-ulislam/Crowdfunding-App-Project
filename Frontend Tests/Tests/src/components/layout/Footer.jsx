import { Link } from 'react-router-dom';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-[var(--color-footer-bg)] text-white mt-auto transition-colors duration-300">
            <div className="page-container">
                <div className="py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-lg text-white mb-3">
                            <span className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                            </span>
                            TrustFund
                        </Link>
                        <p className="text-sm text-white/50 leading-relaxed">
                            Making funding accessible,<br />transparent, and human.
                        </p>
                    </div>

                    {/* Campaigns */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Campaigns</p>
                        <ul className="space-y-2.5">
                            {[
                                { to: '/signup', label: 'Start a Campaign' },
                                { to: '/campaigns', label: 'Browse All' },
                            ].map(({ to, label }) => (
                                <li key={label}>
                                    <Link to={to} className="text-sm text-white/60 hover:text-white transition-colors">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Help */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Help</p>
                        <ul className="space-y-2.5">
                            {[
                                { to: '/faq', label: 'FAQ' },
                            ].map(({ to, label }) => (
                                <li key={label}>
                                    <Link to={to} className="text-sm text-white/60 hover:text-white transition-colors">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-white/30">
                        © TrustFund {year}. All rights reserved.
                    </p>
                </div>
            </div>
            </div>
        </footer>
    );
}
