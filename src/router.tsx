import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AdminLayout } from '@/layouts/AdminLayout'
import { MainShellPlain } from '@/layouts/MainShellPlain'
import { MainShellWithSidebar } from '@/layouts/MainShellWithSidebar'
import { RequireAuth } from '@/middleware/RequireAuth'
import { RequireApproved } from '@/middleware/RequireApproved'
import { RequireNotRejected } from '@/middleware/RequireNotRejected'
import { RequireStaff } from '@/middleware/RequireStaff'
import { RequireIndustryAccess } from '@/middleware/RequireIndustryAccess'
import { PageSuspenseSkeleton } from '@/components/PageSuspenseSkeleton'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'

/** Helper for typed dynamic named export import */
function lazyNamed<P extends object = Record<string, never>>(importer: () => Promise<Record<string, unknown>>, name: string): ComponentType<P> {
  const Component = lazy(() => importer().then((m) => ({ default: m[name] as ComponentType<P> })))
  return (props: P) => (
    <Suspense fallback={<PageSuspenseSkeleton />}>
      <Component {...(props as any)} />
    </Suspense>
  )
}

// Auth & Public Pages
const LoginPage = lazyNamed(() => import('@/pages/LoginPage'), 'LoginPage')
const SignupPage = lazyNamed(() => import('@/pages/SignupPage'), 'SignupPage')
const ForgotPasswordPage = lazyNamed(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage')
const UnauthorizedPage = lazyNamed(() => import('@/pages/UnauthorizedPage'), 'UnauthorizedPage')
const PendingApprovalPage = lazyNamed(() => import('@/pages/PendingApprovalPage'), 'PendingApprovalPage')
const RejectedAccessPage = lazyNamed(() => import('@/pages/RejectedAccessPage'), 'RejectedAccessPage')
const IndustryAccessRestrictedPage = lazyNamed(() => import('@/pages/IndustryAccessRestrictedPage'), 'IndustryAccessRestrictedPage')

// Core App Pages
const DashboardPage = lazyNamed(() => import('@/pages/DashboardPage'), 'DashboardPage')
const ProfilePage = lazyNamed(() => import('@/pages/ProfilePage'), 'ProfilePage')
const SettingsPage = lazyNamed(() => import('@/pages/SettingsPage'), 'SettingsPage')
const PocDetailPage = lazyNamed(() => import('@/pages/PocDetailPage'), 'PocDetailPage')

// Project Detail Pages (with Sidebar)
const AiPrescriptionDetailPage = lazyNamed(() => import('@/pages/projects/AiPrescriptionDetailPage'), 'AiPrescriptionDetailPage')
const HealthscopeInsightsDetailPage = lazyNamed(() => import('@/pages/projects/HealthscopeInsightsDetailPage'), 'HealthscopeInsightsDetailPage')
const PatientVisitAnalyticsHospitalPerformanceDetailPage = lazyNamed(() => import('@/pages/projects/PatientVisitAnalyticsHospitalPerformanceDetailPage'), 'PatientVisitAnalyticsHospitalPerformanceDetailPage')
const PatientFlowNavigatorDetailPage = lazyNamed(() => import('@/pages/projects/PatientFlowNavigatorDetailPage'), 'PatientFlowNavigatorDetailPage')
const RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage = lazyNamed(() => import('@/pages/projects/RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage'), 'RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage')
const EvDynamicRangePredictionAnxietyReductionLabDetailPage = lazyNamed(() => import('@/pages/projects/EvDynamicRangePredictionAnxietyReductionLabDetailPage'), 'EvDynamicRangePredictionAnxietyReductionLabDetailPage')
const EvChargingStationFaultDetectionLabDetailPage = lazyNamed(() => import('@/pages/projects/EvChargingStationFaultDetectionLabDetailPage'), 'EvChargingStationFaultDetectionLabDetailPage')
const PVPanelDegradationIntelligenceLabDetailPage = lazyNamed(() => import('@/pages/projects/PVPanelDegradationIntelligenceLabDetailPage'), 'PVPanelDegradationIntelligenceLabDetailPage')
const SolarPowerGenerationForecastingLabDetailPage = lazyNamed(() => import('@/pages/projects/SolarPowerGenerationForecastingLabDetailPage'), 'SolarPowerGenerationForecastingLabDetailPage')
const InverterFailurePredictionLabDetailPage = lazyNamed(() => import('@/pages/projects/InverterFailurePredictionLabDetailPage'), 'InverterFailurePredictionLabDetailPage')
const OfferLetterDetailPage = lazyNamed(() => import('@/pages/projects/OfferLetterDetailPage'), 'OfferLetterDetailPage')
const SentimentAnalyzerDetailPage = lazyNamed(() => import('@/pages/projects/SentimentAnalyzerDetailPage'), 'SentimentAnalyzerDetailPage')
const IntelligentDocumentProcessorDetailPage = lazyNamed(() => import('@/pages/projects/IntelligentDocumentProcessorDetailPage'), 'IntelligentDocumentProcessorDetailPage')
const RouteOptimizationLogisticsEfficiencyDetailPage = lazyNamed(() => import('@/pages/projects/RouteOptimizationLogisticsEfficiencyDetailPage'), 'RouteOptimizationLogisticsEfficiencyDetailPage')
const WarehouseOperationsAnalyticsDetailPage = lazyNamed(() => import('@/pages/projects/WarehouseOperationsAnalyticsDetailPage'), 'WarehouseOperationsAnalyticsDetailPage')
const AiGoldNegotiationDetailPage = lazyNamed(() => import('@/pages/projects/AiGoldNegotiationDetailPage'), 'AiGoldNegotiationDetailPage')
const RealEstateIntelligenceSuiteDetailPage = lazyNamed(() => import('@/pages/projects/RealEstateIntelligenceSuiteDetailPage'), 'RealEstateIntelligenceSuiteDetailPage')
const RealEstateDemandForecastingDetailPage = lazyNamed(() => import('@/pages/projects/RealEstateDemandForecastingDetailPage'), 'RealEstateDemandForecastingDetailPage')
const PiiRedactionDetailPage = lazyNamed(() => import('@/pages/projects/PiiRedactionDetailPage'), 'PiiRedactionDetailPage')
const MultimodalRAGDetailPage = lazyNamed(() => import('@/pages/projects/MultimodalRAGDetailPage'), 'MultimodalRAGDetailPage')
const MachineFailurePredictiveMaintenanceDetailPage = lazyNamed(() => import('@/pages/projects/MachineFailurePredictiveMaintenanceDetailPage'), 'MachineFailurePredictiveMaintenanceDetailPage')
const OrderToDeliveryAnalyticsLabDetailPage = lazyNamed(() => import('@/pages/projects/OrderToDeliveryAnalyticsLabDetailPage'), 'OrderToDeliveryAnalyticsLabDetailPage')
const InventoryPileupShortageAnalyticsLabDetailPage = lazyNamed(() => import('@/pages/projects/InventoryPileupShortageAnalyticsLabDetailPage'), 'InventoryPileupShortageAnalyticsLabDetailPage')
const OrderFulfillmentSlaAnalyticsDetailPage = lazyNamed(() => import('@/pages/projects/OrderFulfillmentSlaAnalyticsDetailPage'), 'OrderFulfillmentSlaAnalyticsDetailPage')
const MarketingCampaignPerformanceAnalyzerDetailPage = lazyNamed(() => import('@/pages/projects/MarketingCampaignPerformanceAnalyzerDetailPage'), 'MarketingCampaignPerformanceAnalyzerDetailPage')

// Project Full / Section Pages (Plain Shell)
const AiPrescriptionProjectPage = lazyNamed(() => import('@/pages/projects/AiPrescriptionProjectPage'), 'AiPrescriptionProjectPage')
const HealthscopeInsightsProjectPage = lazyNamed(() => import('@/pages/projects/HealthscopeInsightsProjectPage'), 'HealthscopeInsightsProjectPage')
const PatientVisitAnalyticsHospitalPerformanceProjectPage = lazyNamed(() => import('@/pages/projects/PatientVisitAnalyticsHospitalPerformanceProjectPage'), 'PatientVisitAnalyticsHospitalPerformanceProjectPage')
const PatientFlowNavigatorProjectPage = lazyNamed(() => import('@/pages/projects/PatientFlowNavigatorProjectPage'), 'PatientFlowNavigatorProjectPage')
const RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage = lazyNamed(() => import('@/pages/projects/RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage'), 'RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage')
const EvDynamicRangePredictionAnxietyReductionLabProjectPage = lazyNamed(() => import('@/pages/projects/EvDynamicRangePredictionAnxietyReductionLabProjectPage'), 'EvDynamicRangePredictionAnxietyReductionLabProjectPage')
const EvChargingStationFaultDetectionLabProjectPage = lazyNamed(() => import('@/pages/projects/EvChargingStationFaultDetectionLabProjectPage'), 'EvChargingStationFaultDetectionLabProjectPage')
const PVPanelDegradationIntelligenceLabProjectPage = lazyNamed(() => import('@/pages/projects/PVPanelDegradationIntelligenceLabProjectPage'), 'PVPanelDegradationIntelligenceLabProjectPage')
const SolarPowerGenerationForecastingLabProjectPage = lazyNamed(() => import('@/pages/projects/SolarPowerGenerationForecastingLabProjectPage'), 'SolarPowerGenerationForecastingLabProjectPage')
const InverterFailurePredictionLabProjectPage = lazyNamed(() => import('@/pages/projects/InverterFailurePredictionLabProjectPage'), 'InverterFailurePredictionLabProjectPage')
const OfferLetterProjectPage = lazyNamed(() => import('@/pages/projects/OfferLetterProjectPage'), 'OfferLetterProjectPage')
const SentimentAnalyzerProjectPage = lazyNamed(() => import('@/pages/projects/SentimentAnalyzerProjectPage'), 'SentimentAnalyzerProjectPage')
const IntelligentDocumentProcessorProjectPage = lazyNamed(() => import('@/pages/projects/IntelligentDocumentProcessorProjectPage'), 'IntelligentDocumentProcessorProjectPage')
const RouteOptimizationLogisticsEfficiencyProjectPage = lazyNamed(() => import('@/pages/projects/RouteOptimizationLogisticsEfficiencyProjectPage'), 'RouteOptimizationLogisticsEfficiencyProjectPage')
const WarehouseOperationsAnalyticsProjectPage = lazyNamed(() => import('@/pages/projects/WarehouseOperationsAnalyticsProjectPage'), 'WarehouseOperationsAnalyticsProjectPage')
const AiGoldNegotiationProjectPage = lazyNamed(() => import('@/pages/projects/AiGoldNegotiationProjectPage'), 'AiGoldNegotiationProjectPage')
const RealEstateIntelligenceSuiteSectionPage = lazyNamed(() => import('@/pages/projects/RealEstateIntelligenceSuiteSectionPage'), 'RealEstateIntelligenceSuiteSectionPage')
const RealEstateDemandForecastingSectionPage = lazyNamed(() => import('@/pages/projects/RealEstateDemandForecastingSectionPage'), 'RealEstateDemandForecastingSectionPage')
const PiiRedactionProjectPage = lazyNamed(() => import('@/pages/projects/PiiRedactionProjectPage'), 'PiiRedactionProjectPage')
const MultimodalRAGProjectPage = lazyNamed(() => import('@/pages/projects/MultimodalRAGProjectPage'), 'MultimodalRAGProjectPage')
const MachineFailurePredictiveMaintenanceProjectPage = lazyNamed(() => import('@/pages/projects/MachineFailurePredictiveMaintenanceProjectPage'), 'MachineFailurePredictiveMaintenanceProjectPage')
const OrderToDeliveryAnalyticsLabProjectPage = lazyNamed(() => import('@/pages/projects/OrderToDeliveryAnalyticsLabProjectPage'), 'OrderToDeliveryAnalyticsLabProjectPage')
const InventoryPileupShortageAnalyticsLabProjectPage = lazyNamed(() => import('@/pages/projects/InventoryPileupShortageAnalyticsLabProjectPage'), 'InventoryPileupShortageAnalyticsLabProjectPage')
const OrderFulfillmentSlaAnalyticsProjectPage = lazyNamed(() => import('@/pages/projects/OrderFulfillmentSlaAnalyticsProjectPage'), 'OrderFulfillmentSlaAnalyticsProjectPage')
const MarketingCampaignPerformanceAnalyzerProjectPage = lazyNamed(() => import('@/pages/projects/MarketingCampaignPerformanceAnalyzerProjectPage'), 'MarketingCampaignPerformanceAnalyzerProjectPage')

// Admin Pages
const AdminAccessManagementPage = lazyNamed(() => import('@/pages/admin/AdminAccessManagementPage'), 'AdminAccessManagementPage')
const AdminOverviewPage = lazyNamed(() => import('@/pages/admin/AdminOverviewPage'), 'AdminOverviewPage')
const AdminUsersPage = lazyNamed(() => import('@/pages/admin/AdminUsersPage'), 'AdminUsersPage')

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/signup', element: <SignupPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/unauthorized', element: <UnauthorizedPage />, errorElement: <RouteErrorBoundary /> },
  // Industry access restricted — standalone page (no sidebar, no data)
  { path: '/industry-restricted', element: <IndustryAccessRestrictedPage />, errorElement: <RouteErrorBoundary /> },
  {
    path: '/',
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'pending-approval',
        element: <MainShellPlain />,
        children: [{ index: true, element: <PendingApprovalPage /> }],
      },
      {
        path: 'rejected-access',
        element: <MainShellPlain />,
        children: [{ index: true, element: <RejectedAccessPage /> }],
      },
      {
        element: <RequireNotRejected />,
        children: [
          // Plain layout routes: profile, settings
          {
            element: <MainShellPlain />,
            children: [
              { path: 'profile', element: <ProfilePage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
          // Persistent Sidebar layout: dashboard + all approved sidebar detail routes
          {
            element: <MainShellWithSidebar />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              {
                element: <RequireApproved />,
                children: [
                  { path: 'poc/:slug', element: <PocDetailPage /> },
                  // ── Gen AI ──────────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Gen AI" />,
                    children: [
                      { path: 'projects/ai-prescription-detail', element: <AiPrescriptionDetailPage /> },
                      { path: 'projects/intelligent-document-processor', element: <IntelligentDocumentProcessorDetailPage /> },
                      { path: 'projects/ai-gold-negotiation', element: <AiGoldNegotiationDetailPage /> },
                      { path: 'projects/multimodal-rag', element: <MultimodalRAGDetailPage /> },
                      { path: 'projects/pii-redaction', element: <PiiRedactionDetailPage /> },
                      { path: 'projects/sentiment-analyzer', element: <SentimentAnalyzerDetailPage /> },
                    ],
                  },
                  // ── Healthcare ──────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Healthcare" />,
                    children: [
                      { path: 'projects/healthscope-insights-detail', element: <HealthscopeInsightsDetailPage /> },
                      { path: 'projects/patient-visit-analytics-hospital-performance', element: <PatientVisitAnalyticsHospitalPerformanceDetailPage /> },
                      { path: 'projects/patientflow-navigator', element: <PatientFlowNavigatorDetailPage /> },
                    ],
                  },
                  // ── Real Estate ─────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Real Estate" />,
                    children: [
                      { path: 'projects/real-estate-price-vs-property-features-analyzer', element: <RealEstatePriceVsPropertyFeaturesAnalyzerDetailPage /> },
                      { path: 'projects/real-estate-intelligence-suite', element: <RealEstateIntelligenceSuiteDetailPage /> },
                      { path: 'projects/real-estate-demand-forecasting-lab', element: <RealEstateDemandForecastingDetailPage /> },
                    ],
                  },
                  // ── EV ─────────────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="EV" />,
                    children: [
                      { path: 'projects/ev-dynamic-range-prediction-anxiety-reduction-lab', element: <EvDynamicRangePredictionAnxietyReductionLabDetailPage /> },
                      { path: 'projects/ev-charging-station-fault-detection-lab', element: <EvChargingStationFaultDetectionLabDetailPage /> },
                    ],
                  },
                  // ── Solar Power ─────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Solar Power" />,
                    children: [
                      { path: 'projects/pv-panel-degradation-intelligence-lab', element: <PVPanelDegradationIntelligenceLabDetailPage /> },
                      { path: 'projects/solar-power-generation-forecasting-lab', element: <SolarPowerGenerationForecastingLabDetailPage /> },
                      { path: 'projects/inverter-failure-prediction-lab', element: <InverterFailurePredictionLabDetailPage /> },
                    ],
                  },
                  // ── HR ──────────────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="HR" />,
                    children: [
                      { path: 'projects/offerletter-generator', element: <OfferLetterDetailPage /> },
                    ],
                  },
                  // ── Supply Chain ────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Supply Chain" />,
                    children: [
                      { path: 'projects/route-optimization-logistics-efficiency', element: <RouteOptimizationLogisticsEfficiencyDetailPage /> },
                      { path: 'projects/warehouse-operations-analytics', element: <WarehouseOperationsAnalyticsDetailPage /> },
                      { path: 'projects/order-fulfillment-sla-analytics', element: <OrderFulfillmentSlaAnalyticsDetailPage /> },
                    ],
                  },
                  // ── Manufacturing ───────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Manufacturing" />,
                    children: [
                      { path: 'projects/machine-failure-predictive-maintenance-lab', element: <MachineFailurePredictiveMaintenanceDetailPage /> },
                      { path: 'projects/order-to-delivery-analytics-lab', element: <OrderToDeliveryAnalyticsLabDetailPage /> },
                      { path: 'projects/inventory-pileup-shortage-analytics-lab', element: <InventoryPileupShortageAnalyticsLabDetailPage /> },
                    ],
                  },
                  // ── Marketing Analytics ─────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Marketing Analytics" />,
                    children: [
                      { path: 'projects/marketing-campaign-performance-analyzer', element: <MarketingCampaignPerformanceAnalyzerDetailPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          // Persistent Plain layout for approved full-page / section routes
          {
            element: <RequireApproved />,
            children: [
              {
                element: <MainShellPlain />,
                children: [
                  // ── Gen AI (full / section pages) ───────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Gen AI" />,
                    children: [
                      { path: 'projects/ai-prescription', element: <AiPrescriptionProjectPage /> },
                      { path: 'projects/intelligent-document-processor/full', element: <IntelligentDocumentProcessorProjectPage /> },
                      { path: 'projects/ai-gold-negotiation/full', element: <AiGoldNegotiationProjectPage /> },
                      { path: 'projects/multimodal-rag/full', element: <MultimodalRAGProjectPage /> },
                      { path: 'projects/pii-redaction/full', element: <PiiRedactionProjectPage /> },
                      { path: 'projects/sentiment-analyzer/full', element: <SentimentAnalyzerProjectPage /> },
                    ],
                  },
                  // ── Healthcare (full) ───────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Healthcare" />,
                    children: [
                      { path: 'projects/healthscope-insights', element: <HealthscopeInsightsProjectPage /> },
                      { path: 'projects/patient-visit-analytics-hospital-performance/full', element: <PatientVisitAnalyticsHospitalPerformanceProjectPage /> },
                      { path: 'projects/patientflow-navigator/full', element: <PatientFlowNavigatorProjectPage /> },
                    ],
                  },
                  // ── Real Estate (full / section) ────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Real Estate" />,
                    children: [
                      { path: 'projects/real-estate-price-vs-property-features-analyzer/full', element: <RealEstatePriceVsPropertyFeaturesAnalyzerProjectPage /> },
                      { path: 'projects/real-estate-intelligence-suite/section', element: <RealEstateIntelligenceSuiteSectionPage /> },
                      { path: 'projects/real-estate-demand-forecasting-lab/section', element: <RealEstateDemandForecastingSectionPage /> },
                    ],
                  },
                  // ── EV (full) ───────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="EV" />,
                    children: [
                      { path: 'projects/ev-dynamic-range-prediction-anxiety-reduction-lab/full', element: <EvDynamicRangePredictionAnxietyReductionLabProjectPage /> },
                      { path: 'projects/ev-charging-station-fault-detection-lab/full', element: <EvChargingStationFaultDetectionLabProjectPage /> },
                    ],
                  },
                  // ── Solar Power (full) ──────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Solar Power" />,
                    children: [
                      { path: 'projects/pv-panel-degradation-intelligence-lab/full', element: <PVPanelDegradationIntelligenceLabProjectPage /> },
                      { path: 'projects/solar-power-generation-forecasting-lab/full', element: <SolarPowerGenerationForecastingLabProjectPage /> },
                      { path: 'projects/inverter-failure-prediction-lab/full', element: <InverterFailurePredictionLabProjectPage /> },
                    ],
                  },
                  // ── HR (full) ───────────────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="HR" />,
                    children: [
                      { path: 'projects/offerletter-generator/full', element: <OfferLetterProjectPage /> },
                    ],
                  },
                  // ── Supply Chain (full) ─────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Supply Chain" />,
                    children: [
                      { path: 'projects/route-optimization-logistics-efficiency/full', element: <RouteOptimizationLogisticsEfficiencyProjectPage /> },
                      { path: 'projects/warehouse-operations-analytics/full', element: <WarehouseOperationsAnalyticsProjectPage /> },
                      { path: 'projects/order-fulfillment-sla-analytics/full', element: <OrderFulfillmentSlaAnalyticsProjectPage /> },
                    ],
                  },
                  // ── Manufacturing (full) ────────────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Manufacturing" />,
                    children: [
                      { path: 'projects/machine-failure-predictive-maintenance-lab/full', element: <MachineFailurePredictiveMaintenanceProjectPage /> },
                      { path: 'projects/order-to-delivery-analytics-lab/full', element: <OrderToDeliveryAnalyticsLabProjectPage /> },
                      { path: 'projects/inventory-pileup-shortage-analytics-lab/full', element: <InventoryPileupShortageAnalyticsLabProjectPage /> },
                    ],
                  },
                  // ── Marketing Analytics (full) ──────────────────────────────
                  {
                    element: <RequireIndustryAccess industry="Marketing Analytics" />,
                    children: [
                      { path: 'projects/marketing-campaign-performance-analyzer/full', element: <MarketingCampaignPerformanceAnalyzerProjectPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          // Staff layout
          {
            element: <RequireStaff />,
            children: [
              {
                path: 'admin',
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminOverviewPage /> },
                  { path: 'users', element: <AdminUsersPage /> },
                  { path: 'access-management', element: <AdminAccessManagementPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
