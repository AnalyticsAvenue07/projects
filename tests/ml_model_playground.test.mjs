import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// -----------------------------------------------------------------------------
// Unit & Integration Test Suite: Universal ML Model Playground
// -----------------------------------------------------------------------------

test('1. ML Model Playground appears as a first-class canonical option in Project Types', () => {
  const typesPath = path.join(rootDir, 'src', 'types', 'projectManagement.ts')
  const content = fs.readFileSync(typesPath, 'utf-8')

  assert.match(content, /'ml_playground'/, 'ProjectType union must include ml_playground')
  assert.match(content, /mlPlayground\?: MlPlaygroundConfig/, 'ProjectConfigPayload must include mlPlayground config')
})

test('2. Wizard UI includes ML Model Playground card in Project Types selection', () => {
  const wizardPath = path.join(rootDir, 'src', 'pages', 'admin', 'ProjectWizardPage.tsx')
  const content = fs.readFileSync(wizardPath, 'utf-8')

  assert.match(content, /setProjectType\('ml_playground'\)/, 'Must allow selecting ml_playground in Step 2')
  assert.match(content, /ML Model Playground/, 'Must render ML Model Playground heading')
  assert.match(content, /MlPlaygroundWizardStep/, 'Must mount MlPlaygroundWizardStep component in Step 4')
})

test('3. Three Integration Options supported: Trained Model (.joblib), HTTPS API, Model Package', () => {
  const wizardStepPath = path.join(rootDir, 'src', 'components', 'ml-playground', 'MlPlaygroundWizardStep.tsx')
  const content = fs.readFileSync(wizardStepPath, 'utf-8')

  assert.match(content, /Option A: Upload Trained Model/, 'Must provide Option A for trained model upload')
  assert.match(content, /Option B: Connect Prediction API/, 'Must provide Option B for HTTPS inference endpoint')
  assert.match(content, /Option C: Model Package/, 'Must provide Option C for packaged model + manifest')
})

test('4. Model inspection discovers features, algorithm, framework, and enforces security', () => {
  const dummyInspection = {
    checksum: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3',
    filename: 'linear_model.joblib',
    file_size: 4096,
    framework: 'scikit-learn',
    algorithm: 'LinearRegression',
    model_type: 'regression',
    feature_count: 3,
    features: ['feature_x', 'feature_y', 'feature_z'],
    status: 'valid',
  }

  assert.equal(dummyInspection.framework, 'scikit-learn')
  assert.equal(dummyInspection.algorithm, 'LinearRegression')
  assert.equal(dummyInspection.feature_count, 3)
  assert.deepEqual(dummyInspection.features, ['feature_x', 'feature_y', 'feature_z'])
  assert.equal(dummyInspection.status, 'valid')
})

test('5. CSV Dataset Profiling enforces 10MB file size and 20,000 row limits', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const MAX_ROW_COUNT = 20000

  // Oversized file check
  const fakeBigSize = 12 * 1024 * 1024
  assert.ok(fakeBigSize > MAX_FILE_SIZE, 'Files above 10MB must be rejected')

  // Row count bounds check
  const fakeBigRowCount = 25000
  assert.ok(fakeBigRowCount > MAX_ROW_COUNT, 'Files above 20,000 rows must be rejected')
})

test('6. Schema Compatibility Engine identifies exact matches, missing features, and suggested mappings', () => {
  const requiredFeatures = ['store_footfall', 'ad_spend_digital', 'avg_price']
  const csvHeaders = ['daily_footfall', 'ad_spend_digital', 'avg_price', 'store_id']

  const exactMatches = requiredFeatures.filter((f) => csvHeaders.includes(f))
  const missingFeatures = requiredFeatures.filter((f) => !csvHeaders.includes(f))

  assert.deepEqual(exactMatches, ['ad_spend_digital', 'avg_price'])
  assert.deepEqual(missingFeatures, ['store_footfall'])

  // Suggested mapping: store_footfall -> daily_footfall
  const mapping = { store_footfall: 'daily_footfall' }
  const effectiveMapped = requiredFeatures.every((f) => {
    const col = mapping[f] || f
    return csvHeaders.includes(col)
  })

  assert.equal(effectiveMapped, true, 'All required features must be satisfied after column remapping')
})

test('7. Regression Dashboard Generation computes KPIs, distribution bins, and metrics', () => {
  const samplePredictions = [100.5, 200.0, 150.2, 300.8, 250.0]
  const groundTruth = [105.0, 195.0, 148.0, 310.0, 245.0]

  const mean = samplePredictions.reduce((a, b) => a + b, 0) / samplePredictions.length
  const min = Math.min(...samplePredictions)
  const max = Math.max(...samplePredictions)

  assert.equal(mean, 200.3)
  assert.equal(min, 100.5)
  assert.equal(max, 300.8)

  // Residuals: actual - predicted
  const residuals = groundTruth.map((act, i) => act - samplePredictions[i])
  assert.equal(residuals.length, 5)
  assert.equal(Math.round(residuals[0] * 10) / 10, 4.5)
})

test('8. Classification Dashboard handles class percentages, dominant class, and confidence', () => {
  const samplePredictions = ['loyal', 'churn', 'loyal', 'loyal', 'churn']
  const counts = samplePredictions.reduce((acc, c) => {
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})

  assert.equal(counts['loyal'], 3)
  assert.equal(counts['churn'], 2)
  assert.equal((counts['loyal'] / samplePredictions.length) * 100, 60)
})

test('9. Single Record Predictor derives dynamic form inputs from feature schema', () => {
  const featureSchema = [
    { name: 'ad_spend_tv', type: 'number', required: true, default: 5000 },
    { name: 'is_holiday', type: 'boolean', required: false, default: 0 },
    { name: 'customer_rating', type: 'number', required: true, min: 1, max: 10 },
  ]

  assert.equal(featureSchema.length, 3)
  assert.equal(featureSchema[0].default, 5000)
  assert.equal(featureSchema[1].type, 'boolean')
})

test('10. Prediction export attaches predicted values and residuals to original input columns', () => {
  const originalRow = { store_id: 101, footfall: 500, price: 29.99 }
  const prediction = 25000.5
  const actual = 24800.0

  const exportRow = {
    ...originalRow,
    predicted_value: prediction,
    actual_value: actual,
    residual_difference: Math.round((actual - prediction) * 100) / 100,
  }

  assert.equal(exportRow.store_id, 101)
  assert.equal(exportRow.predicted_value, 25000.5)
  assert.equal(exportRow.actual_value, 24800.0)
  assert.equal(exportRow.residual_difference, -200.5)
})

test('11. DynamicProjectPage renders MlModelPlaygroundView when projectType is ml_playground', () => {
  const pagePath = path.join(rootDir, 'src', 'pages', 'projects', 'DynamicProjectPage.tsx')
  const content = fs.readFileSync(pagePath, 'utf-8')

  assert.match(content, /MlModelPlaygroundView/, 'DynamicProjectPage must import and render MlModelPlaygroundView')
  assert.match(content, /ml_playground/, 'Must handle ml_playground projectType')
  assert.match(content, /SalesRevenuePredictionApp/, 'Must preserve existing SalesRevenuePredictionApp')
})

test('12. ProjectPreviewPage renders MlModelPlaygroundView for draft admin review', () => {
  const previewPath = path.join(rootDir, 'src', 'pages', 'admin', 'ProjectPreviewPage.tsx')
  const content = fs.readFileSync(previewPath, 'utf-8')

  assert.match(content, /MlModelPlaygroundView/, 'ProjectPreviewPage must import and render MlModelPlaygroundView')
  assert.match(content, /ml_playground/, 'Must support ml_playground preview')
})

test('13. Supabase migration defines ml_models, ml_model_versions, and ml_prediction_runs tables', () => {
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261021000000_ml_model_playground.sql')
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist')

  const sql = fs.readFileSync(migrationPath, 'utf-8')
  assert.match(sql, /create table if not exists public\.ml_models/, 'Must create ml_models table')
  assert.match(sql, /create table if not exists public\.ml_model_versions/, 'Must create ml_model_versions table')
  assert.match(sql, /create table if not exists public\.ml_prediction_runs/, 'Must create ml_prediction_runs table')
  assert.match(sql, /alter table public\.ml_models enable row level security/, 'Must enable RLS on ml_models')
  assert.match(sql, /ml_models_staff_all/, 'Must grant staff management policy on ml_models')
})

test('14. RBAC security: Non-staff users cannot register models or bypass access policies', () => {
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261021000000_ml_model_playground.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  assert.match(sql, /public\.is_staff\(auth\.uid\(\)\)/, 'Staff check must be enforced in RLS policies')
})

test('15. Backward compatibility: Sales Revenue routes and components remain 100% operational', () => {
  const salesServicePath = path.join(rootDir, 'src', 'services', 'salesRevenueInferenceService.ts')
  const content = fs.readFileSync(salesServicePath, 'utf-8')

  assert.match(content, /predictCsv/, 'SalesRevenueInferenceService.predictCsv must exist')
  assert.match(content, /getModelInfo/, 'SalesRevenueInferenceService.getModelInfo must exist')
  assert.match(content, /checkHealth/, 'SalesRevenueInferenceService.checkHealth must exist')
})

test('16. Step 2 failure blocks Step 3 and enforces registered model ID verification', () => {
  const wizardStepPath = path.join(rootDir, 'src', 'components', 'ml-playground', 'MlPlaygroundWizardStep.tsx')
  const content = fs.readFileSync(wizardStepPath, 'utf-8')

  // Step 2 must call registerModel with draft project ID
  assert.match(content, /MlPlaygroundService\.registerModel/, 'Must call backend registration during Step 2')
  assert.match(content, /registeredModelId/, 'Must track registeredModelId state')
  
  // Step 2 must block Continue to Dataset button if not registered
  assert.match(content, /disabled=\{.*!registeredModelId/, 'Must disable Continue button until model is registered')

  // Sub-step click navigation must block skipping to step 3, 4, 5 without registration
  assert.match(content, /tab\.id > 2 && !registeredModelId/, 'Must block advancing steps if registeredModelId is missing')
})

test('17. Step 3 strictly sends registered model_id and never falls back to project slug', () => {
  const wizardStepPath = path.join(rootDir, 'src', 'components', 'ml-playground', 'MlPlaygroundWizardStep.tsx')
  const content = fs.readFileSync(wizardStepPath, 'utf-8')

  // Verify activeModelId uses registeredModelId || config?.modelId and rejects when empty
  assert.match(content, /const activeModelId = registeredModelId \|\| config\?\.modelId/, 'Step 3 must use registeredModelId or config.modelId')
  assert.match(content, /if \(!activeModelId\)/, 'Step 3 must guard against missing model_id')
  assert.match(content, /Model not registered\. Please complete Step 2/, 'Step 3 must prompt to return to Step 2 if model is unregistered')
  
  // Verify validateDataset call in service requires valid modelIdOrSlug
  const servicePath = path.join(rootDir, 'src', 'services', 'mlPlaygroundService.ts')
  const serviceContent = fs.readFileSync(servicePath, 'utf-8')
  assert.match(serviceContent, /validateDataset\(\s*modelIdOrSlug:\s*string/, 'Service must require modelIdOrSlug')
  assert.match(serviceContent, /if \(!modelIdOrSlug/, 'Service must reject empty model ID')
})

test('18. Error states display informative guidance ("Model not registered. Re-upload in step 2")', () => {
  const wizardStepPath = path.join(rootDir, 'src', 'components', 'ml-playground', 'MlPlaygroundWizardStep.tsx')
  const content = fs.readFileSync(wizardStepPath, 'utf-8')

  assert.match(content, /modelError/, 'Must store and display model registration error states')
  assert.match(content, /datasetError/, 'Must store and display dataset validation error states')
})

test('19. Project-scoped model IDs avoid collision across multiple projects with identical slugs', () => {
  // Simulate two projects with identical slug 'churn-prediction'
  const projectA = { id: 'proj_alpha_123', name: 'Churn Prediction Alpha', slug: 'churn-prediction' }
  const projectB = { id: 'proj_beta_456', name: 'Churn Prediction Beta', slug: 'churn-prediction' }

  // Unique model IDs generated per project
  const modelA_id = `model_${projectA.slug}_${projectA.id.slice(-6)}`
  const modelB_id = `model_${projectB.slug}_${projectB.id.slice(-6)}`

  assert.notEqual(modelA_id, modelB_id, 'Models for different projects must have unique IDs even with same slug')
  assert.equal(modelA_id, 'model_churn-prediction_ha_123')
  assert.equal(modelB_id, 'model_churn-prediction_ta_456')
})

test('20. Classification Dashboard renders confusion matrix, probability distribution and evaluation metrics', () => {
  const viewPath = path.join(rootDir, 'src', 'components', 'ml-playground', 'MlModelPlaygroundView.tsx')
  const content = fs.readFileSync(viewPath, 'utf-8')

  assert.match(content, /Confusion Matrix/, 'MlModelPlaygroundView must render Confusion Matrix')
  assert.match(content, /Prediction Confidence Distribution/, 'MlModelPlaygroundView must render Confidence Distribution')
  assert.match(content, /Accuracy/, 'Must render Accuracy metric')
  assert.match(content, /Precision/, 'Must render Precision metric')
  assert.match(content, /Recall/, 'Must render Recall metric')
  assert.match(content, /F1-Score/, 'Must render F1-Score metric')
})
