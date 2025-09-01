CREATE TABLE performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_campaign_id ON performance_metrics(campaign_id);
CREATE INDEX idx_performance_metrics_platform ON performance_metrics(platform);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(date);
