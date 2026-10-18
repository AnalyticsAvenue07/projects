/**
 * Realistic Demo Data for HR and Gen AI Domains
 * Covers:
 * 1. Offer Letter Generator
 * 2. PII Redaction Engine
 * 3. AI Customer Feedback Analyzer (Sentiment Analyzer)
 * 4. Intelligent Document Processor (IDP)
 * 5. AI Prescription Generator
 */

export const DEMO_SENTIMENT_DATA = [
  {
    original_text: 'The onboarding analytics module saved our operations team over 15 hours in the very first week. Absolutely phenomenal accuracy!',
    sentiment: 'Positive' as const,
    tone: 'Delighted & Appreciative',
    analysis: 'Strong positive feedback regarding significant time savings and accuracy in operational workflows.',
  },
  {
    original_text: 'Dashboard takes over 8 seconds to load on mobile browsers when viewing large fleet telemetry. Needs optimization.',
    sentiment: 'Negative' as const,
    tone: 'Frustrated',
    analysis: 'Performance complaint regarding mobile load latency during large dataset rendering.',
  },
  {
    original_text: 'The predictive maintenance alerts are generally helpful, though we received two false positive notifications on Tuesday.',
    sentiment: 'Neutral' as const,
    tone: 'Constructive & Balanced',
    analysis: 'Acknowledges utility of predictive alerts while pointing out occasional false positive occurrences.',
  },
  {
    original_text: 'Customer support answered our ticket within 10 minutes and provided a clean SQL migration script. Exceptional service!',
    sentiment: 'Positive' as const,
    tone: 'Grateful & Enthusiastic',
    analysis: 'Highlights fast responsiveness and effective problem resolution by the support team.',
  },
  {
    original_text: 'The CSV column mapping wizard is intuitive and saved us from manual spreadsheet reshaping. Very well built.',
    sentiment: 'Positive' as const,
    tone: 'Satisfied',
    analysis: 'Positive appraisal of user experience and automated spreadsheet schema transformation.',
  },
  {
    original_text: 'Export button failed to generate the PDF report when filtering by multiple warehouse zones simultaneously.',
    sentiment: 'Negative' as const,
    tone: 'Disappointed',
    analysis: 'Functional bug reported during multi-zone filtered report export generation.',
  },
  {
    original_text: 'System metrics and uptime have been consistent since the latest release. No major issues observed.',
    sentiment: 'Neutral' as const,
    tone: 'Objective',
    analysis: 'Neutral confirmation of steady uptime and system stability following recent deployment.',
  },
]

export const DEMO_PII_RESULTS = [
  {
    file_name: 'candidate_resume_john_doe.pdf',
    redacted_text: 'Candidate: [NAME_REDACTED]\nContact: [EMAIL_REDACTED], Phone: [PHONE_REDACTED]\nAddress: 42 Palm Grove, Bangalore\nAadhaar: [AADHAAR_REDACTED], PAN: [PAN_REDACTED]\nSummary: Senior Full Stack Engineer with 7+ years building enterprise SaaS.',
    detected_pii: ['John Doe (Name)', 'john.doe@example.com (Email)', '+91 98765 43210 (Phone)', 'XXXX-XXXX-1234 (Aadhaar)', 'ABCDE1234F (PAN)'],
    pii_count: 5,
    pii_types: ['NAME', 'EMAIL', 'PHONE', 'AADHAAR', 'PAN'],
  },
  {
    file_name: 'vendor_invoice_techcorp.pdf',
    redacted_text: 'Invoice To: [NAME_REDACTED] Enterprises\nGSTIN: [GSTIN_REDACTED]\nBank Acc: [BANK_ACC_REDACTED], IFSC: HDFC0001234\nAuthorized Signatory: [NAME_REDACTED]\nTotal Payable: INR 2,45,000',
    detected_pii: ['Acme Enterprises (Org)', '29ABCDE1234F1Z5 (GSTIN)', '50100234567890 (Bank Account)'],
    pii_count: 3,
    pii_types: ['NAME', 'GSTIN', 'BANK_ACCOUNT'],
  },
]

export const DEMO_IDP_RESULTS = [
  {
    file_name: 'tax_invoice_inv_8820.pdf',
    document_type: 'Tax Invoice',
    signature_present: true,
    extracted_data: {
      invoice_number: 'INV-2026-8820',
      invoice_date: '2026-02-10',
      vendor_name: 'Apex Cloud Solutions Pvt Ltd',
      customer_name: 'Analytics Avenue Innovations',
      subtotal: 125000,
      tax_amount: 22500,
      total_amount: 147500,
      currency: 'INR',
      due_date: '2026-03-12',
    },
    raw_text: 'TAX INVOICE\nInvoice #: INV-2026-8820\nDate: 10-Feb-2026\nVendor: Apex Cloud Solutions Pvt Ltd\nBilled To: Analytics Avenue Innovations\nItems: Cloud Hosting & ML Telemetry\nTotal: INR 147,500\nDigitally Signed by Authorized Officer',
  },
  {
    file_name: 'employment_agreement_signed.pdf',
    document_type: 'Legal Agreement',
    signature_present: true,
    extracted_data: {
      agreement_type: 'Employment Non-Disclosure Agreement',
      effective_date: '2026-02-01',
      employee_name: 'Siddharth Raman',
      designation: 'Senior Data Scientist',
      jurisdiction: 'Bengaluru, Karnataka',
      term_years: 3,
    },
    raw_text: 'EMPLOYMENT & CONFIDENTIALITY AGREEMENT\nEffective Date: February 1, 2026\nBetween Analytics Avenue Innovations and Siddharth Raman\nDesignation: Senior Data Scientist\nSigned and Executed.',
  },
]

export const DEMO_OFFER_LETTER_TEMPLATES = {
  roles: [
    'Data Analyst',
    'Senior Data Scientist',
    'Machine Learning Engineer',
    'Business Intelligence Specialist',
    'Cloud Data Engineer',
    'Product Analytics Lead',
  ],
  responsibilities: {
    'Data Analyst': [
      'Analyze complex transactional and product telemetry data to discover trends.',
      'Build, maintain, and automate production Power BI & Superset dashboards.',
      'Collaborate with cross-functional product stakeholders to define core operational KPIs.',
      'Execute SQL extractions, exploratory data analysis, and predictive cohort evaluations.',
    ],
    'Senior Data Scientist': [
      'Architect and deploy production-grade machine learning models for forecasting and classification.',
      'Conduct statistical hypothesis testing and feature engineering on petabyte-scale data lakes.',
      'Partner with software engineering teams to package ML pipelines via FastAPI microservices.',
      'Mentor junior analytics team members in predictive modelling and causal inference.',
    ],
    'Machine Learning Engineer': [
      'Design, train, and optimize distributed deep learning and classical ML models.',
      'Deploy low-latency containerized inference endpoints with automated CI/CD.',
      'Implement real-time feature stores, drift detection, and automated model retraining.',
      'Optimize GPU throughput and quantization for edge and cloud deployment.',
    ],
  },
}
