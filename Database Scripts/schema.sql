-- =============================================================
-- TrustFund — PostgreSQL Schema
-- CS 236 Advanced Database Management Systems — Spring 2026
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- 1. IDENTITY & AUTH
-- =============================================================

CREATE TABLE pending_users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    otp_code        VARCHAR(10) NOT NULL,
    otp_expires_at  TIMESTAMP   NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       TEXT        NOT NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    trust_score         INTEGER     NOT NULL DEFAULT 100,
    stripe_customer_id  VARCHAR(100),
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name        VARCHAR(100) NOT NULL,
    bio                 TEXT,
    profile_picture_url TEXT,
    location            VARCHAR(150),
    phone               VARCHAR(20),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 2. ROLES & ACCESS
-- =============================================================

CREATE TABLE roles (
    id      SMALLINT    PRIMARY KEY,
    name    VARCHAR(20) NOT NULL UNIQUE
);

-- Seed roles
INSERT INTO roles (id, name) VALUES
    (1, 'Donor'),
    (2, 'Creator'),
    (3, 'Admin');

CREATE TABLE user_roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     SMALLINT    NOT NULL REFERENCES roles(id),
    assigned_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE TABLE role_applications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone           VARCHAR(20) NOT NULL,
    work_email      VARCHAR(255) NOT NULL,
    address         TEXT        NOT NULL,
    facebook_url    TEXT,
    instagram_url   TEXT,
    linkedin_url    TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by     UUID        REFERENCES users(id),
    reviewed_at     TIMESTAMP,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE creator_profiles (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    application_id      UUID        NOT NULL UNIQUE REFERENCES role_applications(id),
    stripe_account_id   VARCHAR(100),
    payout_setup        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 3. CAMPAIGNS
-- =============================================================

CREATE TABLE campaign_categories (
    id      SERIAL      PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

-- Seed categories
INSERT INTO campaign_categories (name) VALUES
    ('Health'),
    ('Education'),
    ('Technology'),
    ('Environment'),
    ('Community'),
    ('Arts'),
    ('Emergency Relief'),
    ('Other');

CREATE TABLE campaigns (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id  UUID        NOT NULL REFERENCES users(id),
    category_id INTEGER     NOT NULL REFERENCES campaign_categories(id),
    title       VARCHAR(255) NOT NULL,
    description TEXT        NOT NULL,
    total_goal  NUMERIC(12,2) NOT NULL CHECK (total_goal > 0),
    deadline    DATE        NOT NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'Draft'
                CHECK (status IN ('Draft', 'PendingApproval', 'Active', 'Funded', 'Failed')),
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_media (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    media_type  VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    uploaded_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_followers (
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    followed_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, campaign_id)
);


-- =============================================================
-- 4. MILESTONES
-- =============================================================

CREATE TABLE milestones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT        NOT NULL,
    target_amount   NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    deadline        DATE        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Active', 'UnderReview', 'Approved', 'Rejected')),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 5. MONEY
-- =============================================================

CREATE TABLE escrow_accounts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id    UUID        NOT NULL UNIQUE REFERENCES milestones(id),
    locked_amount   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (locked_amount >= 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'Locked'
                    CHECK (status IN ('Locked', 'Released', 'Refunded')),
    released_at     TIMESTAMP,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE donations (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id            UUID        NOT NULL REFERENCES users(id),
    milestone_id        UUID        NOT NULL REFERENCES milestones(id),
    amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    stripe_payment_id   VARCHAR(100) NOT NULL UNIQUE,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('Donation', 'Fee', 'Refund', 'Transfer')),
    reference_id    UUID        NOT NULL,
    reference_type  VARCHAR(30) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_fees (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id     UUID        NOT NULL UNIQUE REFERENCES donations(id),
    fee_amount      NUMERIC(12,2) NOT NULL CHECK (fee_amount >= 0),
    fee_percentage  NUMERIC(5,2) NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE refunds (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id     UUID        NOT NULL REFERENCES donations(id),
    milestone_id    UUID        NOT NULL REFERENCES milestones(id),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    stripe_refund_id VARCHAR(100) UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Completed', 'Failed')),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 6. VOTING
-- =============================================================

CREATE TABLE votes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id        UUID        NOT NULL REFERENCES users(id),
    milestone_id    UUID        NOT NULL REFERENCES milestones(id),
    vote            BOOLEAN     NOT NULL,
    voted_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (donor_id, milestone_id)
);

CREATE TABLE vote_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id    UUID        NOT NULL UNIQUE REFERENCES milestones(id),
    yes_count       INTEGER     NOT NULL DEFAULT 0,
    no_count        INTEGER     NOT NULL DEFAULT 0,
    outcome         BOOLEAN     NOT NULL,
    computed_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- =============================================================
-- 7. NOTIFICATIONS
-- =============================================================

CREATE TABLE notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT        NOT NULL,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    email_sent      BOOLEAN     NOT NULL DEFAULT FALSE,
    failed_attempts INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- =============================================================
-- 8. INDEXES
-- =============================================================

-- Users
CREATE INDEX idx_users_email ON users(email);

-- Campaigns
CREATE INDEX idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX idx_campaigns_status  ON campaigns(status);
CREATE INDEX idx_campaigns_category ON campaigns(category_id);

-- Milestones
CREATE INDEX idx_milestones_campaign ON milestones(campaign_id);
CREATE INDEX idx_milestones_status   ON milestones(status);

-- Donations
CREATE INDEX idx_donations_donor     ON donations(donor_id);
CREATE INDEX idx_donations_milestone ON donations(milestone_id);

-- Votes
CREATE INDEX idx_votes_milestone ON votes(milestone_id);

-- Transactions
CREATE INDEX idx_transactions_reference ON transactions(reference_id);
CREATE INDEX idx_transactions_type      ON transactions(type);


-- =============================================================
-- 9. TRIGGERS & STORED PROCEDURES
-- =============================================================

-- ── On new user: create profile + assign Donor role ──────────
CREATE OR REPLACE FUNCTION fn_on_user_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, display_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));

    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, 1); -- 1 = Donor

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_user_created
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION fn_on_user_created();


-- ── On donation: update escrow + log transaction + create fee ─
CREATE OR REPLACE FUNCTION fn_on_donation_created()
RETURNS TRIGGER AS $$
DECLARE
    v_fee_pct   NUMERIC(5,2) := 5.00;
    v_fee_amt   NUMERIC(12,2);
BEGIN
    -- Update escrow
    UPDATE escrow_accounts
    SET locked_amount = locked_amount + NEW.amount
    WHERE milestone_id = NEW.milestone_id;

    -- Log transaction
    INSERT INTO transactions (type, reference_id, reference_type, amount)
    VALUES ('Donation', NEW.id, 'donations', NEW.amount);

    -- Calculate and record platform fee
    v_fee_amt := ROUND(NEW.amount * v_fee_pct / 100, 2);

    INSERT INTO platform_fees (donation_id, fee_amount, fee_percentage)
    VALUES (NEW.id, v_fee_amt, v_fee_pct);

    INSERT INTO transactions (type, reference_id, reference_type, amount)
    VALUES ('Fee', NEW.id, 'donations', v_fee_amt);

    -- Notify Creator
    INSERT INTO notifications (user_id, type, title, message)
    SELECT c.creator_id, 'NewDonation', 'New Donation Received', 
           'You received a donation of $' || NEW.amount || ' for your milestone: ' || m.title || '.'
    FROM milestones m JOIN campaigns c ON c.id = m.campaign_id WHERE m.id = NEW.milestone_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_donation_created
AFTER INSERT ON donations
FOR EACH ROW EXECUTE FUNCTION fn_on_donation_created();


-- ── On role application approved: assign Creator + make profile
CREATE OR REPLACE FUNCTION fn_on_role_application_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        -- Assign Creator role
        INSERT INTO user_roles (user_id, role_id)
        VALUES (NEW.user_id, 2) -- 2 = Creator
        ON CONFLICT (user_id, role_id) DO NOTHING;

        -- Create creator profile
        INSERT INTO creator_profiles (user_id, application_id)
        VALUES (NEW.user_id, NEW.id)
        ON CONFLICT (user_id) DO NOTHING;

        -- Notify User
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (NEW.user_id, 'ProfileApproved', 'Creator Application Approved', 'Congratulations! Your application to become a creator has been approved.');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_role_application_updated
AFTER UPDATE ON role_applications
FOR EACH ROW EXECUTE FUNCTION fn_on_role_application_updated();


-- ── Enforce vote eligibility: donor must have donated to milestone
CREATE OR REPLACE FUNCTION fn_check_vote_eligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM donations
        WHERE donor_id = NEW.donor_id
        AND milestone_id = NEW.milestone_id
    ) THEN
        RAISE EXCEPTION 'Donor has not donated to this milestone and cannot vote.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_vote_eligibility
BEFORE INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION fn_check_vote_eligibility();


-- ── Procedure: close voting for a milestone ───────────────────
CREATE OR REPLACE PROCEDURE close_voting(p_milestone_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
    v_yes   INTEGER;
    v_no    INTEGER;
    v_outcome BOOLEAN;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE vote = TRUE),
        COUNT(*) FILTER (WHERE vote = FALSE)
    INTO v_yes, v_no
    FROM votes
    WHERE milestone_id = p_milestone_id;

    v_outcome := v_yes > v_no;

    INSERT INTO vote_results (milestone_id, yes_count, no_count, outcome)
    VALUES (p_milestone_id, v_yes, v_no, v_outcome);
END;
$$;


-- ── On vote result: release escrow (YES) or refund (NO) ──────
CREATE OR REPLACE FUNCTION fn_on_vote_result()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outcome = TRUE THEN
        -- Release escrow
        UPDATE escrow_accounts
        SET status = 'Released', released_at = NOW()
        WHERE milestone_id = NEW.milestone_id;

        -- Update milestone status
        UPDATE milestones SET status = 'Approved'
        WHERE id = NEW.milestone_id;

        -- Log transfer transaction
        INSERT INTO transactions (type, reference_id, reference_type, amount)
        SELECT 'Transfer', NEW.id, 'vote_results', locked_amount
        FROM escrow_accounts WHERE milestone_id = NEW.milestone_id;

        -- Update creator trust score
        UPDATE users SET trust_score = LEAST(trust_score + 5, 1000)
        WHERE id = (
            SELECT c.creator_id FROM milestones m
            JOIN campaigns c ON c.id = m.campaign_id
            WHERE m.id = NEW.milestone_id
        );

        -- Notify Creator
        INSERT INTO notifications (user_id, type, title, message)
        SELECT c.creator_id, 'MilestoneApproved', 'Milestone Approved', 
               'Your milestone was approved by donors. Yes: ' || NEW.yes_count || ', No: ' || NEW.no_count || '.'
        FROM milestones m JOIN campaigns c ON c.id = m.campaign_id WHERE m.id = NEW.milestone_id;

        -- Notify Donors
        INSERT INTO notifications (user_id, type, title, message)
        SELECT DISTINCT d.donor_id, 'VoteOutcome', 'Milestone Approved',
               'The milestone you backed was approved. Funds have been released. Yes: ' || NEW.yes_count || ', No: ' || NEW.no_count || '.'
        FROM donations d WHERE d.milestone_id = NEW.milestone_id;

    ELSE
        -- Mark escrow for refund
        UPDATE escrow_accounts
        SET status = 'Refunded'
        WHERE milestone_id = NEW.milestone_id;

        -- Update milestone status
        UPDATE milestones SET status = 'Rejected'
        WHERE id = NEW.milestone_id;

        -- Create refund records for all donors
        INSERT INTO refunds (donation_id, milestone_id, amount, status)
        SELECT id, milestone_id, amount, 'Pending'
        FROM donations
        WHERE milestone_id = NEW.milestone_id;

        -- Log refund transactions
        INSERT INTO transactions (type, reference_id, reference_type, amount)
        SELECT 'Refund', d.id, 'donations', d.amount
        FROM donations d
        WHERE d.milestone_id = NEW.milestone_id;

        -- Penalize creator trust score
        UPDATE users SET trust_score = GREATEST(trust_score - 10, 0)
        WHERE id = (
            SELECT c.creator_id FROM milestones m
            JOIN campaigns c ON c.id = m.campaign_id
            WHERE m.id = NEW.milestone_id
        );

        -- Notify Creator
        INSERT INTO notifications (user_id, type, title, message)
        SELECT c.creator_id, 'MilestoneRejected', 'Milestone Rejected', 
               'Your milestone was rejected by donors. Yes: ' || NEW.yes_count || ', No: ' || NEW.no_count || '.'
        FROM milestones m JOIN campaigns c ON c.id = m.campaign_id WHERE m.id = NEW.milestone_id;

        -- Notify Donors
        INSERT INTO notifications (user_id, type, title, message)
        SELECT DISTINCT d.donor_id, 'VoteOutcome', 'Milestone Rejected',
               'The milestone you backed was rejected. A refund will be processed shortly. Yes: ' || NEW.yes_count || ', No: ' || NEW.no_count || '.'
        FROM donations d WHERE d.milestone_id = NEW.milestone_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_vote_result
AFTER INSERT ON vote_results
FOR EACH ROW EXECUTE FUNCTION fn_on_vote_result();


-- ── Procedure: process refunds (called by backend after Stripe)
CREATE OR REPLACE PROCEDURE process_refunds(
    p_milestone_id  UUID,
    p_refund_id     UUID,
    p_stripe_ref_id VARCHAR(100),
    p_status        VARCHAR(20)
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE refunds
    SET stripe_refund_id = p_stripe_ref_id,
        status = p_status
    WHERE id = p_refund_id
    AND milestone_id = p_milestone_id;
END;
$$;


-- ── Auto-update campaigns.updated_at on change ───────────────
CREATE OR REPLACE FUNCTION fn_update_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_campaign_timestamp
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION fn_update_campaign_timestamp();


-- ── On milestone status update: notify donors when voting opens
CREATE OR REPLACE FUNCTION fn_on_milestone_status_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'UnderReview' AND OLD.status != 'UnderReview' THEN
        -- Notify all donors
        INSERT INTO notifications (user_id, type, title, message)
        SELECT DISTINCT d.donor_id, 'VotingOpened', 'Milestone Voting Opened',
               'The milestone "' || NEW.title || '" is ready for review. You have 24 hours to cast your vote.'
        FROM donations d WHERE d.milestone_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_milestone_status_updated
AFTER UPDATE ON milestones
FOR EACH ROW EXECUTE FUNCTION fn_on_milestone_status_updated();


-- =============================================================
-- 9. TEST DATA
-- =============================================================

-- Test user: test@gmail.com / Test@123
-- Note: Trigger will auto-create profile + assign Donor role
INSERT INTO users (email, password_hash, is_active)
VALUES ('test@gmail.com', '$2b$10$slYQmyNdGzin7olVN3p5Be07DlH.PKZbv5H8KnzzVgXXbVxzy71uK', TRUE);


-- =============================================================
-- END OF SCHEMA
-- =============================================================
