import type { ProjectRegistryItem } from '@/types/domain'

export const projectRegistry: ProjectRegistryItem[] = [
  {
    id: 'ai-gold-negotiation',
    title: 'AI Gold Negotiation Orchestrator',
    slug: 'ai-gold-negotiation',
    route: '/projects/ai-gold-negotiation',
    category: 'Gen AI',
    description:
      'Gold RFQ-to-quote automation with live MCX pricing, margin calculations, branded PDF output, and guided negotiation workflows.',
    visible: true,
    featured: true,
  },
  {
    id: 'marketing-campaign-performance-analyzer',
    title: 'Marketing Campaign Performance Analyzer',
    slug: 'marketing-campaign-performance-analyzer',
    route: '/projects/marketing-campaign-performance-analyzer',
    category: 'Marketing Analytics',
    description:
      'FastAPI and Pandas dashboard for campaign performance, lead generation, conversion efficiency, and ROI analysis across marketing channels.',
    visible: true,
    featured: true,
  },
  {
    id: 'ai-prescription',
    title: 'AI Prescription Generator',
    slug: 'ai-prescription',
    route: '/projects/ai-prescription-detail',
    category: 'Gen AI',
    description:
      'Clinical-style prescription drafting assistant powered by generative AI for fast, compliant medication orders and care plans.',
    visible: true,
    featured: true,
  },
  {
    id: 'healthscope-insights',
    title: 'Healthscope Insights',
    slug: 'healthscope-insights',
    route: '/projects/healthscope-insights-detail',
    category: 'Healthcare',
    description:
      'Healthcare analytics and insights platform for hospital performance, patient trends, revenue, and operational intelligence.',
    visible: true,
    featured: true,
  },
  {
    id: 'patient-visit-analytics-hospital-performance',
    title: 'Patient Visit Analytics & Hospital Performance',
    slug: 'patient-visit-analytics-hospital-performance',
    route: '/projects/patient-visit-analytics-hospital-performance',
    category: 'Healthcare',
    description:
      'Patient visit, admission, revenue, and doctor performance analytics with dynamic filters, forecasting signals, and admission prediction.',
    visible: true,
    featured: true,
  },
  {
    id: 'patientflow-navigator',
    title: 'PatientFlow Navigator',
    slug: 'patientflow-navigator',
    route: '/projects/patientflow-navigator',
    category: 'Healthcare',
    description:
      'Patient journey, readmission risk, treatment cost, and hospital capacity analytics with dataset loading, CSV upload, column mapping, charts, ML predictions, and automated insights.',
    visible: true,
    featured: true,
  },
  {
    id: 'real-estate-price-vs-property-features-analyzer',
    title: 'Real Estate Price vs Property Features Analyzer',
    slug: 'real-estate-price-vs-property-features-analyzer',
    route: '/projects/real-estate-price-vs-property-features-analyzer',
    category: 'Real Estate',
    description:
      'Feature-level real estate pricing analysis with property validation, dynamic filters, interactive charts, ML price prediction, and automated valuation insights.',
    visible: true,
    featured: true,
  },
  {
    id: 'ev-dynamic-range-prediction-anxiety-reduction-lab',
    title: 'EV Dynamic Range Prediction & Anxiety Reduction Lab',
    slug: 'ev-dynamic-range-prediction-anxiety-reduction-lab',
    route: '/projects/ev-dynamic-range-prediction-anxiety-reduction-lab',
    category: 'EV',
    description:
      'EV range prediction and anxiety reduction lab with default dataset loading, CSV uploads, manual mapping, ML range prediction, anxiety classification, and driver clustering.',
    visible: true,
    featured: true,
  },
  {
    id: 'ev-charging-station-fault-detection-lab',
    title: 'EV Charging Station Fault Detection Lab',
    slug: 'ev-charging-station-fault-detection-lab',
    route: '/projects/ev-charging-station-fault-detection-lab',
    category: 'EV',
    description:
      'EV charger fault detection and predictive maintenance lab with charger filters, thermal risk monitoring, fault classification, anomaly detection, and automated insights.',
    visible: true,
    featured: true,
  },
  {
    id: 'solar-power-generation-forecasting-lab',
    title: 'Solar Power Generation Forecasting Lab',
    slug: 'solar-power-generation-forecasting-lab',
    route: '/projects/solar-power-generation-forecasting-lab',
    category: 'Solar Power',
    description:
      'Solar generation forecasting dashboard for SCADA telemetry, weather impact analysis, forecast accuracy, and plant ranking.',
    visible: true,
    featured: true,
  },
  {
    id: 'pv-panel-degradation-intelligence-lab',
    title: 'PV Panel Degradation Intelligence Lab',
    slug: 'pv-panel-degradation-intelligence-lab',
    route: '/projects/pv-panel-degradation-intelligence-lab',
    category: 'Solar Power',
    description:
      'Panel-level degradation intelligence for efficiency loss monitoring, hotspot detection, soiling analysis, and temperature stress correlation.',
    visible: true,
    featured: true,
  },
  {
    id: 'inverter-failure-prediction-lab',
    title: 'Inverter Failure Prediction Lab',
    slug: 'inverter-failure-prediction-lab',
    route: '/projects/inverter-failure-prediction-lab',
    category: 'Solar Power',
    description:
      'Inverter telemetry monitoring and failure prediction lab for thermal stress detection, fault analysis, and preventive maintenance planning.',
    visible: true,
    featured: true,
  },
  {
    id: 'intelligent-document-processor',
    title: 'Intelligent Document Processor',
    slug: 'intelligent-document-processor',
    route: '/projects/intelligent-document-processor',
    category: 'Gen AI',
    description:
      'Document triage and OCR workflow for invoices, contracts, signatures, and identity documents with structured extraction.',
    visible: true,
  },
  {
    id: 'machine-failure-predictive-maintenance-lab',
    title: 'Machine Failure & Predictive Maintenance Lab',
    slug: 'machine-failure-predictive-maintenance-lab',
    route: '/projects/machine-failure-predictive-maintenance-lab',
    category: 'Manufacturing',
    description:
      'Machine sensor telemetry and predictive maintenance analytics for failure detection, maintenance prioritization, and downtime reduction.',
    visible: true,
    featured: true,
  },
  {
    id: 'order-to-delivery-analytics-lab',
    title: 'Order-to-Delivery Analytics Lab',
    slug: 'order-to-delivery-analytics-lab',
    route: '/projects/order-to-delivery-analytics-lab',
    category: 'Manufacturing',
    description:
      'Lead-time analytics lab for tracking scheduling delays, production delays, machine delays, dispatch delays, and delivery prediction.',
    visible: true,
    featured: true,
  },
  {
    id: 'inventory-pileup-shortage-analytics-lab',
    title: 'Inventory Pileup & Shortage Analytics Lab',
    slug: 'inventory-pileup-shortage-analytics-lab',
    route: '/projects/inventory-pileup-shortage-analytics-lab',
    category: 'Manufacturing',
    description:
      'Inventory analytics lab for tracking demand, production, procurement, safety stock risks, shortage and pileup events, and inventory strategy simulation.',
    visible: true,
    featured: true,
  },
  {
    id: 'order-fulfillment-sla-analytics',
    title: 'Order Fulfillment & SLA Analytics',
    slug: 'order-fulfillment-sla-analytics',
    route: '/projects/order-fulfillment-sla-analytics',
    category: 'Supply Chain',
    description:
      'Fulfillment analytics workspace for SLA breach prediction, warehouse trend analysis, and operations playbooks.',
    visible: true,
    featured: true,
  },
  {
    id: 'route-optimization-logistics-efficiency',
    title: 'Route Optimization & Logistics Efficiency',
    slug: 'route-optimization-logistics-efficiency',
    route: '/projects/route-optimization-logistics-efficiency',
    category: 'Supply Chain',
    description:
      'FastAPI-powered route optimization and logistics intelligence platform with cost simulation, anomaly detection, EDA charts, and action playbooks.',
    visible: true,
    featured: true,
  },
  {
    id: 'warehouse-operations-analytics',
    title: 'Warehouse Operations Analytics',
    slug: 'warehouse-operations-analytics',
    route: '/projects/warehouse-operations-analytics',
    category: 'Supply Chain',
    description:
      'Analyse picking efficiency, slotting, layout, and equipment usage. Use this to rebalance workload, resolve congestion, and cut operational costs.',
    visible: true,
    featured: true,
  },
  {
    id: 'multimodal-rag',
    title: 'Multimodal RAG System',
    slug: 'multimodal-rag',
    route: '/projects/multimodal-rag',
    category: 'Gen AI',
    description:
      'Retrieval-augmented generation system that processes text and images for intelligent document understanding and knowledge insights.',
    visible: true,
  },
  {
    id: 'offer-letter-generator',
    title: 'Offer Letter Generator',
    slug: 'offer-letter-generator',
    route: '/projects/offerletter-generator',
    category: 'HR',
    description:
      'AI-powered HR automation tool for generating offer letters, internship certificates, and downloadable employment documents instantly.',
    visible: true,
  },
  {
    id: 'pii-redaction',
    title: 'PII Redaction Engine',
    slug: 'pii-redaction',
    route: '/projects/pii-redaction',
    category: 'Gen AI',
    description:
      'Automated redaction pipeline for identifying and masking personally identifiable information from documents at scale.',
    visible: true,
  },
  {
    id: 'real-estate-demand-forecasting-lab',
    title: 'Real Estate Demand Forecasting Lab',
    slug: 'real-estate-demand-forecasting-lab',
    route: '/projects/real-estate-demand-forecasting-lab',
    category: 'Real Estate',
    description:
      'Demand forecasting platform for real estate markets with price trends, monthly projections, and property analytics.',
    visible: true,
  },
  {
    id: 'real-estate-intelligence-suite',
    title: 'Real Estate Intelligence Suite',
    slug: 'real-estate-intelligence-suite',
    route: '/projects/real-estate-intelligence-suite',
    category: 'Real Estate',
    description:
      'Integrated real estate analytics suite for listings, market intelligence, and property performance dashboards.',
    visible: true,
  },
  {
    id: 'sentiment-analyzer',
    title: 'AI Customer Feedback Analyzer',
    slug: 'sentiment-analyzer',
    route: '/projects/sentiment-analyzer',
    category: 'Gen AI',
    description:
      'Feedback analysis platform for sentiment, tone classification, and batch processing of customer responses.',
    visible: true,
  },
]

export function getProjectBySlug(slug: string): ProjectRegistryItem | null {
  return projectRegistry.find((project) => project.slug === slug) ?? null
}

export function getAllProjects(): ProjectRegistryItem[] {
  return [...projectRegistry]
}

export function getVisibleProjects(): ProjectRegistryItem[] {
  return projectRegistry.filter((project) => project.visible)
}

export function getProjectByRoute(route: string): ProjectRegistryItem | null {
  return projectRegistry.find((project) => project.route === route) ?? null
}

export function getProjectSlugs(): string[] {
  return projectRegistry.map((project) => project.slug)
}
