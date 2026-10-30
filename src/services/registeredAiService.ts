import type { RegisteredAiServiceItem, SupportedIndustry } from '@/types/projectManagement'
import { isDemoMode } from './dataMode'
import { requestJson } from './apiClient'

export const REGISTERED_AI_SERVICES: RegisteredAiServiceItem[] = [
  {
    id: 'srv-sentiment-analysis',
    name: 'Customer Feedback Sentiment & Tone Classifier',
    slug: 'sentiment-analysis-engine',
    industry: 'Gen AI',
    description:
      'Multi-class sentiment and emotional nuance classifier trained on customer support feedback and reviews.',
    serviceUrl: 'http://127.0.0.1:8005/api/classify-sentiment',
    healthUrl: 'http://127.0.0.1:8005/health',
    status: 'active',
    version: '2.1.0',
    timeoutMs: 8000,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    inputSchema: {
      type: 'object',
      properties: {
        feedback_text: {
          type: 'string',
          label: 'Customer Feedback Text',
          description: 'Paste customer review, message, or transcript',
          required: true,
          default:
            'The predictive maintenance dashboard detected the thermal spike before catastrophic shutdown. Excellent reliability and responsive team!',
        },
        include_aspects: {
          type: 'boolean',
          label: 'Perform Aspect-Based Extraction',
          default: true,
        },
      },
      required: ['feedback_text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: { type: 'string', label: 'Primary Sentiment', format: 'badge' },
        confidence: { type: 'number', label: 'Model Confidence', format: 'badge' },
        tone: { type: 'string', label: 'Emotional Nuance', format: 'text' },
        key_aspects: { type: 'string', label: 'Extracted Aspects', format: 'text' },
      },
    },
  },
  {
    id: 'srv-pii-redactor',
    name: 'Enterprise PII Redaction & Masking Gateway',
    slug: 'pii-redaction-gateway',
    industry: 'Gen AI',
    description:
      'Automated NLP and regex entity recognizer identifying emails, phone numbers, SSNs, credit cards, and names.',
    serviceUrl: 'http://127.0.0.1:8006/api/redact-pii',
    healthUrl: 'http://127.0.0.1:8006/health',
    status: 'active',
    version: '1.4.0',
    timeoutMs: 10000,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    inputSchema: {
      type: 'object',
      properties: {
        document_text: {
          type: 'string',
          label: 'Raw Document Content',
          description: 'Document string containing potentially sensitive entities',
          required: true,
          default:
            'Please contact officer John Smith at jsmith@enterprise-partner.com or call +1-555-0199 regarding machine CNC-M-02 invoice #9821.',
        },
        masking_style: {
          type: 'string',
          label: 'Masking Style',
          enum: ['REDACTED_TAG', 'ASTERISKS', 'SYNTHETIC_REPLACEMENT'],
          default: 'REDACTED_TAG',
        },
      },
      required: ['document_text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        redacted_text: { type: 'string', label: 'Sanitized Output', format: 'text' },
        entities_found: { type: 'number', label: 'Entities Detected', format: 'badge' },
        risk_score: { type: 'string', label: 'Exposure Risk Rating', format: 'badge' },
      },
    },
  },
  {
    id: 'srv-doc-processor',
    name: 'Intelligent Document & Invoice Extractor',
    slug: 'intelligent-document-processor',
    industry: 'Gen AI',
    description:
      'Optical document understanding extracting line items, invoice totals, tax rates, and vendor entities.',
    serviceUrl: 'http://127.0.0.1:8007/api/extract-invoice',
    healthUrl: 'http://127.0.0.1:8007/health',
    status: 'active',
    version: '2.0.1',
    timeoutMs: 15000,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    inputSchema: {
      type: 'object',
      properties: {
        raw_invoice_text: {
          type: 'string',
          label: 'Document / Invoice Text',
          required: true,
          default:
            'INVOICE #INV-49201\nVendor: Acme Precision Tools Inc.\nDate: 2026-02-18\nItem 1: Replacement Spindle Bearings - $1,420.00\nItem 2: High-Vibration Damping Mount - $680.00\nTax (8%): $168.00\nTotal Due: $2,268.00',
        },
      },
      required: ['raw_invoice_text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', label: 'Vendor' },
        invoice_number: { type: 'string', label: 'Invoice No.' },
        total_amount: { type: 'string', label: 'Total Amount', format: 'badge' },
        status: { type: 'string', label: 'Audit Status', format: 'badge' },
      },
    },
  },
]

export class RegisteredAiService {
  static getServices(): RegisteredAiServiceItem[] {
    return REGISTERED_AI_SERVICES
  }

  static getServiceBySlug(slug: string): RegisteredAiServiceItem | null {
    return REGISTERED_AI_SERVICES.find((s) => s.slug === slug || s.id === slug) ?? null
  }

  static getServicesByIndustry(industry: SupportedIndustry): RegisteredAiServiceItem[] {
    return REGISTERED_AI_SERVICES.filter((s) => s.industry === industry)
  }

  static async checkHealth(serviceId: string): Promise<{ isOnline: boolean; latencyMs: number; statusText: string }> {
    const service = REGISTERED_AI_SERVICES.find((s) => s.id === serviceId)
    if (!service) {
      return { isOnline: false, latencyMs: 0, statusText: 'Service not found in registry' }
    }

    if (isDemoMode() || !service.healthUrl) {
      // Deterministic healthy mock
      return { isOnline: true, latencyMs: 42, statusText: 'Online (Simulated Runtime)' }
    }

    const start = performance.now()
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(service.healthUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      const latencyMs = Math.round(performance.now() - start)
      return {
        isOnline: res.ok,
        latencyMs,
        statusText: res.ok ? 'Online (Active)' : `Error: HTTP ${res.status}`,
      }
    } catch (e: any) {
      return {
        isOnline: false,
        latencyMs: Math.round(performance.now() - start),
        statusText: e.message || 'Service unavailable',
      }
    }
  }

  static async executeService(
    serviceId: string,
    inputs: Record<string, any>
  ): Promise<{ success: boolean; result: Record<string, any>; executionTimeMs: number; mode: 'demo' | 'live' }> {
    const service = REGISTERED_AI_SERVICES.find((s) => s.id === serviceId)
    if (!service) {
      throw new Error(`AI Service with ID "${serviceId}" is not registered.`)
    }

    // Validate required inputs
    const required = service.inputSchema.required || []
    for (const reqField of required) {
      if (!inputs[reqField] || String(inputs[reqField]).trim().length === 0) {
        throw new Error(`Missing required field: ${service.inputSchema.properties[reqField]?.label || reqField}`)
      }
    }

    const start = performance.now()

    if (isDemoMode()) {
      // Return realistic synthetic inference
      await new Promise((r) => setTimeout(r, 600)) // Simulated inference latency
      const elapsed = Math.round(performance.now() - start)

      if (service.slug === 'sentiment-analysis-engine') {
        const text = String(inputs.feedback_text || '').toLowerCase()
        const isPos = text.includes('excellent') || text.includes('great') || text.includes('good') || text.includes('love')
        const isNeg = text.includes('bad') || text.includes('fail') || text.includes('poor') || text.includes('delay')

        return {
          success: true,
          mode: 'demo',
          executionTimeMs: elapsed,
          result: {
            sentiment: isPos ? 'Positive' : isNeg ? 'Negative' : 'Neutral',
            confidence: '96.4%',
            tone: isPos ? 'Enthusiastic & Confident' : isNeg ? 'Critical & Frustrated' : 'Informative',
            key_aspects: 'System Reliability, Alert Speed, UI Usability',
          },
        }
      }

      if (service.slug === 'pii-redaction-gateway') {
        let text = String(inputs.document_text || '')
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g
        const phoneRegex = /\+?[\d-]{7,}/g
        const emails = text.match(emailRegex) || []
        const phones = text.match(phoneRegex) || []
        const count = emails.length + phones.length

        const sanitized = text
          .replace(emailRegex, '[EMAIL_REDACTED]')
          .replace(phoneRegex, '[PHONE_REDACTED]')

        return {
          success: true,
          mode: 'demo',
          executionTimeMs: elapsed,
          result: {
            redacted_text: sanitized,
            entities_found: count > 0 ? count : 2,
            risk_score: count > 1 ? 'High (Sanitized)' : 'Low (Safe)',
          },
        }
      }

      if (service.slug === 'intelligent-document-processor') {
        return {
          success: true,
          mode: 'demo',
          executionTimeMs: elapsed,
          result: {
            vendor_name: 'Acme Precision Tools Inc.',
            invoice_number: 'INV-49201',
            total_amount: '$2,268.00',
            status: 'Audit Verified (100% Match)',
          },
        }
      }

      return {
        success: true,
        mode: 'demo',
        executionTimeMs: elapsed,
        result: {
          output: 'Processed successfully (Simulated inference)',
        },
      }
    }

    // Live API mode
    try {
      const response = await requestJson<any>(service.serviceUrl, {
        method: 'POST',
        body: JSON.stringify(inputs),
      })
      const elapsed = Math.round(performance.now() - start)
      return {
        success: true,
        mode: 'live',
        executionTimeMs: elapsed,
        result: response,
      }
    } catch (e: any) {
      throw new Error(`AI Service request failed: ${e.message || 'Unknown network error'}`)
    }
  }
}
