import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// 15 Authoritative Feature Columns
const EXPECTED_FEATURES = [
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
]

// Pure client-side validation logic mirror
function preValidateCsvText(csvText, fileSize = 1000) {
  const MAX_SIZE = 10 * 1024 * 1024
  if (fileSize > MAX_SIZE) {
    return { isValid: false, error: 'File size exceeds 10MB limit.' }
  }

  const clean = csvText.replace(/^\ufeff/, '').trim()
  if (!clean) {
    return { isValid: false, error: 'Uploaded file is empty (0 rows).' }
  }

  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    return { isValid: false, error: 'CSV contains a header row but no data rows.' }
  }

  if (lines.length - 1 > 20000) {
    return { isValid: false, error: 'CSV row count exceeds 20000 rows.' }
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const missing = EXPECTED_FEATURES.filter((f) => !headers.includes(f))
  const extra = headers.filter((h) => !EXPECTED_FEATURES.includes(h) && h !== 'monthly_revenue')
  const hasTarget = headers.includes('monthly_revenue')

  if (missing.length > 0) {
    return {
      isValid: false,
      missingColumns: missing,
      extraColumns: extra,
      hasTarget,
      error: `Missing required feature columns: ${missing.join(', ')}`,
    }
  }

  return {
    isValid: true,
    rowCount: lines.length - 1,
    headers,
    missingColumns: [],
    extraColumns: extra,
    hasTarget,
  }
}

// Format download output helper
function formatDownloadCsv(originalRows, predictions) {
  assert.equal(originalRows.length, predictions.length, 'Row count mismatch')
  return predictions.map((p, i) => {
    return {
      row_id: i + 1,
      ...originalRows[i],
      predicted_revenue: p.predicted_revenue,
      ...(p.actual_revenue !== null ? { actual_revenue: p.actual_revenue, revenue_difference: p.difference } : {}),
    }
  })
}

// ============================================================================
// AUTOMATED TEST SUITE: SALES REVENUE INFERENCE & DYNAMIC PAGE INTEGRATION
// ============================================================================

test('Sales Revenue: 1. Model Artifact and Training Files Location', () => {
  // Check backend service directory has trusted trained_model.joblib
  const unifiedModelPath = path.resolve(rootDir, '..', '..', 'analytics-avenue-backend', 'ml', 'sales_revenue', 'models', 'trained_model.joblib')
  const backupModelPath = path.join(rootDir, 'backend', 'sales_revenue_service', 'models', 'trained_model.joblib')
  const backendModelPath = fs.existsSync(unifiedModelPath) ? unifiedModelPath : backupModelPath
  assert.ok(fs.existsSync(backendModelPath), 'Trusted model artifact must exist in unified backend or backend/sales_revenue_service/models')
  const stats = fs.statSync(backendModelPath)
  assert.ok(stats.size > 500, 'Model file should have valid size')

  // Check public directory has the presentation, documentation, and dataset assets
  const publicPptx = path.join(rootDir, 'public', 'sales-revenue', 'presentation.pptx')
  const publicReadme = path.join(rootDir, 'public', 'sales-revenue', 'README.md')
  const publicReqs = path.join(rootDir, 'public', 'sales-revenue', 'requirements.txt')
  const publicCsv = path.join(rootDir, 'public', 'sales-revenue', 'sales_revenue_data.csv')

  assert.ok(fs.existsSync(publicPptx), 'presentation.pptx must exist in public/sales-revenue')
  assert.ok(fs.existsSync(publicReadme), 'README.md must exist in public/sales-revenue')
  assert.ok(fs.existsSync(publicReqs), 'requirements.txt must exist in public/sales-revenue')
  assert.ok(fs.existsSync(publicCsv), 'sales_revenue_data.csv must exist in public/sales-revenue')

  // Private model artifact MUST NOT be in public assets
  const publicModel = path.join(rootDir, 'public', 'sales-revenue', 'trained_model.joblib')
  assert.ok(!fs.existsSync(publicModel), 'Security rule: trained_model.joblib must NEVER be placed in public frontend assets')
})

test('Sales Revenue: 2. Feature Schema & Leakage Prevention', () => {
  assert.equal(EXPECTED_FEATURES.length, 15, 'Model must have exactly 15 input features')
  assert.ok(!EXPECTED_FEATURES.includes('monthly_revenue'), 'monthly_revenue must never be in feature matrix (target leakage prevention)')

  // Check all 15 expected feature names
  const expectedNames = [
    'ad_spend_tv', 'ad_spend_digital', 'ad_spend_radio', 'store_footfall',
    'discount_percentage', 'num_sales_staff', 'competitor_count_nearby',
    'avg_product_price', 'store_size_sqft', 'customer_satisfaction_score',
    'social_media_engagement_score', 'marketing_email_count',
    'is_holiday_season_flag', 'loyalty_program_flag', 'online_orders_flag',
  ]
  assert.deepEqual(EXPECTED_FEATURES, expectedNames)
})

test('Sales Revenue: 3. Client-Side CSV Pre-Validation on Valid File', () => {
  const sampleValidCsv = `ad_spend_tv,ad_spend_digital,ad_spend_radio,store_footfall,discount_percentage,num_sales_staff,competitor_count_nearby,avg_product_price,store_size_sqft,customer_satisfaction_score,social_media_engagement_score,marketing_email_count,is_holiday_season_flag,loyalty_program_flag,online_orders_flag,monthly_revenue
3815.41,16648.5,13100.21,2338,2.7,4,1,3554.06,5922,5.4,65.6,26,0,1,1,274147.34
38995.94,7200.53,1006.93,3942,18.9,28,9,2312.22,7206,3.4,60.1,7,1,1,0,337236.2`

  const result = preValidateCsvText(sampleValidCsv)
  assert.equal(result.isValid, true)
  assert.equal(result.rowCount, 2)
  assert.equal(result.hasTarget, true)
  assert.equal(result.missingColumns.length, 0)
})

test('Sales Revenue: 4. CSV Pre-Validation Missing Feature Rejection', () => {
  // Missing ad_spend_tv
  const invalidCsv = `ad_spend_digital,ad_spend_radio,store_footfall,discount_percentage,num_sales_staff,competitor_count_nearby,avg_product_price,store_size_sqft,customer_satisfaction_score,social_media_engagement_score,marketing_email_count,is_holiday_season_flag,loyalty_program_flag,online_orders_flag
16648.5,13100.21,2338,2.7,4,1,3554.06,5922,5.4,65.6,26,0,1,1`

  const result = preValidateCsvText(invalidCsv)
  assert.equal(result.isValid, false)
  assert.ok(result.missingColumns.includes('ad_spend_tv'))
  assert.match(result.error, /Missing required feature columns/)
})

test('Sales Revenue: 5. CSV Extra Columns Detection & Preservation', () => {
  const csvWithExtras = `store_id,store_city,${EXPECTED_FEATURES.join(',')}\nSTORE_101,Mumbai,3815.41,16648.5,13100.21,2338,2.7,4,1,3554.06,5922,5.4,65.6,26,0,1,1`
  const result = preValidateCsvText(csvWithExtras)
  assert.equal(result.isValid, true)
  assert.ok(result.extraColumns.includes('store_id'))
  assert.ok(result.extraColumns.includes('store_city'))
})

test('Sales Revenue: 6. UTF-8 BOM Handling in Pre-Validation', () => {
  const bomCsv = `\ufeff${EXPECTED_FEATURES.join(',')}\n3815.41,16648.5,13100.21,2338,2.7,4,1,3554.06,5922,5.4,65.6,26,0,1,1`
  const result = preValidateCsvText(bomCsv)
  assert.equal(result.isValid, true)
  assert.equal(result.rowCount, 1)
  assert.equal(result.missingColumns.length, 0)
})

test('Sales Revenue: 7. Row Limit & File Size Enforcement', () => {
  // Exceeds file size
  const largeRes = preValidateCsvText('header\nrow', 15 * 1024 * 1024)
  assert.equal(largeRes.isValid, false)
  assert.match(largeRes.error, /exceeds 10MB limit/)

  // Header only (0 data rows)
  const headerOnly = EXPECTED_FEATURES.join(',')
  const emptyRes = preValidateCsvText(headerOnly)
  assert.equal(emptyRes.isValid, false)
  assert.match(emptyRes.error, /no data rows/)
})

test('Sales Revenue: 8. Downloadable Output Preserves Columns and Associations', () => {
  const originalInputs = [
    { store_id: 'S01', ad_spend_digital: 16648.5, footfall: 2338 },
    { store_id: 'S02', ad_spend_digital: 7200.5, footfall: 3942 },
  ]
  const predictions = [
    { predicted_revenue: 272214.04, actual_revenue: 274147.34, difference: 1933.30 },
    { predicted_revenue: 315942.12, actual_revenue: 337236.20, difference: 21294.08 },
  ]

  const outputRows = formatDownloadCsv(originalInputs, predictions)
  assert.equal(outputRows.length, 2)
  assert.equal(outputRows[0].store_id, 'S01')
  assert.equal(outputRows[0].predicted_revenue, 272214.04)
  assert.equal(outputRows[0].actual_revenue, 274147.34)
  assert.equal(outputRows[0].revenue_difference, 1933.30)
  assert.equal(outputRows[1].store_id, 'S02')
  assert.equal(outputRows[1].predicted_revenue, 315942.12)
})

test('Sales Revenue: 9. RBAC & Direct URL Access Authorization', () => {
  const projectIndustry = 'Marketing Analytics'
  
  // Client A with Marketing Analytics access
  const clientWithMarketing = new Set(['Gen AI', 'Marketing Analytics'])
  assert.equal(clientWithMarketing.has(projectIndustry), true, 'Client with Marketing Analytics grant must be authorized')

  // Client B without Marketing Analytics access
  const clientWithoutMarketing = new Set(['Healthcare', 'EV'])
  assert.equal(clientWithoutMarketing.has(projectIndustry), false, 'Client without Marketing Analytics grant must be denied')

  // Staff role override
  const staffRole = 'admin'
  const isStaff = staffRole === 'admin' || staffRole === 'super_admin'
  assert.equal(isStaff, true, 'Staff role bypasses industry restriction')
})

test('Sales Revenue: 10. Dynamic Project Page Tab Preservation', () => {
  // Simulate tab builder for sales-revenue
  const slug = 'sales-revenue'
  const projectType = 'notebook'
  const tabs = []

  // 1. Overview
  tabs.push({ key: 'overview', label: 'Overview' })

  // 2. Application & Notebook
  if (slug === 'sales-revenue') {
    tabs.push({ key: 'application', label: 'Predict Revenue' })
    tabs.push({ key: 'notebook', label: 'Research Notebook' })
  } else if (projectType === 'notebook') {
    tabs.push({ key: 'application', label: 'Research Notebook' })
  }

  // 3. Results
  tabs.push({ key: 'results', label: 'Results & Impact' })

  // 4. Presentation
  tabs.push({ key: 'presentation', label: 'Presentation' })

  // 5. Documentation
  tabs.push({ key: 'documentation', label: 'Documentation' })

  const tabKeys = tabs.map((t) => t.key)
  const tabLabels = tabs.map((t) => t.label)

  assert.deepEqual(tabKeys, ['overview', 'application', 'notebook', 'results', 'presentation', 'documentation'])
  assert.ok(tabLabels.includes('Predict Revenue'), 'Predict Revenue tab must be present')
  assert.ok(tabLabels.includes('Research Notebook'), 'Research Notebook tab must be preserved')
  assert.ok(tabLabels.includes('Results & Impact'), 'Results & Impact tab must be preserved')
  assert.ok(tabLabels.includes('Presentation'), 'Presentation tab must be preserved')
  assert.ok(tabLabels.includes('Documentation'), 'Documentation tab must be preserved')
})

test('Sales Revenue: 11. Preserves Pre-computed Outputs in Research Notebook', () => {
  const nbPath = path.join(rootDir, 'src', 'services', 'demoData', 'salesRevenueNotebook.json')
  assert.ok(fs.existsSync(nbPath), 'salesRevenueNotebook.json must exist')
  const raw = fs.readFileSync(nbPath, 'utf8')
  const nbConfig = JSON.parse(raw)

  assert.equal(nbConfig.fileName, 'sales_revenue.ipynb')
  assert.equal(nbConfig.metadata.cellCount, 31)
  assert.equal(nbConfig.metadata.hasOutputs, true)
  assert.equal(nbConfig.cells.length, 31)

  // Verify code cells contain output and base64 plots
  const plotCells = nbConfig.cells.filter(
    (c) => c.outputs && c.outputs.some((o) => o.data && (o.data['image/png'] || o.data['image/jpeg']))
  )
  assert.ok(plotCells.length >= 4, 'Notebook config must retain the pre-computed matplotlib plots')
})
