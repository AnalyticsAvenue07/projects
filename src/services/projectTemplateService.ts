import type { DashboardConfig, DatasetColumnSchema } from '@/types/dashboardConfiguration'
import type { SupportedIndustry } from '@/types/projectManagement'
import { DEMO_MACHINE_FAILURE_DATA } from './demoData/manufacturingData'
import { DEMO_MARKETING_CAMPAIGN_DATA } from './demoData/marketingData'

const DEMO_MARKETING_ROI_DATA = DEMO_MARKETING_CAMPAIGN_DATA.map((row) => ({
  Campaign_ID: row.Campaign,
  Channel: row.Channel,
  Ad_Spend: row.Spend,
  Conversions: row.Conversions,
  Revenue: row.Revenue,
  ROAS: Number((row.Revenue / (row.Spend || 1)).toFixed(2)),
  Impressions: row.Impressions,
  Clicks: row.Clicks,
  Leads: row.Leads,
  Date: row.Date,
}))

export interface ProjectTemplate {
  id: string
  name: string
  industry: SupportedIndustry
  description: string
  category: string
  suggestedType: 'dashboard' | 'showcase' | 'ai_app'
  tags: string[]
  tech: string[]
  columns: DatasetColumnSchema[]
  defaultDashboardConfig: DashboardConfig
  sampleData?: Record<string, any>[]
  overviewSections?: {
    title: string
    eyebrow?: string
    description?: string
    content: string
    bullets?: string[]
  }[]
}

export const MANUFACTURING_PREDICTIVE_MAINTENANCE_TEMPLATE: ProjectTemplate = {
  id: 'mfg-predictive-maintenance',
  name: 'Machine Health & Predictive Maintenance',
  industry: 'Manufacturing',
  category: 'Industrial IoT & Operations',
  suggestedType: 'dashboard',
  description:
    'Real-time industrial telemetry monitoring sensor temperature, vibration, RPM, operational run hours, and historical failure indicators.',
  tags: ['Manufacturing', 'Predictive Maintenance', 'IoT', 'Telemetry', 'Asset Reliability'],
  tech: ['React', 'Plotly.js', 'FastAPI', 'Pandas', 'IoT Telemetry'],
  columns: [
    { name: 'Timestamp', label: 'Telemetry Timestamp', dataType: 'date', required: true },
    { name: 'Machine_ID', label: 'Machine Identifier', dataType: 'string', required: true },
    { name: 'Machine_Type', label: 'Machine Model/Type', dataType: 'string', required: true },
    { name: 'Temperature', label: 'Temperature (°C)', dataType: 'number', required: true },
    { name: 'Vibration', label: 'Vibration (mm/s)', dataType: 'number', required: true },
    { name: 'RPM', label: 'Revolutions Per Minute', dataType: 'number', required: true },
    { name: 'Load', label: 'Mechanical Load (%)', dataType: 'number', required: false },
    { name: 'Run_Hours', label: 'Cumulative Run Hours', dataType: 'number', required: false },
    { name: 'Failure_Flag', label: 'Failure Incident Flag (0/1)', dataType: 'number', required: true },
  ],
  sampleData: DEMO_MACHINE_FAILURE_DATA,
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_total_machines',
        title: 'Active Monitored Units',
        field: 'Machine_ID',
        aggregation: 'distinct_count',
        format: 'integer',
        unit: 'units',
        colorTheme: 'teal',
        description: 'Total unique physical production machines tracked',
      },
      {
        id: 'kpi_failures',
        title: 'Historical Failures',
        field: 'Failure_Flag',
        aggregation: 'sum',
        format: 'integer',
        unit: 'events',
        colorTheme: 'rose',
        description: 'Recorded failure shutdown events in dataset',
      },
      {
        id: 'kpi_avg_temp',
        title: 'Mean Operating Temp',
        field: 'Temperature',
        aggregation: 'avg',
        format: 'number',
        unit: '°C',
        colorTheme: 'amber',
        description: 'Fleet-wide mean operating temperature',
      },
      {
        id: 'kpi_avg_vibe',
        title: 'Mean Vibration Amplitude',
        field: 'Vibration',
        aggregation: 'avg',
        format: 'number',
        unit: 'mm/s',
        colorTheme: 'blue',
        description: 'Mean harmonic oscillation across machine shafts',
      },
    ],
    charts: [
      {
        id: 'chart_temp_by_machine',
        title: 'Average Temperature by Machine Model',
        description: 'Operational thermal variance across machine types',
        chartType: 'bar',
        xField: 'Machine_Type',
        yField: 'Temperature',
        aggregation: 'avg',
        columnSpan: 2,
        colorScheme: 'teal',
      },
      {
        id: 'chart_failure_by_type',
        title: 'Failure Incidents by Machine Category',
        description: 'Breakdown of recorded failures by production equipment type',
        chartType: 'donut',
        xField: 'Machine_Type',
        yField: 'Failure_Flag',
        aggregation: 'sum',
        columnSpan: 2,
        colorScheme: 'rose',
      },
      {
        id: 'chart_vibration_hist',
        title: 'Vibration Distribution Spectrum',
        description: 'Frequency distribution of measured vibration amplitudes',
        chartType: 'histogram',
        xField: 'Vibration',
        columnSpan: 2,
        colorScheme: 'cyan',
      },
      {
        id: 'chart_raw_telemetry',
        title: 'Machine Telemetry Log',
        description: 'Individual inspection records and sensor diagnostics',
        chartType: 'table',
        xField: 'Machine_ID',
        columnSpan: 4,
      },
    ],
    filters: [
      {
        id: 'filter_machine_type',
        field: 'Machine_Type',
        label: 'Machine Type',
        filterType: 'multiselect',
      },
      {
        id: 'filter_failure_flag',
        field: 'Failure_Flag',
        label: 'Failure Status',
        filterType: 'select',
      },
    ],
    tableColumns: ['Timestamp', 'Machine_ID', 'Machine_Type', 'Temperature', 'Vibration', 'RPM', 'Failure_Flag'],
  },
  overviewSections: [
    {
      title: 'Operational Telemetry & Anomaly Intelligence',
      eyebrow: 'Solution Architecture',
      description: 'Industrial condition monitoring for shop floor machinery.',
      content:
        'Continuous monitoring of temperature, vibration, and mechanical load prevents unplanned downtime and extends machinery asset lifetime. This dashboard provides clear operational insight into historical failure indicators.',
      bullets: [
        'Real-time anomaly identification across multi-axis sensors',
        'Fleet-wide comparative analysis of operating thermal thresholds',
        'Drill-down inspection of high-risk machines before catastrophic failure',
      ],
    },
  ],
}

export const HEALTHCARE_PATIENT_FLOW_TEMPLATE: ProjectTemplate = {
  id: 'hc-patient-flow',
  name: 'Hospital Patient Flow & Department Capacity',
  industry: 'Healthcare',
  category: 'Hospital Administration',
  suggestedType: 'dashboard',
  description:
    'Inpatient admission, department occupancy, bed turnaround times, and length of stay analytics for hospital operations.',
  tags: ['Healthcare', 'Patient Flow', 'Operations', 'Capacity Planning'],
  tech: ['React', 'Recharts', 'Pandas'],
  columns: [
    { name: 'Patient_ID', label: 'Patient MRN', dataType: 'string', required: true },
    { name: 'Department', label: 'Medical Department', dataType: 'string', required: true },
    { name: 'Admission_Type', label: 'Admission Category', dataType: 'string', required: true },
    { name: 'Length_Of_Stay_Days', label: 'Length of Stay (Days)', dataType: 'number', required: true },
    { name: 'Treatment_Cost', label: 'Billed Treatment Cost', dataType: 'number', required: false },
    { name: 'Readmitted_30D', label: '30-Day Readmission Flag', dataType: 'number', required: false },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_total_patients',
        title: 'Admitted Inpatients',
        field: 'Patient_ID',
        aggregation: 'count',
        format: 'integer',
        colorTheme: 'blue',
      },
      {
        id: 'kpi_avg_los',
        title: 'Mean Length of Stay',
        field: 'Length_Of_Stay_Days',
        aggregation: 'avg',
        format: 'number',
        unit: 'days',
        colorTheme: 'emerald',
      },
      {
        id: 'kpi_readmissions',
        title: '30-Day Readmissions',
        field: 'Readmitted_30D',
        aggregation: 'sum',
        format: 'integer',
        colorTheme: 'rose',
      },
    ],
    charts: [
      {
        id: 'chart_dept_patients',
        title: 'Patient Volume by Department',
        chartType: 'bar',
        xField: 'Department',
        aggregation: 'count',
        columnSpan: 2,
        colorScheme: 'teal',
      },
      {
        id: 'chart_admission_types',
        title: 'Admission Type Breakdown',
        chartType: 'pie',
        xField: 'Admission_Type',
        aggregation: 'count',
        columnSpan: 2,
        colorScheme: 'indigo',
      },
    ],
    filters: [
      {
        id: 'filter_department',
        field: 'Department',
        label: 'Department',
        filterType: 'select',
      },
    ],
  },
}

export const SUPPLY_CHAIN_SLA_TEMPLATE: ProjectTemplate = {
  id: 'sc-sla-fulfillment',
  name: 'Logistics SLA & Order Fulfillment Tracking',
  industry: 'Supply Chain',
  category: 'Logistics Operations',
  suggestedType: 'dashboard',
  description:
    'Order-to-delivery lifecycle monitoring, dispatch latency, warehouse turnaround, and SLA adherence analysis.',
  tags: ['Supply Chain', 'Logistics', 'Fulfillment', 'SLA Adherence'],
  tech: ['React', 'Plotly.js', 'Pandas'],
  columns: [
    { name: 'Order_ID', label: 'Order Tracking #', dataType: 'string', required: true },
    { name: 'Origin_Hub', label: 'Dispatch Hub', dataType: 'string', required: true },
    { name: 'Carrier', label: 'Logistics Partner', dataType: 'string', required: true },
    { name: 'Lead_Time_Hours', label: 'Total Lead Time (Hours)', dataType: 'number', required: true },
    { name: 'SLA_Breached', label: 'SLA Breached Flag (0/1)', dataType: 'number', required: true },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_total_orders',
        title: 'Dispatched Orders',
        field: 'Order_ID',
        aggregation: 'count',
        format: 'integer',
        colorTheme: 'teal',
      },
      {
        id: 'kpi_sla_breaches',
        title: 'SLA Breaches',
        field: 'SLA_Breached',
        aggregation: 'sum',
        format: 'integer',
        colorTheme: 'rose',
      },
      {
        id: 'kpi_avg_lead_time',
        title: 'Mean Lead Time',
        field: 'Lead_Time_Hours',
        aggregation: 'avg',
        format: 'number',
        unit: 'hrs',
        colorTheme: 'blue',
      },
    ],
    charts: [
      {
        id: 'chart_carrier_lead_time',
        title: 'Mean Lead Time by Carrier',
        chartType: 'bar',
        xField: 'Carrier',
        yField: 'Lead_Time_Hours',
        aggregation: 'avg',
        columnSpan: 2,
        colorScheme: 'cyan',
      },
      {
        id: 'chart_sla_by_hub',
        title: 'Breaches by Dispatch Hub',
        chartType: 'donut',
        xField: 'Origin_Hub',
        yField: 'SLA_Breached',
        aggregation: 'sum',
        columnSpan: 2,
        colorScheme: 'amber',
      },
    ],
    filters: [
      {
        id: 'filter_carrier',
        field: 'Carrier',
        label: 'Carrier',
        filterType: 'select',
      },
    ],
  },
}

export const EV_BATTERY_FLEET_TEMPLATE: ProjectTemplate = {
  id: 'ev-battery-fleet',
  name: 'EV Fleet Battery & Dynamic Range Analytics',
  industry: 'EV',
  category: 'Fleet Intelligence',
  suggestedType: 'dashboard',
  description:
    'Electric vehicle telemetry tracking battery state of charge, ambient temperature, degradation index, and dynamic range.',
  tags: ['EV', 'Battery Telemetry', 'Range Anxiety', 'Fleet Management'],
  tech: ['React', 'Recharts', 'IoT'],
  columns: [
    { name: 'Vehicle_ID', label: 'Vehicle VIN', dataType: 'string', required: true },
    { name: 'Model', label: 'EV Model', dataType: 'string', required: true },
    { name: 'SOC_Pct', label: 'State of Charge (%)', dataType: 'number', required: true },
    { name: 'Estimated_Range_Km', label: 'Estimated Range (km)', dataType: 'number', required: true },
    { name: 'Battery_Health_Pct', label: 'State of Health SOH (%)', dataType: 'number', required: true },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_fleet_count',
        title: 'Monitored Fleet',
        field: 'Vehicle_ID',
        aggregation: 'distinct_count',
        format: 'integer',
        colorTheme: 'teal',
      },
      {
        id: 'kpi_avg_soc',
        title: 'Mean SOC',
        field: 'SOC_Pct',
        aggregation: 'avg',
        format: 'percent',
        unit: '%',
        colorTheme: 'blue',
      },
      {
        id: 'kpi_avg_range',
        title: 'Mean Dynamic Range',
        field: 'Estimated_Range_Km',
        aggregation: 'avg',
        format: 'integer',
        unit: 'km',
        colorTheme: 'emerald',
      },
    ],
    charts: [
      {
        id: 'chart_range_by_model',
        title: 'Mean Range by Vehicle Model',
        chartType: 'bar',
        xField: 'Model',
        yField: 'Estimated_Range_Km',
        aggregation: 'avg',
        columnSpan: 2,
        colorScheme: 'teal',
      },
      {
        id: 'chart_soh_dist',
        title: 'Battery Health Distribution',
        chartType: 'histogram',
        xField: 'Battery_Health_Pct',
        columnSpan: 2,
        colorScheme: 'cyan',
      },
    ],
    filters: [
      {
        id: 'filter_model',
        field: 'Model',
        label: 'Model',
        filterType: 'select',
      },
    ],
  },
}

export const SOLAR_FARM_PERFORMANCE_TEMPLATE: ProjectTemplate = {
  id: 'solar-farm-analytics',
  name: 'Solar Generation & Inverter Health Monitor',
  industry: 'Solar Power',
  category: 'Renewable Asset Operations',
  suggestedType: 'dashboard',
  description:
    'Solar photovoltaic string diagnostics, irradiation conversion efficiency, inverter heat stress, and power yield forecasting.',
  tags: ['Solar Power', 'PV Degradation', 'Inverters', 'Clean Tech'],
  tech: ['React', 'Plotly.js', 'Solar Analytics'],
  columns: [
    { name: 'Inverter_ID', label: 'Inverter Serial #', dataType: 'string', required: true },
    { name: 'Array_Block', label: 'PV Array Block', dataType: 'string', required: true },
    { name: 'Daily_Yield_KWh', label: 'Daily Yield (kWh)', dataType: 'number', required: true },
    { name: 'Irradiation_Wm2', label: 'Solar Irradiance (W/m²)', dataType: 'number', required: true },
    { name: 'Efficiency_Pct', label: 'Yield Efficiency (%)', dataType: 'number', required: true },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_yield',
        title: 'Total Daily Yield',
        field: 'Daily_Yield_KWh',
        aggregation: 'sum',
        format: 'integer',
        unit: 'kWh',
        colorTheme: 'amber',
      },
      {
        id: 'kpi_efficiency',
        title: 'Mean Efficiency',
        field: 'Efficiency_Pct',
        aggregation: 'avg',
        format: 'percent',
        unit: '%',
        colorTheme: 'emerald',
      },
    ],
    charts: [
      {
        id: 'chart_yield_by_block',
        title: 'Yield by PV Array Block',
        chartType: 'bar',
        xField: 'Array_Block',
        yField: 'Daily_Yield_KWh',
        aggregation: 'sum',
        columnSpan: 2,
        colorScheme: 'amber',
      },
      {
        id: 'chart_efficiency_dist',
        title: 'Efficiency Frequency Spectrum',
        chartType: 'histogram',
        xField: 'Efficiency_Pct',
        columnSpan: 2,
        colorScheme: 'emerald',
      },
    ],
    filters: [
      {
        id: 'filter_block',
        field: 'Array_Block',
        label: 'Array Block',
        filterType: 'select',
      },
    ],
  },
}

export const REAL_ESTATE_VALUATION_TEMPLATE: ProjectTemplate = {
  id: 're-property-valuation',
  name: 'Real Estate Valuation & Feature Price Analyzer',
  industry: 'Real Estate',
  category: 'Property Analytics',
  suggestedType: 'dashboard',
  description:
    'Multi-market residential and commercial valuation analytics, price-per-square-foot comparisons, and neighborhood demand signals.',
  tags: ['Real Estate', 'Valuation', 'Property Intelligence', 'Pricing Models'],
  tech: ['React', 'Recharts', 'Pandas'],
  columns: [
    { name: 'Property_ID', label: 'Listing ID', dataType: 'string', required: true },
    { name: 'Neighborhood', label: 'Neighborhood/Zone', dataType: 'string', required: true },
    { name: 'Property_Type', label: 'Property Classification', dataType: 'string', required: true },
    { name: 'Price', label: 'Listing Price ($)', dataType: 'number', required: true },
    { name: 'Square_Feet', label: 'Floor Area (sq ft)', dataType: 'number', required: true },
    { name: 'Days_On_Market', label: 'Days on Market', dataType: 'number', required: false },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_total_properties',
        title: 'Active Listings',
        field: 'Property_ID',
        aggregation: 'count',
        format: 'integer',
        colorTheme: 'blue',
      },
      {
        id: 'kpi_mean_price',
        title: 'Mean Listing Price',
        field: 'Price',
        aggregation: 'avg',
        format: 'currency',
        colorTheme: 'emerald',
      },
      {
        id: 'kpi_dom',
        title: 'Mean Days on Market',
        field: 'Days_On_Market',
        aggregation: 'avg',
        format: 'integer',
        unit: 'days',
        colorTheme: 'slate',
      },
    ],
    charts: [
      {
        id: 'chart_price_by_type',
        title: 'Mean Price by Property Type',
        chartType: 'bar',
        xField: 'Property_Type',
        yField: 'Price',
        aggregation: 'avg',
        columnSpan: 2,
        colorScheme: 'indigo',
      },
      {
        id: 'chart_dist_by_neighborhood',
        title: 'Listings by Neighborhood',
        chartType: 'donut',
        xField: 'Neighborhood',
        aggregation: 'count',
        columnSpan: 2,
        colorScheme: 'teal',
      },
    ],
    filters: [
      {
        id: 'filter_prop_type',
        field: 'Property_Type',
        label: 'Property Type',
        filterType: 'select',
      },
    ],
  },
}

export const HR_TALENT_ANALYTICS_TEMPLATE: ProjectTemplate = {
  id: 'hr-talent-comp',
  name: 'Workforce Retention & Compensation Intelligence',
  industry: 'HR',
  category: 'Human Capital Analytics',
  suggestedType: 'dashboard',
  description:
    'Departmental headcount distribution, compensation parity, tenure analysis, and employee satisfaction trends.',
  tags: ['HR', 'Workforce', 'Retention', 'Compensation'],
  tech: ['React', 'Recharts'],
  columns: [
    { name: 'Employee_ID', label: 'Employee ID', dataType: 'string', required: true },
    { name: 'Department', label: 'Business Unit', dataType: 'string', required: true },
    { name: 'Level', label: 'Seniority Level', dataType: 'string', required: true },
    { name: 'Salary', label: 'Annual Compensation ($)', dataType: 'number', required: true },
    { name: 'Tenure_Years', label: 'Tenure (Years)', dataType: 'number', required: true },
    { name: 'Satisfaction_Score', label: 'Engagement Score (1-5)', dataType: 'number', required: false },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_headcount',
        title: 'Total Headcount',
        field: 'Employee_ID',
        aggregation: 'count',
        format: 'integer',
        colorTheme: 'blue',
      },
      {
        id: 'kpi_mean_salary',
        title: 'Mean Compensation',
        field: 'Salary',
        aggregation: 'avg',
        format: 'currency',
        colorTheme: 'emerald',
      },
      {
        id: 'kpi_tenure',
        title: 'Mean Tenure',
        field: 'Tenure_Years',
        aggregation: 'avg',
        format: 'number',
        unit: 'yrs',
        colorTheme: 'amber',
      },
    ],
    charts: [
      {
        id: 'chart_headcount_dept',
        title: 'Headcount by Department',
        chartType: 'bar',
        xField: 'Department',
        aggregation: 'count',
        columnSpan: 2,
        colorScheme: 'teal',
      },
      {
        id: 'chart_salary_level',
        title: 'Mean Salary by Level',
        chartType: 'bar',
        xField: 'Level',
        yField: 'Salary',
        aggregation: 'avg',
        columnSpan: 2,
        colorScheme: 'emerald',
      },
    ],
    filters: [
      {
        id: 'filter_dept',
        field: 'Department',
        label: 'Department',
        filterType: 'select',
      },
    ],
  },
}

export const MARKETING_CAMPAIGN_ROI_TEMPLATE: ProjectTemplate = {
  id: 'mkt-campaign-roi',
  name: 'Omnichannel Marketing Attribution & ROI',
  industry: 'Marketing Analytics',
  category: 'Growth & Acquisition',
  suggestedType: 'dashboard',
  description:
    'Multi-channel acquisition funnel, cost per lead, click-through rates, and customer acquisition cost ROI.',
  tags: ['Marketing Analytics', 'ROI', 'Acquisition', 'Conversion Funnel'],
  tech: ['React', 'Plotly.js', 'Pandas'],
  columns: [
    { name: 'Campaign_ID', label: 'Campaign Code', dataType: 'string', required: true },
    { name: 'Channel', label: 'Marketing Channel', dataType: 'string', required: true },
    { name: 'Ad_Spend', label: 'Total Ad Spend ($)', dataType: 'number', required: true },
    { name: 'Conversions', label: 'Conversions', dataType: 'number', required: true },
    { name: 'Revenue', label: 'Attributed Revenue ($)', dataType: 'number', required: true },
    { name: 'ROAS', label: 'Return on Ad Spend (x)', dataType: 'number', required: false },
  ],
  sampleData: DEMO_MARKETING_ROI_DATA,
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_spend',
        title: 'Total Ad Spend',
        field: 'Ad_Spend',
        aggregation: 'sum',
        format: 'currency',
        colorTheme: 'slate',
      },
      {
        id: 'kpi_revenue',
        title: 'Attributed Revenue',
        field: 'Revenue',
        aggregation: 'sum',
        format: 'currency',
        colorTheme: 'emerald',
      },
      {
        id: 'kpi_conversions',
        title: 'Total Conversions',
        field: 'Conversions',
        aggregation: 'sum',
        format: 'integer',
        colorTheme: 'blue',
      },
    ],
    charts: [
      {
        id: 'chart_rev_by_channel',
        title: 'Revenue by Channel',
        chartType: 'bar',
        xField: 'Channel',
        yField: 'Revenue',
        aggregation: 'sum',
        columnSpan: 2,
        colorScheme: 'teal',
      },
      {
        id: 'chart_spend_distribution',
        title: 'Ad Spend Allocation',
        chartType: 'donut',
        xField: 'Channel',
        yField: 'Ad_Spend',
        aggregation: 'sum',
        columnSpan: 2,
        colorScheme: 'indigo',
      },
    ],
    filters: [
      {
        id: 'filter_channel',
        field: 'Channel',
        label: 'Channel',
        filterType: 'select',
      },
    ],
  },
}

export const GEN_AI_TOKEN_MONITOR_TEMPLATE: ProjectTemplate = {
  id: 'genai-token-monitor',
  name: 'Enterprise LLM Token Usage & Latency Monitor',
  industry: 'Gen AI',
  category: 'AI Infrastructure',
  suggestedType: 'dashboard',
  description:
    'Monitor organization-wide token consumption, prompt vs completion ratios, inference latency, and model cost allocation.',
  tags: ['Gen AI', 'LLM Monitoring', 'Token Usage', 'Cost Optimization'],
  tech: ['React', 'Recharts', 'FastAPI'],
  columns: [
    { name: 'Request_ID', label: 'Inference Request UUID', dataType: 'string', required: true },
    { name: 'Model_Name', label: 'Foundation Model', dataType: 'string', required: true },
    { name: 'Department', label: 'Calling Business Unit', dataType: 'string', required: true },
    { name: 'Prompt_Tokens', label: 'Prompt Tokens', dataType: 'number', required: true },
    { name: 'Completion_Tokens', label: 'Completion Tokens', dataType: 'number', required: true },
    { name: 'Cost_USD', label: 'Incurred Cost ($)', dataType: 'number', required: true },
    { name: 'Latency_Ms', label: 'Response Latency (ms)', dataType: 'number', required: false },
  ],
  defaultDashboardConfig: {
    version: 1,
    kpis: [
      {
        id: 'kpi_total_requests',
        title: 'Inference Invocations',
        field: 'Request_ID',
        aggregation: 'count',
        format: 'integer',
        colorTheme: 'teal',
      },
      {
        id: 'kpi_total_cost',
        title: 'Total LLM Spend',
        field: 'Cost_USD',
        aggregation: 'sum',
        format: 'currency',
        colorTheme: 'rose',
      },
      {
        id: 'kpi_mean_latency',
        title: 'Mean Latency',
        field: 'Latency_Ms',
        aggregation: 'avg',
        format: 'integer',
        unit: 'ms',
        colorTheme: 'blue',
      },
    ],
    charts: [
      {
        id: 'chart_cost_by_model',
        title: 'Cost by Foundation Model',
        chartType: 'bar',
        xField: 'Model_Name',
        yField: 'Cost_USD',
        aggregation: 'sum',
        columnSpan: 2,
        colorScheme: 'indigo',
      },
      {
        id: 'chart_dept_usage',
        title: 'Invocation Share by Department',
        chartType: 'pie',
        xField: 'Department',
        aggregation: 'count',
        columnSpan: 2,
        colorScheme: 'teal',
      },
    ],
    filters: [
      {
        id: 'filter_model',
        field: 'Model_Name',
        label: 'Model Name',
        filterType: 'select',
      },
    ],
  },
}

export const ALL_PROJECT_TEMPLATES: ProjectTemplate[] = [
  MANUFACTURING_PREDICTIVE_MAINTENANCE_TEMPLATE,
  HEALTHCARE_PATIENT_FLOW_TEMPLATE,
  SUPPLY_CHAIN_SLA_TEMPLATE,
  EV_BATTERY_FLEET_TEMPLATE,
  SOLAR_FARM_PERFORMANCE_TEMPLATE,
  REAL_ESTATE_VALUATION_TEMPLATE,
  HR_TALENT_ANALYTICS_TEMPLATE,
  MARKETING_CAMPAIGN_ROI_TEMPLATE,
  GEN_AI_TOKEN_MONITOR_TEMPLATE,
]

export function getTemplatesByIndustry(industry: SupportedIndustry): ProjectTemplate[] {
  return ALL_PROJECT_TEMPLATES.filter((t) => t.industry === industry)
}

export function getTemplateById(templateId: string): ProjectTemplate | null {
  return ALL_PROJECT_TEMPLATES.find((t) => t.id === templateId) ?? null
}
