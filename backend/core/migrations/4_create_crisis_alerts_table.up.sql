CREATE TABLE crisis_alerts (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_url TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_crisis_alerts_campaign_id ON crisis_alerts(campaign_id);
CREATE INDEX idx_crisis_alerts_severity ON crisis_alerts(severity);
CREATE INDEX idx_crisis_alerts_status ON crisis_alerts(status);
CREATE INDEX idx_crisis_alerts_triggered_at ON crisis_alerts(triggered_at);
