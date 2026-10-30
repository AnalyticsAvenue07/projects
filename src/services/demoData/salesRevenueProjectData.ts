import type { ProjectCatalogItem, ProjectDocumentItem } from '@/types/projectManagement'
import salesRevenueNotebookConfig from './salesRevenueNotebook.json'

export const SALES_REVENUE_FEATURES = [
  'ad_spend_tv',
  'ad_spend_digital',
  'ad_spend_radio',
  'store_footfall',
  'discount_percentage',
  'num_sales_staff',
  'competitor_count_nearby',
  'avg_product_price',
  'store_size_sqft',
  'customer_satisfaction_score',
  'social_media_engagement_score',
  'marketing_email_count',
  'is_holiday_season_flag',
  'loyalty_program_flag',
  'online_orders_flag',
] as const

export const SAMPLE_SALES_REVENUE_CSV = `ad_spend_tv,ad_spend_digital,ad_spend_radio,store_footfall,discount_percentage,num_sales_staff,competitor_count_nearby,avg_product_price,store_size_sqft,customer_satisfaction_score,social_media_engagement_score,marketing_email_count,is_holiday_season_flag,loyalty_program_flag,online_orders_flag,monthly_revenue
3815.41,16648.5,13100.21,2338,2.7,4,1,3554.06,5922,5.4,65.6,26,0,1,1,274147.34
38995.94,7200.53,1006.93,3942,18.9,28,9,2312.22,7206,3.4,60.1,7,1,1,0,337236.2
21920.46,8270.69,12977.58,4527,30.0,20,7,519.88,14161,9.0,84.9,33,0,1,0,351546.74
36173.26,18212.41,10972.85,4152,33.2,29,2,4059.6,11662,6.3,22.7,6,0,0,1,367392.5
48899.48,1859.73,12036.76,3636,3.6,13,9,2914.6,14102,10.0,12.9,33,0,0,1,343387.67
26924.79,366.11,2689.94,168,13.5,8,5,3060.84,9122,5.1,65.0,14,0,0,1,196679.38
25056.02,23591.5,13616.81,485,38.9,11,8,4139.05,13881,2.8,63.6,19,0,0,1,256788.33
3602.56,14686.48,6200.2,485,21.6,18,7,1254.91,4670,1.7,37.3,30,1,1,1,176858.37
13421.95,38137.55,13784.52,359,13.8,22,6,1479.88,4862,8.3,29.3,33,0,1,1,206358.76
24994.13,38406.14,9929.24,3576,4.0,11,1,1630.12,859,3.9,47.4,32,0,0,0,261387.16`

export const SALES_REVENUE_DOCUMENTS: ProjectDocumentItem[] = [
  {
    id: 'doc_sales_rev_deck',
    projectId: 'proj_sales_revenue_004',
    title: 'Executive Presentation: Sales Revenue Prediction & Elasticity',
    description: '7-slide executive pitch deck detailing the regression model, factor weights, ROI impact, and scenario simulation.',
    documentType: 'presentation',
    accessPolicy: 'project_grant',
    currentVersion: 1,
    fileName: 'presentation.pptx',
    fileSize: 61767,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    storagePath: 'sales-revenue/presentation.pptx',
    createdBy: 'usr_admin',
    createdAt: '2026-10-19T22:00:00Z',
    updatedAt: '2026-10-19T22:00:00Z',
  },
  {
    id: 'doc_sales_rev_readme',
    projectId: 'proj_sales_revenue_004',
    title: 'Technical README & Model Documentation',
    description: 'Comprehensive project overview, methodology, 15 feature descriptions, test metrics, and CLI usage instructions.',
    documentType: 'documentation',
    accessPolicy: 'project_grant',
    currentVersion: 1,
    fileName: 'README.md',
    fileSize: 2067,
    mimeType: 'text/markdown',
    storagePath: 'sales-revenue/README.md',
    createdBy: 'usr_admin',
    createdAt: '2026-10-19T22:00:00Z',
    updatedAt: '2026-10-19T22:00:00Z',
  },
  {
    id: 'doc_sales_rev_reqs',
    projectId: 'proj_sales_revenue_004',
    title: 'Python Dependency Specification',
    description: 'Pinned pip requirements for model reproducibility, scikit-learn compatibility, and execution environment.',
    documentType: 'documentation',
    accessPolicy: 'project_grant',
    currentVersion: 1,
    fileName: 'requirements.txt',
    fileSize: 92,
    mimeType: 'text/plain',
    storagePath: 'sales-revenue/requirements.txt',
    createdBy: 'usr_admin',
    createdAt: '2026-10-19T22:00:00Z',
    updatedAt: '2026-10-19T22:00:00Z',
  },
  {
    id: 'doc_sales_rev_dataset',
    projectId: 'proj_sales_revenue_004',
    title: 'Historical Training Dataset (5,000 Records)',
    description: 'Baseline 5,000-row historical retail store dataset with 15 marketing and operational variables plus target monthly revenue.',
    documentType: 'report',
    accessPolicy: 'project_grant',
    currentVersion: 1,
    fileName: 'sales_revenue_data.csv',
    fileSize: 402296,
    mimeType: 'text/csv',
    storagePath: 'sales-revenue/sales_revenue_data.csv',
    createdBy: 'usr_admin',
    createdAt: '2026-10-19T22:00:00Z',
    updatedAt: '2026-10-19T22:00:00Z',
  },
]

export const SALES_REVENUE_PROJECT: ProjectCatalogItem = {
  id: 'proj_sales_revenue_004',
  title: 'Sales Revenue Prediction Lab',
  slug: 'sales-revenue',
  description:
    'Real-time retail monthly revenue forecasting using multi-variable linear regression across 15 marketing, operational, footfall, and seasonal parameters.',
  detailedOverview:
    'Statistical machine learning model trained on 5,000 monthly store records. Quantifies direct elasticity of digital, TV, and radio ad spend, store footfall, staff sizing, and competitive factors on overall gross store revenue with R² = 0.930 accuracy.',
  industry: 'Marketing Analytics',
  category: 'Revenue & Forecasting',
  projectType: 'notebook',
  ownerId: 'usr_admin',
  ownerName: 'Rafiq Sheriff',
  ownerEmail: 'sheriffrafiq71@gmail.com',
  status: 'published',
  currentVersion: 1,
  visibility: 'visible',
  tags: ['Marketing Analytics', 'Sales Forecasting', 'Linear Regression', 'scikit-learn', 'Revenue Optimization'],
  tech: ['Python', 'scikit-learn', 'FastAPI', 'Pandas', 'React', 'Plotly.js'],
  businessProblem:
    'Retail chains struggle with inaccurate monthly store revenue forecasting, leading to misallocated marketing budgets, suboptimal inventory stocking, and staffing inefficiencies.',
  businessSolution:
    'Statistical multi-variable linear regression model quantifying the direct revenue elasticity of marketing channels and operational parameters (R² = 0.930, MAE = 11,924).',
  targetAudience: 'Chief Revenue Officers, Retail Operations Directors, Marketing Budget Planners, Financial Analysts',
  thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop',
  documentationLinks: [
    { title: 'Project README', url: 'https://analyticsavenue.in/docs/sales-revenue' },
  ],
  draftConfig: {
    projectType: 'notebook',
    notebook: salesRevenueNotebookConfig as any,
    documents: SALES_REVENUE_DOCUMENTS,
    showcase: {
      metrics: [
        { label: 'Model R² Score', value: '0.930' },
        { label: 'RMSE (Holdout Test)', value: '14,876' },
        { label: 'MAE (Holdout Test)', value: '11,924' },
      ],
      keyFeatures: [
        'Multi-channel ad spend elasticity: Digital (+1.31), TV (+0.88), Radio (+0.68) revenue multipliers',
        'Store operations driver: Footfall adds ~25 revenue units per visitor; staff adds ~809 per representative',
        'Customer satisfaction: +3,032 revenue increase per satisfaction rating point',
        'Competitive friction: -1,570 revenue impact per competitor store in immediate radius',
        'Seasonal uplift: Holiday season flag contributes +19,949 baseline revenue expansion',
      ],
    },
  },
  publishedConfig: {
    projectType: 'notebook',
    notebook: salesRevenueNotebookConfig as any,
    documents: SALES_REVENUE_DOCUMENTS,
    showcase: {
      metrics: [
        { label: 'Model R² Score', value: '0.930' },
        { label: 'RMSE (Holdout Test)', value: '14,876' },
        { label: 'MAE (Holdout Test)', value: '11,924' },
      ],
      keyFeatures: [
        'Multi-channel ad spend elasticity: Digital (+1.31), TV (+0.88), Radio (+0.68) revenue multipliers',
        'Store operations driver: Footfall adds ~25 revenue units per visitor; staff adds ~809 per representative',
        'Customer satisfaction: +3,032 revenue increase per satisfaction rating point',
        'Competitive friction: -1,570 revenue impact per competitor store in immediate radius',
        'Seasonal uplift: Holiday season flag contributes +19,949 baseline revenue expansion',
      ],
    },
  },
  lastValidatedAt: '2026-10-19T22:00:00Z',
  publishedAt: '2026-10-19T22:00:00Z',
  createdAt: '2026-10-19T22:00:00Z',
  updatedAt: '2026-10-19T22:00:00Z',
}
