import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { applicationAPI } from '../../api';
import toast from 'react-hot-toast';

export default function ApplyCreatorPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        phone: '',
        work_email: '',
        address: '',
        facebook_url: '',
        instagram_url: '',
        linkedin_url: '',
    });
    const [loading, setLoading] = useState(false);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await applicationAPI.submit(form);
            toast.success('Application submitted! An admin will review it shortly.');
            navigate('/donor/dashboard');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container py-10 max-w-2xl">
            <div className="mb-8">
                <span className="section-label text-brand-600">Creator Application</span>
                <h1 className="font-display font-bold text-3xl mt-1">Become a Creator</h1>
                <p className="text-[var(--color-text-muted)] text-sm mt-2">
                    Fill in your details below. Once an admin approves your application, your role will be upgraded to Creator.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="card p-8 space-y-5">
                <div>
                    <label className="label">Phone number *</label>
                    <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input required type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 234 567 8900" className="input pl-10" />
                    </div>
                </div>

                <div>
                    <label className="label">Work email *</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input required type="email" value={form.work_email} onChange={set('work_email')} placeholder="work@company.com" className="input pl-10" />
                    </div>
                </div>

                <div>
                    <label className="label">Physical address *</label>
                    <div className="relative">
                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input required type="text" value={form.address} onChange={set('address')} placeholder="123 Main St, City, Country" className="input pl-10" />
                    </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-5">
                    <p className="section-label mb-4">Social links (optional)</p>
                    <div className="space-y-4">
                        {[
                            { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/yourpage' },
                            { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/yourhandle' },
                            { key: 'linkedin_url', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/yourprofile' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="label">{label}</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                    <input type="url" value={form[key]} onChange={set(key)} placeholder={placeholder} className="input pl-10" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
                    {loading ? 'Submitting…' : 'Submit Application'}
                    <ArrowRight size={16} />
                </button>
            </form>
        </div>
    );
}
