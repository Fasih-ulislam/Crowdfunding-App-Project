import api from './axiosInstance';

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const authAPI = {
    register: (email, password) =>
        api.post('/auth/register', { email, password }),

    verifyOtp: (email, otp) =>
        api.post('/auth/verify-otp', { email, otp }),

    login: (email, password, activeRole) =>
        api.post('/auth/login', { email, password, activeRole }),

    logout: () =>
        api.post('/auth/logout'),

    me: () =>
        api.get('/auth/me'),
};

// ─── USER / PROFILE ───────────────────────────────────────────────────────────

export const userAPI = {
    getProfile: () =>
        api.get('/user/'),

    updateProfile: (data) =>
        api.put('/user/', data),
};

// ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

export const campaignAPI = {
    getAll: (params = {}) =>
        api.get('/campaigns', { params }),

    getById: (id) =>
        api.get(`/campaigns/${id}`),

    getCategories: () =>
        api.get('/campaigns/categories'),

    create: (data) =>
        api.post('/campaigns', data),

    update: (id, data) =>
        api.put(`/campaigns/${id}`, data),

    delete: (id) =>
        api.delete(`/campaigns/${id}`),

    submitForReview: (id) =>
        api.patch(`/campaigns/${id}/submit-for-review`),

    adminReview: (id, action) =>
        api.patch(`/campaigns/${id}/review`, { action }),

    uploadMedia: (id, formData) =>
        api.post(`/campaigns/${id}/media`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getMedia: (id) =>
        api.get(`/campaigns/${id}/media`),

    deleteMedia: (campaignId, mediaId) =>
        api.delete(`/campaigns/${campaignId}/media/${mediaId}`),

    follow: (id) =>
        api.post(`/campaigns/${id}/follow`),

    unfollow: (id) =>
        api.delete(`/campaigns/${id}/unfollow`),
};

// ─── MILESTONES ───────────────────────────────────────────────────────────────

export const milestoneAPI = {
    adminListPending: () =>
        api.get('/milestones/admin/pending'),

    getByCampaign: (campaignId) =>
        api.get(`/milestones/campaign/${campaignId}`),

    create: (campaignId, data) =>
        api.post(`/milestones/campaign/${campaignId}`, data),

    submitForReview: (milestoneId) =>
        api.patch(`/milestones/${milestoneId}/status`, {}),

    adminReview: (milestoneId, data) =>
        api.patch(`/milestones/${milestoneId}/review`, data),
};

// ─── VOTES ────────────────────────────────────────────────────────────────────

export const voteAPI = {
    getResults: (milestoneId) =>
        api.get(`/votes/${milestoneId}`),

    getLive: (milestoneId) =>
        api.get(`/votes/${milestoneId}/live`),

    cast: (milestoneId, vote) =>
        api.post(`/votes/${milestoneId}`, { vote }),
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export const paymentAPI = {
    donate: (milestone_id, amount) =>
        api.post('/payments/donate', { milestone_id, amount }),

    startOnboarding: () =>
        api.post('/payments/onboarding/start'),

    completeOnboarding: () =>
        api.post('/payments/onboarding/complete'),

    releaseEscrow: (milestoneId) =>
        api.post(`/payments/release/${milestoneId}`),

    processRefunds: (milestoneId) =>
        api.post(`/payments/refund/${milestoneId}`),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notificationAPI = {
    getAll: () =>
        api.get('/notifications'),

    markAllRead: () =>
        api.patch('/notifications/read-all'),

    markRead: (id) =>
        api.patch(`/notifications/${id}/read`),
};

// ─── APPLICATIONS (Donor → Creator) ──────────────────────────────────────────

export const applicationAPI = {
    submit: (data) =>
        api.post('/application', data),

    getMine: () =>
        api.get('/application/my'),

    getAll: () =>
        api.get('/application/all'),

    approveOrReject: (id, status) =>
        api.post(`/application/${id}/approve`, { status }),
};
