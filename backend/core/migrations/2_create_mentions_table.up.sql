CREATE TABLE mentions (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  url TEXT,
  sentiment DOUBLE PRECISION,
  reach INTEGER,
  engagement INTEGER,
  mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mentions_campaign_id ON mentions(campaign_id);
CREATE INDEX idx_mentions_platform ON mentions(platform);
CREATE INDEX idx_mentions_mentioned_at ON mentions(mentioned_at);
CREATE INDEX idx_mentions_sentiment ON mentions(sentiment);
