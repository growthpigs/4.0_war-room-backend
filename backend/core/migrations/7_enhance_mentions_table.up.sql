ALTER TABLE mentions ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);
ALTER TABLE mentions ADD COLUMN IF NOT EXISTS reach_estimate BIGINT;
ALTER TABLE mentions ADD COLUMN IF NOT EXISTS engagement_count INTEGER;
ALTER TABLE mentions ADD COLUMN IF NOT EXISTS influence_score DECIMAL(3,2);
ALTER TABLE mentions ADD COLUMN IF NOT EXISTS crisis_event_id UUID REFERENCES crisis_events(id);

CREATE INDEX idx_mentions_sentiment_score ON mentions(sentiment_score);
CREATE INDEX idx_mentions_crisis_event_id ON mentions(crisis_event_id);
