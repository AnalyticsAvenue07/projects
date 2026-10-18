/**
 * Realistic Demo Data for Marketing Domain
 * Covers:
 * Marketing Campaign Performance Analyzer
 */

export interface MarketingCampaignRow {
  Campaign: string
  Channel: string
  Date: string
  Impressions: number
  Clicks: number
  Leads: number
  Conversions: number
  Spend: number
  Revenue: number
  ROI: number
  CTR: number
  Conversion_Rate: number
  CAC: number
  [key: string]: any
}

export const DEMO_MARKETING_CAMPAIGN_DATA: MarketingCampaignRow[] = [
  { Campaign: 'Spring Growth Surge 2026', Channel: 'Google Search', Date: '2026-02-01', Impressions: 45000, Clicks: 3150, Leads: 280, Conversions: 95, Spend: 42000, Revenue: 135000, ROI: 221.4, CTR: 7.0, Conversion_Rate: 3.02, CAC: 442 },
  { Campaign: 'Spring Growth Surge 2026', Channel: 'Meta Ads', Date: '2026-02-01', Impressions: 85000, Clicks: 4250, Leads: 310, Conversions: 78, Spend: 38000, Revenue: 98000, ROI: 157.9, CTR: 5.0, Conversion_Rate: 1.84, CAC: 487 },
  { Campaign: 'Spring Growth Surge 2026', Channel: 'LinkedIn Sponsored', Date: '2026-02-02', Impressions: 22000, Clicks: 880, Leads: 145, Conversions: 52, Spend: 48000, Revenue: 185000, ROI: 285.4, CTR: 4.0, Conversion_Rate: 5.91, CAC: 923 },
  { Campaign: 'B2B Enterprise Lead Gen', Channel: 'Google Search', Date: '2026-02-02', Impressions: 38000, Clicks: 2660, Leads: 240, Conversions: 82, Spend: 46000, Revenue: 164000, ROI: 256.5, CTR: 7.0, Conversion_Rate: 3.08, CAC: 561 },
  { Campaign: 'B2B Enterprise Lead Gen', Channel: 'LinkedIn Sponsored', Date: '2026-02-03', Impressions: 28000, Clicks: 1120, Leads: 190, Conversions: 68, Spend: 62000, Revenue: 245000, ROI: 295.2, CTR: 4.0, Conversion_Rate: 6.07, CAC: 912 },
  { Campaign: 'Product Launch Webinar', Channel: 'YouTube Video', Date: '2026-02-03', Impressions: 120000, Clicks: 3600, Leads: 210, Conversions: 48, Spend: 32000, Revenue: 72000, ROI: 125.0, CTR: 3.0, Conversion_Rate: 1.33, CAC: 667 },
  { Campaign: 'Product Launch Webinar', Channel: 'Email Newsletter', Date: '2026-02-04', Impressions: 35000, Clicks: 4900, Leads: 520, Conversions: 165, Spend: 8000, Revenue: 195000, ROI: 2337.5, CTR: 14.0, Conversion_Rate: 3.37, CAC: 48 },
  { Campaign: 'High Intent Retargeting', Channel: 'Google Display', Date: '2026-02-04', Impressions: 65000, Clicks: 2600, Leads: 180, Conversions: 62, Spend: 19000, Revenue: 84000, ROI: 342.1, CTR: 4.0, Conversion_Rate: 2.38, CAC: 306 },
  { Campaign: 'High Intent Retargeting', Channel: 'Meta Ads', Date: '2026-02-05', Impressions: 72000, Clicks: 3960, Leads: 290, Conversions: 92, Spend: 29000, Revenue: 118000, ROI: 306.9, CTR: 5.5, Conversion_Rate: 2.32, CAC: 315 },
  { Campaign: 'Regional Brand Awareness', Channel: 'YouTube Video', Date: '2026-02-05', Impressions: 180000, Clicks: 4500, Leads: 160, Conversions: 34, Spend: 45000, Revenue: 62000, ROI: 37.8, CTR: 2.5, Conversion_Rate: 0.76, CAC: 1324 },
]
