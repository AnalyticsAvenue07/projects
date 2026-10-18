/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_NAME?: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_HEALTHSCOPE_INSIGHTS_API_URL?: string
  readonly VITE_MARKETING_ANALYTICS_API_URL?: string
  readonly VITE_MACHINE_FAILURE_API_URL?: string
  readonly VITE_ORDER_FULFILLMENT_SLA_API_URL?: string
  readonly VITE_REAL_ESTATE_PRICE_VS_PROPERTY_FEATURES_API_URL?: string
  readonly VITE_EV_DYNAMIC_RANGE_PREDICTION_ANXIETY_REDUCTION_API_URL?: string
  readonly VITE_EV_CHARGING_STATION_FAULT_DETECTION_API_URL?: string
  readonly VITE_REAL_ESTATE_INTELLIGENCE_SUITE_API_URL?: string
  readonly VITE_OFFERLETTER_API_URL?: string
  readonly VITE_PII_REDUCTION_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
