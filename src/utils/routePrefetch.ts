const prefetchMap: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/DashboardPage'),
  '/profile': () => import('@/pages/ProfilePage'),
  '/settings': () => import('@/pages/SettingsPage'),
  '/projects/ai-prescription': () => import('@/pages/projects/AiPrescriptionProjectPage'),
  '/projects/ai-prescription-detail': () => import('@/pages/projects/AiPrescriptionDetailPage'),
  '/projects/healthscope-insights': () => import('@/pages/projects/HealthscopeInsightsProjectPage'),
  '/projects/healthscope-insights-detail': () => import('@/pages/projects/HealthscopeInsightsDetailPage'),
  '/projects/patient-visit-analytics-hospital-performance': () =>
    import('@/pages/projects/PatientVisitAnalyticsHospitalPerformanceDetailPage'),
  '/projects/patient-visit-analytics-hospital-performance/full': () =>
    import('@/pages/projects/PatientVisitAnalyticsHospitalPerformanceProjectPage'),
  '/projects/patientflow-navigator': () => import('@/pages/projects/PatientFlowNavigatorDetailPage'),
  '/projects/patientflow-navigator/full': () => import('@/pages/projects/PatientFlowNavigatorProjectPage'),
  '/projects/real-estate-price-vs-property-features-analyzer': () =>
    import('@/pages/projects/RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage'),
  '/projects/real-estate-price-vs-property-features-analyzer/full': () =>
    import('@/pages/projects/RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage'),
  '/projects/ev-dynamic-range-prediction-anxiety-reduction-lab': () =>
    import('@/pages/projects/EvDynamicRangePredictionAnxietyReductionLabDetailPage'),
  '/projects/ev-dynamic-range-prediction-anxiety-reduction-lab/full': () =>
    import('@/pages/projects/EvDynamicRangePredictionAnxietyReductionLabProjectPage'),
  '/projects/ev-charging-station-fault-detection-lab': () =>
    import('@/pages/projects/EvChargingStationFaultDetectionLabDetailPage'),
  '/projects/ev-charging-station-fault-detection-lab/full': () =>
    import('@/pages/projects/EvChargingStationFaultDetectionLabProjectPage'),
  '/projects/pv-panel-degradation-intelligence-lab': () =>
    import('@/pages/projects/PVPanelDegradationIntelligenceLabDetailPage'),
  '/projects/pv-panel-degradation-intelligence-lab/full': () =>
    import('@/pages/projects/PVPanelDegradationIntelligenceLabProjectPage'),
  '/projects/solar-power-generation-forecasting-lab': () =>
    import('@/pages/projects/SolarPowerGenerationForecastingLabDetailPage'),
  '/projects/solar-power-generation-forecasting-lab/full': () =>
    import('@/pages/projects/SolarPowerGenerationForecastingLabProjectPage'),
  '/projects/inverter-failure-prediction-lab': () =>
    import('@/pages/projects/InverterFailurePredictionLabDetailPage'),
  '/projects/inverter-failure-prediction-lab/full': () =>
    import('@/pages/projects/InverterFailurePredictionLabProjectPage'),
  '/projects/offerletter-generator': () => import('@/pages/projects/OfferLetterDetailPage'),
  '/projects/offerletter-generator/full': () => import('@/pages/projects/OfferLetterProjectPage'),
  '/projects/sentiment-analyzer': () => import('@/pages/projects/SentimentAnalyzerDetailPage'),
  '/projects/sentiment-analyzer/full': () => import('@/pages/projects/SentimentAnalyzerProjectPage'),
  '/projects/intelligent-document-processor': () =>
    import('@/pages/projects/IntelligentDocumentProcessorDetailPage'),
  '/projects/intelligent-document-processor/full': () =>
    import('@/pages/projects/IntelligentDocumentProcessorProjectPage'),
  '/projects/route-optimization-logistics-efficiency': () =>
    import('@/pages/projects/RouteOptimizationLogisticsEfficiencyDetailPage'),
  '/projects/route-optimization-logistics-efficiency/full': () =>
    import('@/pages/projects/RouteOptimizationLogisticsEfficiencyProjectPage'),
  '/projects/warehouse-operations-analytics': () =>
    import('@/pages/projects/WarehouseOperationsAnalyticsDetailPage'),
  '/projects/warehouse-operations-analytics/full': () =>
    import('@/pages/projects/WarehouseOperationsAnalyticsProjectPage'),
  '/projects/ai-gold-negotiation': () => import('@/pages/projects/AiGoldNegotiationDetailPage'),
  '/projects/ai-gold-negotiation/full': () => import('@/pages/projects/AiGoldNegotiationProjectPage'),
  '/projects/real-estate-intelligence-suite': () =>
    import('@/pages/projects/RealEstateIntelligenceSuiteDetailPage'),
  '/projects/real-estate-intelligence-suite/section': () =>
    import('@/pages/projects/RealEstateIntelligenceSuiteSectionPage'),
  '/projects/real-estate-demand-forecasting-lab': () =>
    import('@/pages/projects/RealEstateDemandForecastingDetailPage'),
  '/projects/real-estate-demand-forecasting-lab/section': () =>
    import('@/pages/projects/RealEstateDemandForecastingSectionPage'),
  '/projects/pii-redaction': () => import('@/pages/projects/PiiRedactionDetailPage'),
  '/projects/pii-redaction/full': () => import('@/pages/projects/PiiRedactionProjectPage'),
  '/projects/multimodal-rag': () => import('@/pages/projects/MultimodalRAGDetailPage'),
  '/projects/multimodal-rag/full': () => import('@/pages/projects/MultimodalRAGProjectPage'),
  '/projects/machine-failure-predictive-maintenance-lab': () =>
    import('@/pages/projects/MachineFailurePredictiveMaintenanceDetailPage'),
  '/projects/machine-failure-predictive-maintenance-lab/full': () =>
    import('@/pages/projects/MachineFailurePredictiveMaintenanceProjectPage'),
  '/projects/order-to-delivery-analytics-lab': () =>
    import('@/pages/projects/OrderToDeliveryAnalyticsLabDetailPage'),
  '/projects/order-to-delivery-analytics-lab/full': () =>
    import('@/pages/projects/OrderToDeliveryAnalyticsLabProjectPage'),
  '/projects/inventory-pileup-shortage-analytics-lab': () =>
    import('@/pages/projects/InventoryPileupShortageAnalyticsLabDetailPage'),
  '/projects/inventory-pileup-shortage-analytics-lab/full': () =>
    import('@/pages/projects/InventoryPileupShortageAnalyticsLabProjectPage'),
  '/projects/order-fulfillment-sla-analytics': () =>
    import('@/pages/projects/OrderFulfillmentSlaAnalyticsDetailPage'),
  '/projects/order-fulfillment-sla-analytics/full': () =>
    import('@/pages/projects/OrderFulfillmentSlaAnalyticsProjectPage'),
  '/projects/marketing-campaign-performance-analyzer': () =>
    import('@/pages/projects/MarketingCampaignPerformanceAnalyzerDetailPage'),
  '/projects/marketing-campaign-performance-analyzer/full': () =>
    import('@/pages/projects/MarketingCampaignPerformanceAnalyzerProjectPage'),
}

const prefetchedRoutes = new Set<string>()

export function prefetchRoute(route: string) {
  if (prefetchedRoutes.has(route)) return
  const importer = prefetchMap[route]
  if (importer) {
    prefetchedRoutes.add(route)
    void importer().catch(() => {
      prefetchedRoutes.delete(route)
    })
  } else if (route.startsWith('/poc/')) {
    prefetchedRoutes.add(route)
    void import('@/pages/PocDetailPage').catch(() => {
      prefetchedRoutes.delete(route)
    })
  }
}
