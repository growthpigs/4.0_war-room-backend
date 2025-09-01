CREATE TABLE intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_mentions INTEGER,
  positive_count INTEGER,
  negative_count INTEGER,
  neutral_count INTEGER,
  average_sentiment DECIMAL(3,2),
  top_keywords JSONB,
  competitor_mentions JSONB,
  crisis_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_intelligence_snapshots_date ON intelligence_snapshots(snapshot_date);
CREATE UNIQUE INDEX idx_intelligence_snapshots_unique_date ON intelligence_snapshots(snapshot_date);
