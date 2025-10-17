
CREATE TABLE admin_compliance_metrics (
    total_documents bigint,
    total_users bigint,
    total_reports bigint,
    avg_compliance_score real,
    critical_risks bigint,
    high_risks bigint,
    medium_risks bigint,
    low_risks bigint,
    completed_documents bigint,
    processing_documents bigint,
    failed_documents bigint
);

CREATE TABLE audit_logs (
    id bigint PRIMARY KEY,
    user_id uuid,
    action text,
    details jsonb,
    timestamp timestamptz
);

CREATE TABLE notifications (
    id bigint PRIMARY KEY,
    user_id uuid,
    message text,
    is_read boolean,
    created_at timestamptz
);

CREATE TABLE team_metrics (
    id bigint PRIMARY KEY,
    user_id uuid,
    period_start date,
    period_end date,
    metrics jsonb
);

CREATE TABLE user_settings (
    id bigint PRIMARY KEY,
    user_id uuid,
    settings jsonb
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql;
