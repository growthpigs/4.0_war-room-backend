import Joi from "joi";

export const mentionsQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'reddit', 'news', 'blogs'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  date_from: Joi.string().isoDate(),
  date_to: Joi.string().isoDate(),
  sentiment: Joi.string().valid('positive', 'negative', 'neutral'),
  country: Joi.string().length(2)
});

export const sentimentQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'reddit', 'news', 'blogs'),
  date_from: Joi.string().isoDate(),
  date_to: Joi.string().isoDate(),
  country: Joi.string().length(2)
});

export const geoQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'reddit', 'news', 'blogs'),
  date_from: Joi.string().isoDate(),
  date_to: Joi.string().isoDate(),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

export const influencersQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'youtube'),
  min_followers: Joi.number().integer().min(0).default(1000),
  limit: Joi.number().integer().min(1).max(50).default(10),
  date_from: Joi.string().isoDate(),
  date_to: Joi.string().isoDate()
});

export const shareOfVoiceQuerySchema = Joi.object({
  brands: Joi.array().items(Joi.string().min(1).max(50)).min(1).max(10),
  platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'reddit', 'news', 'blogs'),
  date_from: Joi.string().isoDate(),
  date_to: Joi.string().isoDate(),
  country: Joi.string().length(2)
});

export const trendingQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  platform: Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'reddit', 'news', 'blogs'),
  limit: Joi.number().integer().min(1).max(20).default(10),
  period: Joi.string().valid('1h', '6h', '24h', '7d').default('24h'),
  min_mentions: Joi.number().integer().min(1).default(5)
});

export const feedQuerySchema = Joi.object({
  keyword: Joi.string().min(1).max(100),
  types: Joi.array().items(Joi.string().valid('mention', 'trend', 'influencer', 'alert')).default(['mention']),
  limit: Joi.number().integer().min(1).max(50).default(20),
  date_from: Joi.string().isoDate(),
  date_to: Joi.string().isoDate()
});
