import { 
  MentionItem, 
  SentimentSummary, 
  GeoLocation, 
  Influencer, 
  ShareOfVoice, 
  TrendingTopic, 
  FeedItem 
} from "./types";

export function generateMockMentions(count: number = 20): MentionItem[] {
  const platforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'reddit'];
  const sentiments: Array<'positive' | 'negative' | 'neutral'> = ['positive', 'negative', 'neutral'];
  const authors = ['TechEnthusiast', 'MarketingPro', 'BrandFan', 'CriticalUser', 'InfluencerX'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `mock_mention_${i + 1}`,
    text: `This is a mock mention about the brand or product. It contains sample content for testing purposes. Mention ${i + 1}`,
    platform: platforms[Math.floor(Math.random() * platforms.length)],
    author: authors[Math.floor(Math.random() * authors.length)],
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
    reach: Math.floor(Math.random() * 10000) + 100
  }));
}

export function generateMockSentiment(): SentimentSummary {
  const positive = Math.floor(Math.random() * 60) + 20;
  const negative = Math.floor(Math.random() * 30) + 5;
  const neutral = Math.floor(Math.random() * 40) + 10;
  
  return {
    positive,
    negative,
    neutral,
    total: positive + negative + neutral
  };
}

export function generateMockGeoData(count: number = 10): GeoLocation[] {
  const locations = [
    { name: 'United States', lat: 39.8283, lng: -98.5795 },
    { name: 'United Kingdom', lat: 55.3781, lng: -3.4360 },
    { name: 'Germany', lat: 51.1657, lng: 10.4515 },
    { name: 'France', lat: 46.2276, lng: 2.2137 },
    { name: 'Canada', lat: 56.1304, lng: -106.3468 },
    { name: 'Australia', lat: -25.2744, lng: 133.7751 },
    { name: 'Japan', lat: 36.2048, lng: 138.2529 },
    { name: 'Brazil', lat: -14.2350, lng: -51.9253 }
  ];
  
  return Array.from({ length: Math.min(count, locations.length) }, (_, i) => ({
    location: locations[i].name,
    mentions: Math.floor(Math.random() * 500) + 10,
    sentiment: (Math.random() * 2 - 1), // -1 to 1
    coordinates: {
      lat: locations[i].lat,
      lng: locations[i].lng
    }
  }));
}

export function generateMockInfluencers(count: number = 10): Influencer[] {
  const platforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'youtube'];
  const names = [
    'TechGuru123', 'DigitalMarketer', 'BrandAdvocate', 'IndustryExpert',
    'SocialInfluencer', 'ContentCreator', 'ThoughtLeader', 'TrendSetter'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    name: names[i % names.length] + (i > names.length - 1 ? (i + 1) : ''),
    followers: Math.floor(Math.random() * 100000) + 5000,
    engagement_rate: Math.random() * 10 + 1,
    platform: platforms[Math.floor(Math.random() * platforms.length)],
    influence_score: Math.floor(Math.random() * 100) + 1
  }));
}

export function generateMockShareOfVoice(brands: string[]): ShareOfVoice[] {
  const totalMentions = Math.floor(Math.random() * 1000) + 500;
  let remainingPercentage = 100;
  
  return brands.map((brand, index) => {
    const isLast = index === brands.length - 1;
    const percentage = isLast ? remainingPercentage : Math.floor(Math.random() * (remainingPercentage / (brands.length - index))) + 1;
    remainingPercentage -= percentage;
    
    const mentions = Math.floor((percentage / 100) * totalMentions);
    
    return {
      brand,
      percentage,
      mentions,
      sentiment: (Math.random() * 2 - 1) // -1 to 1
    };
  });
}

export function generateMockTrending(count: number = 10): TrendingTopic[] {
  const topics = [
    'artificial intelligence', 'sustainability', 'remote work', 'digital transformation',
    'customer experience', 'innovation', 'marketing automation', 'social media',
    'brand awareness', 'product launch', 'user experience', 'data analytics'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    topic: topics[i % topics.length],
    mentions: Math.floor(Math.random() * 200) + 20,
    growth_rate: Math.random() * 100 - 20, // -20% to 80%
    sentiment: (Math.random() * 2 - 1) // -1 to 1
  }));
}

export function generateMockFeed(count: number = 20): FeedItem[] {
  const types: Array<'mention' | 'trend' | 'influencer' | 'alert'> = ['mention', 'trend', 'influencer', 'alert'];
  const contents = [
    'New mention detected with high engagement',
    'Trending topic gaining momentum',
    'Influencer shared your content',
    'Spike in negative sentiment detected',
    'Viral content opportunity identified',
    'Competitor activity increased',
    'Brand mention from verified account'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    type: types[Math.floor(Math.random() * types.length)],
    content: contents[Math.floor(Math.random() * contents.length)],
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    engagement: Math.floor(Math.random() * 1000) + 10
  }));
}
