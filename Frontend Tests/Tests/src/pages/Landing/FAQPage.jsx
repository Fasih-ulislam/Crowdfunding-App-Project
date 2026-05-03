
const FAQ_SECTIONS = [
    {
        id: 'donating',
        label: 'Donating',
        items: [
            { q: 'How can I make a donation?', a: 'Just pick a campaign, enter your amount, and pay securely in a few clicks.' },
            { q: 'How will my donation be used?', a: "Funds go directly to the campaign you choose, with transparency on how they're spent." },
            { q: 'Can I set up a recurring donation?', a: 'Yes, you can choose to support a campaign regularly with automatic payments.' },
            { q: 'Is there a minimum donation amount?', a: 'We keep it low so anyone can contribute—exact minimum may vary by campaign.' },
        ],
    },
    {
        id: 'campaigns',
        label: 'Campaigns',
        hasImage: true,
        items: [
            { q: 'How long does it take to get approved?', a: 'Most campaigns are reviewed and approved within 24–48 hours.' },
            { q: 'Does TrustFund charge any fees?', a: 'We keep fees minimal to cover operations, with full transparency upfront.' },
            { q: "What happens if my campaign doesn't reach its goal?", a: "Depending on the campaign type, funds may still be received or returned—details are set by the creator." },
        ],
    },
    {
        id: 'account',
        label: 'Account & Platform',
        items: [
            { q: 'How do I create an account?', a: "Sign up with your email, set a password, and you're ready to go." },
            { q: 'Which countries is TrustFund available in?', a: 'We support users globally, with some features varying by region.' },
            { q: 'Is there a mobile app?', a: 'Yes, you can access TrustFund on mobile, with a dedicated app coming soon.' },
        ],
    },
];

export default function FAQPage() {
    return (
        <div className="flex flex-col">
            {/* Hero */}
            <section className="page-container py-10">
                <div className="bg-[var(--color-surface-3)] rounded-2xl p-8 md:p-12">
                    <span className="section-label text-brand-600">Support</span>
                    <h1 className="font-display font-bold text-4xl md:text-5xl mt-2 mb-3">
                        Frequently asked<br />questions.
                    </h1>
                    <p className="text-base text-[var(--color-text-muted)]">
                        Can't find what you're looking for? Reach out to us at{' '}
                        <a href="mailto:support@trustfund.io" className="text-brand-600 underline underline-offset-2 hover:text-brand-700">
                            support@trustfund.io
                        </a>
                        .
                    </p>
                </div>
            </section>

            {/* FAQ Sections */}
            <div className="page-container py-8 space-y-0">
                {FAQ_SECTIONS.map((section) => (
                    <section key={section.id} className="border-t border-[var(--color-border)] py-10">
                        <div className={section.hasImage ? 'grid grid-cols-1 md:grid-cols-3 gap-8' : ''}>
                            <div className={section.hasImage ? 'md:col-span-2' : ''}>
                                <h2 className="section-label text-[var(--color-text-muted)] mb-6">{section.label}</h2>
                                <ul className="space-y-5">
                                    {section.items.map(({ q, a }) => (
                                        <li key={q} className="flex gap-3">
                                            <span className="text-[var(--color-text-muted)] mt-0.5">•</span>
                                            <div>
                                                <p className="font-bold text-sm text-[var(--color-text-primary)]">{q}</p>
                                                <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-relaxed">{a}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {section.hasImage && (
                                <div className="bg-[var(--color-surface-3)] rounded-2xl hidden md:block" />
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}