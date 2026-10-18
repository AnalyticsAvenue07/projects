import { getProjectBySlug } from './projects'
import type { OverviewSection } from '@/types/projectContent'

/**
 * Predefined default overview sections for registered projects.
 * Preserves the exact original wording and structure shipped with each solution.
 */
export const defaultProjectOverviews: Record<string, OverviewSection[]> = {
  'ai-gold-negotiation': [
    {
      id: 'purpose',
      projectSlug: 'ai-gold-negotiation',
      title: 'Purpose',
      eyebrow: 'Purpose',
      content:
        'Analytics Avenue receives gold RFQs from buyers, reads the request, matches products, fetches live MCX gold price, calculates a compliant quote with a 30% pre-GST margin, generates a branded PDF, sends the quote email, and manages buyer negotiations with a 20% minimum margin floor.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'ai-gold-negotiation',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Automatically parse buyer RFQs from TXT, DOCX, and PDF files using AI document extraction.',
        'Match extracted line items to a gold product catalogue using ChromaDB vector search.',
        'Fetch live MCX gold price in INR/gram and combine it with purchase cost, making, wastage, packaging, and hallmark charges.',
        'Calculate transparent quotes using a 7-step pricing formula with guaranteed 30% pre-GST margin.',
        'Generate professional branded quote PDFs and auto-draft buyer emails for rapid commercial response.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'ai-gold-negotiation',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Avoid underpricing with every quote locked at 30% pre-GST margin and a 20% negotiation floor.',
        'Move from RFQ to quote in seconds with AI-powered product matching, live pricing, and PDF generation.',
        'Support multi-round negotiation workflows with ACCEPT / COUNTER / REJECT decision logic.',
        'Improve buyer confidence through a transparent pricing equation and detailed invoice breakdown.',
        'Reduce manual quote creation overhead and accelerate deal closure with auto-generated email drafts.',
      ],
      sortOrder: 2,
    },
    {
      id: 'pricing-equation',
      projectSlug: 'ai-gold-negotiation',
      title: 'Pricing Equation',
      eyebrow: 'Pricing Formula',
      content:
        'From CSV: C = PurchaseCost / g | M = Making / g | W = Wastage % | P = Packaging | H = Hallmark\nFrom Live: L = MCX Gold Price (INR / gram)',
      bullets: [
        'BaseCost/g = C + M + (C × W%)',
        'UnitRawCost = (BaseCost × Weight) + P + H',
        'MarketFactor = max(L / C, 1.0)',
        'AdjustedCost = UnitRawCost × MarketFactor',
        'SellingPrice = AdjustedCost ÷ 0.70 ← 30% margin',
        'CGST = SellingPrice × 1.5% | SGST = SellingPrice × 1.5%',
        'InvoicePrice = SellingPrice + CGST + SGST',
      ],
      sortOrder: 3,
    },
    {
      id: 'negotiation-logic',
      projectSlug: 'ai-gold-negotiation',
      title: 'Negotiation Logic',
      eyebrow: 'Deal Protocol',
      content:
        'Quote at 30% margin. Floor = 20% margin. Floor price is calculated as AdjustedCost ÷ 0.80 per item.\n\nAll math is handled in Python, while the LLM generates only the buyer-facing email content.',
      bullets: [
        'ACCEPT — Buyer price is greater than or equal to our quote.',
        'COUNTER — Buyer price is between the 20% floor and our quote; midpoint is offered.',
        'REJECT — Buyer price is below the 20% floor.',
      ],
      sortOrder: 4,
    },
  ],

  'ai-prescription': [
    {
      id: 'purpose',
      projectSlug: 'ai-prescription',
      title: 'What this tool does',
      eyebrow: 'Overview',
      description:
        'Generate personalised, AI-powered career prescriptions for aspiring data professionals — combining Groq LLaMA 3.3 70B with domain-specific career templates to produce a 3-page PDF and editable Word document.',
      content:
        'Replace manual career counseling and document synthesis with automated intelligence tailored for data science candidates.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'ai-prescription',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Supports 9 domains — Finance, Healthcare, Supply Chain, E-Commerce, HR Analytics, Automobile, Manufacturing, Retail, and Cyber Security.',
        'AI generates personalised prescription text with domain-specific bullets using Groq LLaMA 3.3 70B.',
        'Download as PDF (3 pages) or editable Word (.docx) document.',
        "Send the prescription directly to the candidate's email with CC support.",
        'Career table includes roles, challenges, key skills, and targeted companies per domain.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'ai-prescription',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Replace manual prescription writing — generate tailored career documents in seconds.',
        'Deliver consistent, professional-grade prescriptions to every prospective student.',
        'Send directly to candidates via email without leaving the app.',
        'Word export lets consultants make last-minute edits before sharing.',
        'Scale across hundreds of consultations without additional effort.',
      ],
      sortOrder: 2,
    },
  ],

  'marketing-campaign-performance-analyzer': [
    {
      id: 'purpose',
      projectSlug: 'marketing-campaign-performance-analyzer',
      title: 'Purpose',
      eyebrow: 'Campaign Intelligence',
      content:
        'Evaluate cross-channel campaign efficiency, lead progression, customer acquisition cost (CAC), and channel return on ad spend (ROAS) using dynamic filtering and interactive analytics.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'marketing-campaign-performance-analyzer',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Multi-channel conversion funnel tracking across Google, Meta, LinkedIn, and Email campaigns.',
        'CAC vs LTV correlation matrices and ROAS benchmarks by audience segment.',
        'Anomaly detection for conversion drop-offs and budget burn rates.',
        'Automated channel re-allocation recommendations based on marginal conversion efficiency.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'marketing-campaign-performance-analyzer',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Cut wasted ad spend by up to 28% through prompt identification of underperforming channels.',
        'Maximize blended ROAS with predictive budget attribution models.',
        'Accelerate executive reporting cycles from days to instantaneous live dashboards.',
      ],
      sortOrder: 2,
    },
  ],

  'healthscope-insights': [
    {
      id: 'purpose',
      projectSlug: 'healthscope-insights',
      title: 'Purpose',
      eyebrow: 'Healthcare Operations',
      content:
        'Deliver real-time clinical and operational visibility into patient volumes, doctor caseloads, departmental revenue, and hospital bed occupancy to drive operational excellence.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'healthscope-insights',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Department-level patient census tracking and admission velocity metrics.',
        'Doctor utilization rates, wait time indices, and specialty consult distributions.',
        'Revenue cycle analytics by insurer, procedure code, and bed classification.',
        'Early warning alerts for department overcrowding and discharge bottlenecks.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'healthscope-insights',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduce average Emergency Department boarding times by 22%.',
        'Optimize staffing rosters to align with empirical hourly patient influx.',
        'Improve bed turnover rates while preserving strict patient safety ratios.',
      ],
      sortOrder: 2,
    },
  ],

  'solar-power-generation-forecasting-lab': [
    {
      id: 'purpose',
      projectSlug: 'solar-power-generation-forecasting-lab',
      title: 'Purpose',
      eyebrow: 'Telemetry Intelligence',
      content:
        'SCADA plant data and weather conditions are combined to forecast generation, compare actual against forecast output, and uncover the weather patterns that drive the largest prediction errors.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'solar-power-generation-forecasting-lab',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Real-time ingestion of solar irradiance (GHI, DNI, DHI) and ambient weather telemetry.',
        'Multi-step lookahead generation forecasting using gradient boosted regressors.',
        'Automated MAE, RMSE, and MAPE performance tracking against grid commitment quotas.',
        'Soiling and temperature de-rating sensitivity analysis by inverter cluster.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'solar-power-generation-forecasting-lab',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Minimize grid deviation penalty tariffs through accurate day-ahead scheduling.',
        'Proactively schedule panel washing schedules based on irradiance loss indicators.',
        'Enhance revenue realization for utility-scale solar asset owners.',
      ],
      sortOrder: 2,
    },
  ],

  'warehouse-operations-analytics': [
    {
      id: 'purpose',
      projectSlug: 'warehouse-operations-analytics',
      title: 'Purpose',
      eyebrow: 'Fulfillment Flows',
      content:
        'Optimize fulfillment flows by identifying congestion zones, rebalancing picking patterns, and training staff based on ML productivity scorecards.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'warehouse-operations-analytics',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Warehouse heatmaps & congestion analysis by zone and aisle.',
        'Pick-path & travel distance efficiency tracking.',
        'Slotting score & SKU-class optimization models.',
        'Picker productivity benchmarking & workload profiling.',
        'Delay reasons root-cause analytics and equipment utilization.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'warehouse-operations-analytics',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Faster order fulfillment & higher throughput across shifts.',
        'Lower labor + operational cost per pick.',
        'Reduced travel congestion & picker fatigue.',
        'Data-backed layout & slotting redesigns.',
        'High predictability during holiday peak order surges.',
      ],
      sortOrder: 2,
    },
  ],

  'route-optimization-logistics-efficiency': [
    {
      id: 'purpose',
      projectSlug: 'route-optimization-logistics-efficiency',
      title: 'Purpose',
      eyebrow: 'Logistics Intelligence',
      content:
        'Cut route costs and delivery time by optimizing routes, predicting delays & fuel usage, and prioritizing high-impact fleet actions.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'route-optimization-logistics-efficiency',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Route efficiency scoring and anomaly detection across delivery corridors.',
        'Predictive travel time and fuel consumption models.',
        'Turn-by-turn waypoint rebalancing to minimize left-turns and choke points.',
        'Actionable fleet playbooks for inclement weather and peak congestion.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'route-optimization-logistics-efficiency',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduce fleet diesel expenditure by up to 18% per delivery cycle.',
        'Elevate on-time SLA fulfillment rates to above 98.4%.',
        'Enhance driver safety and vehicle lifecycle longevity.',
      ],
      sortOrder: 2,
    },
  ],

  'real-estate-price-vs-property-features-analyzer': [
    {
      id: 'purpose',
      projectSlug: 'real-estate-price-vs-property-features-analyzer',
      title: 'Property valuation across features that actually move price',
      eyebrow: 'Overview',
      content:
        'This workspace is built to examine how pricing shifts by city, property type, area, bedrooms, bathrooms, age, and parking, then convert those patterns into a simple ML-backed valuation workflow.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'real-estate-price-vs-property-features-analyzer',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Feature-level pricing analysis',
        'Interactive dashboards',
        'City & property-type comparisons',
        'ML-driven price estimation',
        'Visual insights on area, BHK, bathrooms & age impact',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'real-estate-price-vs-property-features-analyzer',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Better pricing transparency',
        'Improved negotiation leverage',
        'Accurate investment planning',
        'Faster decision-making using data-driven valuation',
        'Enhanced buyer & investor confidence',
      ],
      sortOrder: 2,
    },
  ],

  'ev-dynamic-range-prediction-anxiety-reduction-lab': [
    {
      id: 'purpose',
      projectSlug: 'ev-dynamic-range-prediction-anxiety-reduction-lab',
      title: 'Dynamic Range Prediction & Anxiety Reduction Lab',
      eyebrow: 'Electric Mobility Analytics',
      content:
        'Bridge the gap between OEM displayed range and actual real-world EV range using predictive machine learning models that factor in driving behavior, weather, payload, and road conditions.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'ev-dynamic-range-prediction-anxiety-reduction-lab',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Predicts realistic remaining range with machine learning.',
        'Quantifies OEM over/under-promise across diverse routes.',
        'Flags anxiety-prone trips in advance before battery depletion.',
        'Segments drivers by behavior and regenerative braking efficiency.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'ev-dynamic-range-prediction-anxiety-reduction-lab',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Higher driver trust through transparent real-time range estimation.',
        'Fewer roadside breakdowns and costly emergency towing events.',
        'Better charging decisions with proactive waypoint recommendations.',
        'Faster enterprise EV fleet adoption and driver confidence.',
      ],
      sortOrder: 2,
    },
  ],

  'machine-failure-predictive-maintenance': [
    {
      id: 'purpose',
      projectSlug: 'machine-failure-predictive-maintenance',
      title: 'Early failure signal detection for predictive maintenance',
      eyebrow: 'Manufacturing Intelligence',
      content:
        'This lab combines machine sensor telemetry and maintenance events to identify early failure signals, quantify breakdown risk, and support predictive maintenance decisions.',
      bullets: [
        'Track temperature, vibration, RPM, load & anomaly signals',
        'Calculate failure incidence across machines',
        'Train ML models to predict failure risk',
        'Identify high-risk assets before breakdown',
      ],
      sortOrder: 0,
    },
    {
      id: 'business-impact',
      projectSlug: 'machine-failure-predictive-maintenance',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduced unplanned downtime',
        'Extended machine lifespan',
        'Lower maintenance costs',
        'Improved OEE monitoring',
      ],
      sortOrder: 1,
    },
  ],

  'intelligent-document-processor': [
    {
      id: 'purpose',
      projectSlug: 'intelligent-document-processor',
      title: 'Intelligent Document Processor',
      eyebrow: 'Gen AI & Document Intelligence',
      content:
        'Analyze documents with AI-driven OCR, signature detection, and structured extraction — enabling rapid processing of invoices, contracts, identity documents, and other enterprise files with searchable JSON output.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'intelligent-document-processor',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Supports multi-file upload for PDF, JPG, PNG, GIF and other common document formats.',
        'Extracts document type, fields, signature presence, raw text, and structured JSON payloads.',
        'Signature verification highlights detected signatures and returns base64 preview images.',
        'Demo mode runs on internal sample documents for fast evaluation without upload.',
        'Backend integration with FastAPI and OpenCV-based document triage.',
        'Designed for enterprise document automation and compliance workflows.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'intelligent-document-processor',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduce manual document triage and OCR effort across finance, legal, and operations.',
        'Automate signature detection for contracts and compliance documents.',
        'Generate structured output ready for ingestion into downstream analytics systems.',
        'Enable faster document review and validation with AI-assisted summaries.',
        'Deliver consistent results across scanned and digital documents using hybrid OCR + LLM logic.',
      ],
      sortOrder: 2,
    },
  ],

  'pii-redaction': [
    {
      id: 'purpose',
      projectSlug: 'pii-redaction',
      title: 'Automated PII Redaction',
      eyebrow: 'Purpose & Mission',
      content:
        'Automatically detect and redact Personally Identifiable Information (PII) from enterprise documents using GPT-4o vision and structured AI pipelines — preserving document structure while ensuring full data privacy compliance across PDF, Word, Excel, image, and text file formats.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'pii-redaction',
      title: 'Core Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Supports PDF, DOCX, XLSX, TXT, and image files (JPG, PNG, TIFF, GIF).',
        'Multimodal AI — uses GPT-4o vision to process scanned documents and images.',
        'Detects Names, Dates, ID Numbers, Addresses, Emails, Phone Numbers, and Financial Info.',
        'Structured output via Pydantic — returns redacted text and full PII entity log.',
        'Batch processing — upload and redact multiple files in one run.',
        'Built-in demo mode with internal sample documents for quick evaluation.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'pii-redaction',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Accelerate GDPR, HIPAA, and data privacy compliance across document workflows.',
        'Eliminate manual redaction effort — process hundreds of documents in minutes.',
        'Reduce risk of accidental PII exposure in shared reports and datasets.',
        'Audit-ready PII detection logs for regulatory reporting and traceability.',
        'Scalable to enterprise document volumes with batch upload support.',
      ],
      sortOrder: 2,
    },
  ],

  'sentiment-analyzer': [
    {
      id: 'purpose',
      projectSlug: 'sentiment-analyzer',
      title: 'Sentiment and Tone Categorization using LLMs',
      eyebrow: 'Purpose',
      content:
        'Automatically analyze customer feedback at scale by classifying sentiment and tone using Gemini 2.5 Pro — enabling teams to understand customer emotions, prioritize responses, and surface actionable insights from large volumes of review text without manual effort.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'sentiment-analyzer',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Classifies sentiment as Positive, Negative, or Neutral for each review.',
        'Identifies dominant tone across 10 categories including Joyful, Angry, Formal, and Urgent.',
        'Provides a 2-sentence AI explanation referencing specific phrases from the text.',
        'Batch processing with live progress bar and per-item timing metrics.',
        'Supports Excel file upload or built-in demo mode with sample data.',
        'Exports full analysis report as a downloadable CSV.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'sentiment-analyzer',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduce manual feedback review time from hours to minutes.',
        'Identify angry or abusive feedback instantly for priority escalation.',
        'Track sentiment trends across products, regions, or time periods.',
        'Improve customer experience strategy with data-driven tone insights.',
        'Scalable to thousands of reviews with consistent, unbiased AI classification.',
      ],
      sortOrder: 2,
    },
  ],

  'offer-letter': [
    {
      id: 'purpose',
      projectSlug: 'offer-letter',
      title: 'Purpose',
      eyebrow: 'HR Automation',
      content:
        'Convert HR recruitment workflows into polished, compliant offer letters, internship certificates, and downloadable candidate communications — with integrated CTC calculation, custom salary breakdown, and multi-template generation.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'offer-letter',
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        'Generate pre-offer letters with training, probation terms, and stipend/incentive options.',
        'Calculate detailed annual CTC breakups across Basic, HRA, Special Allowance, and PF deductions.',
        'Create official employment offer letters with custom job responsibilities and joining instructions.',
        'Issue internship certificates with university details, duration, and evaluation notes.',
        'Export documents directly to PDF and DOCX with consistent branding.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'offer-letter',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduce offer letter generation cycle time from hours to under 2 minutes.',
        'Eliminate salary calculation errors and compliance discrepancies.',
        'Maintain a searchable audit history of all dispatched letters and certificates.',
        'Standardize candidate onboarding communications across departments.',
      ],
      sortOrder: 2,
    },
  ],

  'patient-flow-navigator': [
    {
      id: 'purpose',
      projectSlug: 'patient-flow-navigator',
      title: 'What this lab does',
      eyebrow: 'Healthcare Intelligence',
      content:
        'Track patient journeys, treatment patterns, readmission risk, and cost dynamics. PatientFlow Navigator lets hospitals move from reactive firefighting to proactive care planning.',
      sortOrder: 0,
    },
    {
      id: 'capabilities',
      projectSlug: 'patient-flow-navigator',
      title: 'Core Functionality',
      eyebrow: 'Capabilities',
      bullets: [
        'Profiles patient cohorts by disease, age, risk, and department.',
        'Measures length of stay, treatment cost, and readmission patterns.',
        'Flags high-risk patients using ML classification.',
        'Predicts treatment cost for upcoming admissions.',
        'Supports capacity and resource planning for hospitals.',
      ],
      sortOrder: 1,
    },
    {
      id: 'business-impact',
      projectSlug: 'patient-flow-navigator',
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Reduced avoidable readmissions.',
        'Optimized bed and staff allocation.',
        'Accurate budget forecasts for departments.',
        'Improved patient outcomes through early risk intervention.',
      ],
      sortOrder: 2,
    },
  ],
}

/**
 * Normalizes and returns default overview sections for ANY project slug.
 * If a custom set is defined in defaultProjectOverviews, returns that.
 * Otherwise, dynamically derives clean, professional overview sections from project metadata.
 * Guarantees zero crashing and zero hardcoded barriers for new projects.
 */
export function getDefaultSectionsForProject(projectSlug: string): OverviewSection[] {
  const custom = defaultProjectOverviews[projectSlug]
  if (custom && custom.length > 0) {
    return custom.map((s, idx) => ({
      ...s,
      projectSlug,
      sortOrder: s.sortOrder ?? idx,
      isCustom: false,
    }))
  }

  const projectMeta = getProjectBySlug(projectSlug)

  const title = projectMeta ? projectMeta.title : projectSlug.replace(/-/g, ' ')
  const description = projectMeta
    ? projectMeta.description
    : `Analytics Avenue solution for ${title} providing end-to-end data analytics and ML workflows.`
  const category = projectMeta ? projectMeta.category : 'Enterprise Solution'

  return [
    {
      id: 'purpose',
      projectSlug,
      title: 'Purpose',
      eyebrow: category,
      content: description,
      sortOrder: 0,
      isCustom: false,
    },
    {
      id: 'capabilities',
      projectSlug,
      title: 'Capabilities',
      eyebrow: 'Capabilities',
      bullets: [
        `Automated ingestion, validation, and analytics pipeline tailored for ${title}.`,
        'Interactive filtering, KPI tracking, and domain-specific metric distributions.',
        'Machine learning models generating predictive signals and action playbooks.',
        'Enterprise-grade visual summaries and export capabilities.',
      ],
      sortOrder: 1,
      isCustom: false,
    },
    {
      id: 'business-impact',
      projectSlug,
      title: 'Business Impact',
      eyebrow: 'Business Impact',
      bullets: [
        'Accelerate time-to-insight from days to real-time interactive dashboards.',
        'Eliminate manual calculation errors with standardized algorithmic models.',
        'Drive measurable ROI through evidence-based operational decisions.',
      ],
      sortOrder: 2,
      isCustom: false,
    },
  ]
}
