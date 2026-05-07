// Format a number as currency
export function formatCurrency(amount, currency = 'USD') {
    if (amount == null) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Days remaining from a deadline date string
export function daysLeft(deadline) {
    if (!deadline) return 0;
    const now = new Date();
    const end = new Date(deadline);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

// Calculate funding percentage
export function fundingPercent(raised, goal) {
    if (!goal || goal === 0) return 0;
    return Math.min(100, Math.round((raised / goal) * 100));
}

// Campaign status badge colors
export function statusColor(status) {
    const map = {
        Draft: 'bg-gray-100 text-gray-600',
        PendingApproval: 'bg-yellow-100 text-yellow-700',
        Active: 'bg-green-100 text-green-700',
        Funded: 'bg-blue-100 text-blue-700',
        Failed: 'bg-red-100 text-red-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
}

// Milestone status badge colors
export function milestoneStatusColor(status) {
    const map = {
        Pending: 'bg-gray-100 text-gray-600',
        Active: 'bg-green-100 text-green-700',
        UnderReview: 'bg-yellow-100 text-yellow-700',
        Approved: 'bg-blue-100 text-blue-700',
        Rejected: 'bg-red-100 text-red-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
}

// Truncate text
export function truncate(str, n = 120) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
}

// Format relative time
export function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
