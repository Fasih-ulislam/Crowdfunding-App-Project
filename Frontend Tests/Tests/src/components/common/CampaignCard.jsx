import { Link } from 'react-router-dom';
import { Clock, Target } from 'lucide-react';
import { formatCurrency, daysLeft, fundingPercent, truncate, statusColor } from '../../utils/helpers';
import clsx from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function CampaignCard({ campaign, linkBase = '/campaigns' }) {
    const {
        id, title, description, total_goal, deadline, status,
        category_name, raised_amount, media_url,
    } = campaign;

    const percent = fundingPercent(raised_amount ?? 0, total_goal);
    const days = daysLeft(deadline);
    const imgSrc = media_url ? `${API_BASE}${media_url}` : null;

    return (
        <Link to={`${linkBase}/${id}`} className="card block overflow-hidden group">
            {/* Image */}
            <div className="aspect-[16/9] bg-[var(--color-surface-3)] overflow-hidden">
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Target size={32} className="text-[var(--color-text-muted)]" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Category + Status */}
                <div className="flex items-center gap-2 mb-3">
                    {category_name && (
                        <span className="badge bg-brand-50 text-brand-700 text-xs">
                            {category_name}
                        </span>
                    )}
                    {status && (
                        <span className={clsx('badge text-xs', statusColor(status))}>
                            {status}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="font-display font-bold text-base text-[var(--color-text-primary)] mb-1.5 leading-snug line-clamp-2">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[var(--color-text-muted)] mb-4 line-clamp-2">
                    {truncate(description, 100)}
                </p>

                {/* Progress bar */}
                <div className="progress-bar mb-2">
                    <div
                        className="progress-fill"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-brand-600">
                        {formatCurrency(raised_amount ?? 0)} raised
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {days > 0 ? `${days} days left` : 'Ended'}
                    </span>
                </div>
            </div>
        </Link>
    );
}
