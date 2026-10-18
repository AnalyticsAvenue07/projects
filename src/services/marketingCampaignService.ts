/**
 * Marketing Campaign Performance Analyzer Domain Service
 */

import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'
import { parseCsvFile, applyMappingToRows, exportToCsvFile } from '@/utils/csvParser'
import { DEMO_MARKETING_CAMPAIGN_DATA, type MarketingCampaignRow } from './demoData/marketingData'
import { DemoDataProvider } from './demoDataProvider'

const API_BASE_URL =
  import.meta.env.VITE_MARKETING_ANALYTICS_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8025'

export interface MarketingCampaignKpis {
  total_impressions: number
  total_clicks: number
  total_leads: number
  total_spend: number
}

function calculateKpis(rows: MarketingCampaignRow[]): MarketingCampaignKpis {
  const total_impressions = rows.reduce((s, r) => s + (Number(r.Impressions) || 0), 0)
  const total_clicks = rows.reduce((s, r) => s + (Number(r.Clicks) || 0), 0)
  const total_leads = rows.reduce((s, r) => s + (Number(r.Leads) || 0), 0)
  const total_spend = rows.reduce((s, r) => s + (Number(r.Spend) || 0), 0)

  return { total_impressions, total_clicks, total_leads, total_spend }
}

export class MarketingCampaignService {
  static async loadDefault(): Promise<{
    data: MarketingCampaignRow[]
    preview: MarketingCampaignRow[]
    campaigns: string[]
    channels: string[]
    kpis: MarketingCampaignKpis
  }> {
    if (isDemoMode()) {
      const rows = [...DEMO_MARKETING_CAMPAIGN_DATA]
      const campaigns = Array.from(new Set(rows.map((r) => r.Campaign).filter(Boolean))).sort()
      const channels = Array.from(new Set(rows.map((r) => r.Channel).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 8),
        campaigns,
        channels,
        kpis,
      }
    }

    return requestJson(`${API_BASE_URL}/load-default`)
  }

  static async filter(params: {
    data: MarketingCampaignRow[]
    campaigns?: string[]
    channels?: string[]
  }): Promise<{
    data: MarketingCampaignRow[]
    preview: MarketingCampaignRow[]
    kpis: MarketingCampaignKpis
  }> {
    if (isDemoMode()) {
      let filtered = [...params.data]
      if (params.campaigns && params.campaigns.length > 0) {
        filtered = filtered.filter((r) => params.campaigns!.includes(r.Campaign))
      }
      if (params.channels && params.channels.length > 0) {
        filtered = filtered.filter((r) => params.channels!.includes(r.Channel))
      }

      return {
        data: filtered,
        preview: filtered.slice(0, 8),
        kpis: calculateKpis(filtered),
      }
    }

    return requestJson(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  static async getCharts(rows: MarketingCampaignRow[]): Promise<{
    campaign_clicks: Array<{ Campaign: string; Clicks: number }>
    channel_leads: Array<{ Channel: string; Leads: number }>
    spend_vs_conversions: Array<{
      Spend: number
      Conversions: number
      Impressions: number
      Campaign: string
      Channel: string
    }>
  }> {
    if (isDemoMode()) {
      const campaign_clicks = DemoDataProvider.aggregateByCategory(rows, 'Campaign', 'Clicks', 'sum').map((c) => ({
        Campaign: c.Campaign,
        Clicks: c.Clicks,
      }))

      const channel_leads = DemoDataProvider.aggregateByCategory(rows, 'Channel', 'Leads', 'sum').map((c) => ({
        Channel: c.Channel,
        Leads: c.Leads,
      }))

      const spend_vs_conversions = rows.map((r) => ({
        Spend: r.Spend,
        Conversions: r.Conversions,
        Impressions: r.Impressions,
        Campaign: r.Campaign,
        Channel: r.Channel,
      }))

      return { campaign_clicks, channel_leads, spend_vs_conversions }
    }

    return requestJson(`${API_BASE_URL}/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async getInsights(rows: MarketingCampaignRow[]): Promise<{
    insights: Array<{ Insight: string; Value: string }>
  }> {
    if (isDemoMode()) {
      return {
        insights: [
          {
            Insight: 'Highest ROI Channel',
            Value: 'Email Newsletter drives an astronomical 2337% ROI with exceptionally low CAC ($48/conversion).',
          },
          {
            Insight: 'Top Volume Lead Generator',
            Value: 'Meta Ads and Google Search deliver 59% of combined enterprise and growth leads.',
          },
          {
            Insight: 'Budget Reallocation Opportunity',
            Value: 'Shift 15% budget from YouTube Video awareness into LinkedIn Sponsored B2B targeting for higher margin pipeline.',
          },
        ],
      }
    }

    return requestJson(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: rows }),
    })
  }

  static async uploadCsv(file: File) {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = parsed.rows as MarketingCampaignRow[]
      const campaigns = Array.from(new Set(rows.map((r) => r.Campaign).filter(Boolean))).sort()
      const channels = Array.from(new Set(rows.map((r) => r.Channel).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 8),
        campaigns,
        channels,
        columns: parsed.headers,
        kpis,
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson(`${API_BASE_URL}/upload-csv`, { method: 'POST', body: formData })
  }

  static async getCsvColumns(file: File) {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      return { columns: parsed.headers }
    }
    const formData = new FormData()
    formData.append('file', file)
    return requestJson(`${API_BASE_URL}/get-columns`, { method: 'POST', body: formData })
  }

  static async applyMapping(file: File, mapping: Record<string, string>) {
    if (isDemoMode()) {
      const parsed = await parseCsvFile(file)
      const rows = applyMappingToRows(parsed.rows, mapping) as MarketingCampaignRow[]
      const campaigns = Array.from(new Set(rows.map((r) => r.Campaign).filter(Boolean))).sort()
      const channels = Array.from(new Set(rows.map((r) => r.Channel).filter(Boolean))).sort()
      const kpis = calculateKpis(rows)

      return {
        data: rows,
        preview: rows.slice(0, 8),
        campaigns,
        channels,
        kpis,
      }
    }
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    Object.entries(mapping).forEach(([key, val]) => {
      if (val) params.set(key, val)
    })
    return requestJson(`${API_BASE_URL}/apply-mapping?${params.toString()}`, { method: 'POST', body: formData })
  }

  static downloadCsv(rows: any[], filename = 'marketing_filtered.csv') {
    exportToCsvFile(rows, filename)
  }
}
