/**
 * Realistic Demo Data for Solar Power Domain
 * Covers:
 * 1. Solar Power Generation Forecasting Lab
 * 2. PV Panel Degradation Intelligence Lab
 * 3. Inverter Failure Prediction Lab
 */

export interface SolarForecastRow {
  timestamp: string
  solar_radiation_wm2: number
  diffuse_radiation_wm2: number
  direct_normal_irradiance_wm2: number
  temperature_c: number
  humidity_pct: number
  wind_speed_mps: number
  wind_direction_deg: number
  cloud_cover_pct: number
  pressure_hpa: number
  dew_point_c: number
  forecast_generation_kwh: number
  actual_generation_kwh: number
  generation_error_kwh: number
  plant_id: string
  inverter_cluster_id: string
  weather_condition: string
  sunrise_time: string
  sunset_time: string
  day_of_year: number
  clearness_index: number
  panel_tilt_deg: number
  panel_azimuth_deg: number
  is_holiday_flag: number
  [key: string]: any
}

export const DEMO_SOLAR_FORECAST_DATA: SolarForecastRow[] = [
  { timestamp: '2026-02-15 08:00:00', solar_radiation_wm2: 280, diffuse_radiation_wm2: 70, direct_normal_irradiance_wm2: 450, temperature_c: 24.5, humidity_pct: 62, wind_speed_mps: 2.4, wind_direction_deg: 95, cloud_cover_pct: 10, pressure_hpa: 1012, dew_point_c: 16.8, forecast_generation_kwh: 1450, actual_generation_kwh: 1420, generation_error_kwh: -30, plant_id: 'SOLAR-PLANT-01', inverter_cluster_id: 'CLUSTER-A', weather_condition: 'Sunny', sunrise_time: '06:35', sunset_time: '18:22', day_of_year: 46, clearness_index: 0.72, panel_tilt_deg: 20, panel_azimuth_deg: 180, is_holiday_flag: 0 },
  { timestamp: '2026-02-15 10:00:00', solar_radiation_wm2: 640, diffuse_radiation_wm2: 110, direct_normal_irradiance_wm2: 780, temperature_c: 29.2, humidity_pct: 48, wind_speed_mps: 3.1, wind_direction_deg: 110, cloud_cover_pct: 5, pressure_hpa: 1011, dew_point_c: 17.5, forecast_generation_kwh: 3480, actual_generation_kwh: 3510, generation_error_kwh: 30, plant_id: 'SOLAR-PLANT-01', inverter_cluster_id: 'CLUSTER-A', weather_condition: 'Clear', sunrise_time: '06:35', sunset_time: '18:22', day_of_year: 46, clearness_index: 0.81, panel_tilt_deg: 20, panel_azimuth_deg: 180, is_holiday_flag: 0 },
  { timestamp: '2026-02-15 12:00:00', solar_radiation_wm2: 920, diffuse_radiation_wm2: 140, direct_normal_irradiance_wm2: 910, temperature_c: 33.8, humidity_pct: 35, wind_speed_mps: 3.8, wind_direction_deg: 125, cloud_cover_pct: 8, pressure_hpa: 1009, dew_point_c: 16.1, forecast_generation_kwh: 4850, actual_generation_kwh: 4790, generation_error_kwh: -60, plant_id: 'SOLAR-PLANT-01', inverter_cluster_id: 'CLUSTER-B', weather_condition: 'Clear', sunrise_time: '06:35', sunset_time: '18:22', day_of_year: 46, clearness_index: 0.85, panel_tilt_deg: 20, panel_azimuth_deg: 180, is_holiday_flag: 0 },
  { timestamp: '2026-02-15 14:00:00', solar_radiation_wm2: 760, diffuse_radiation_wm2: 130, direct_normal_irradiance_wm2: 820, temperature_c: 34.5, humidity_pct: 32, wind_speed_mps: 4.2, wind_direction_deg: 140, cloud_cover_pct: 15, pressure_hpa: 1008, dew_point_c: 15.4, forecast_generation_kwh: 4100, actual_generation_kwh: 4050, generation_error_kwh: -50, plant_id: 'SOLAR-PLANT-02', inverter_cluster_id: 'CLUSTER-A', weather_condition: 'Sunny', sunrise_time: '06:35', sunset_time: '18:22', day_of_year: 46, clearness_index: 0.78, panel_tilt_deg: 20, panel_azimuth_deg: 180, is_holiday_flag: 0 },
  { timestamp: '2026-02-15 16:00:00', solar_radiation_wm2: 390, diffuse_radiation_wm2: 95, direct_normal_irradiance_wm2: 520, temperature_c: 31.0, humidity_pct: 44, wind_speed_mps: 3.5, wind_direction_deg: 155, cloud_cover_pct: 20, pressure_hpa: 1009, dew_point_c: 16.5, forecast_generation_kwh: 2150, actual_generation_kwh: 2200, generation_error_kwh: 50, plant_id: 'SOLAR-PLANT-02', inverter_cluster_id: 'CLUSTER-B', weather_condition: 'Partly Cloudy', sunrise_time: '06:35', sunset_time: '18:22', day_of_year: 46, clearness_index: 0.69, panel_tilt_deg: 20, panel_azimuth_deg: 180, is_holiday_flag: 0 },
]

export interface PvDegradationRow {
  panel_id: string
  string_id: string
  timestamp: string
  irradiation_wm2: number
  temperature_c: number
  panel_voltage_v: number
  panel_current_a: number
  panel_efficiency_pct: number
  baseline_efficiency_pct: number
  degradation_pct: number
  performance_ratio: number
  soiling_factor_pct: number
  shading_loss_pct: number
  module_age_years: number
  installation_angle_deg: number
  panel_serial_number: string
  manufacturer: string
  underperformance_flag: number
  hotspot_detected_flag: number
  last_cleaned_date: string
  region: string
  [key: string]: any
}

const REGIONS = ['North', 'South', 'West', 'East']
const MANUFACTURERS = ['Tata Power Solar', 'Waaree Energies', 'Adani Solar', 'Vikram Solar', 'Goldi Solar']

export const DEMO_PV_DEGRADATION_DATA: PvDegradationRow[] = Array.from({ length: 90 }, (_, i) => {
  const mfg = MANUFACTURERS[i % MANUFACTURERS.length]
  const region = REGIONS[i % REGIONS.length]
  const age = Number((1.2 + (i % 10) * 0.6).toFixed(1))
  const isHotspot = i % 7 === 0 ? 1 : 0
  const isUnderperforming = isHotspot || i % 5 === 0 ? 1 : 0
  const degradation = Number((age * 2.4 + (isHotspot ? 16.5 : (i % 4) * 1.2)).toFixed(1))
  const pr = Number(Math.max(0.55, 0.92 - degradation / 100).toFixed(2))
  const eff = Number((21.5 * (1 - degradation / 100)).toFixed(1))
  const temp = Number((42 + (isHotspot ? 22 : 0) + (i % 8) * 1.5).toFixed(1))

  return {
    panel_id: `PNL-${String.fromCharCode(65 + (i % 6))}-${String(i + 1).padStart(3, '0')}`,
    string_id: `STR-${String((i % 12) + 1).padStart(2, '0')}`,
    timestamp: '2026-02-15 12:00:00',
    irradiation_wm2: 920 + (i % 7) * 8,
    temperature_c: temp,
    panel_voltage_v: Number((38.5 - (degradation / 10)).toFixed(1)),
    panel_current_a: Number((10.0 - (degradation / 15)).toFixed(1)),
    panel_efficiency_pct: eff,
    baseline_efficiency_pct: 21.5,
    degradation_pct: degradation,
    performance_ratio: pr,
    soiling_factor_pct: Number((2.0 + (i % 6) * 1.8).toFixed(1)),
    shading_loss_pct: Number(((i % 5) * 0.8).toFixed(1)),
    module_age_years: age,
    installation_angle_deg: 22,
    panel_serial_number: `SN-${mfg.slice(0, 4).toUpperCase()}-2024-${String(i + 1).padStart(3, '0')}`,
    manufacturer: mfg,
    underperformance_flag: isUnderperforming,
    hotspot_detected_flag: isHotspot,
    last_cleaned_date: `2026-0${1 + (i % 2)}-${String(1 + (i % 28)).padStart(2, '0')}`,
    region,
  }
})

export interface InverterFailureRow {
  inverter_id: string
  timestamp: string
  temperature_c: number
  heatsink_temp_c: number
  voltage_v: number
  current_a: number
  vibration_mms: number
  dc_input_kw: number
  ac_output_kw: number
  pf_power_factor: number
  frequency_hz: number
  mppt_voltage_v: number
  mppt_current_a: number
  total_energy_generated_kwh: number
  lifetime_hours: number
  ambient_temperature_c: number
  fan_speed_rpm: number
  fault_code: string
  string_count_active: number
  grid_status: string
  failure_within_7_days: number
  [key: string]: any
}

const FAULT_CODES = ['NORMAL', 'NORMAL', 'NORMAL', 'E-THERM-OVER', 'W-FAN-DEGRADE', 'E-GRID-FREQ']
const GRID_STATUSES = ['Synchronized', 'Synchronized', 'Synchronized', 'Unstable', 'Islanded']

export const DEMO_INVERTER_FAILURE_DATA: InverterFailureRow[] = Array.from({ length: 90 }, (_, i) => {
  const willFail = i % 4 === 0 ? 1 : 0
  const fault = willFail ? (i % 2 === 0 ? 'E-THERM-OVER' : 'W-FAN-DEGRADE') : FAULT_CODES[i % FAULT_CODES.length]
  const grid = willFail && i % 3 === 0 ? 'Unstable' : GRID_STATUSES[i % GRID_STATUSES.length]
  const temp = willFail ? Number((72 + (i % 10) * 1.5).toFixed(1)) : Number((52 + (i % 8) * 1.2).toFixed(1))
  const heatsink = Number((temp + 8.5 + (willFail ? 6 : 0)).toFixed(1))
  const fanRpm = willFail ? 1200 + (i % 5) * 100 : 2800 + (i % 6) * 50

  return {
    inverter_id: `INV-${101 + (i % 12)}`,
    timestamp: '2026-02-15 12:00:00',
    temperature_c: temp,
    heatsink_temp_c: heatsink,
    voltage_v: Number((415 - (willFail ? 18 : 0) + (i % 6)).toFixed(1)),
    current_a: Number((130 + (willFail ? 15 : 0) + (i % 8)).toFixed(1)),
    vibration_mms: Number((1.2 + (willFail ? 2.8 : 0) + (i % 5) * 0.2).toFixed(1)),
    dc_input_kw: Number((62 - (willFail ? 7 : 0)).toFixed(1)),
    ac_output_kw: Number((60 - (willFail ? 9 : 0)).toFixed(1)),
    pf_power_factor: Number((willFail ? 0.94 : 0.99).toFixed(2)),
    frequency_hz: Number((50.0 + ((i % 5) - 2) * 0.05).toFixed(2)),
    mppt_voltage_v: willFail ? 620 : 680,
    mppt_current_a: Number((90 + (i % 8)).toFixed(1)),
    total_energy_generated_kwh: 140000 + i * 1200,
    lifetime_hours: 15000 + i * 180,
    ambient_temperature_c: Number((33 + (i % 5)).toFixed(1)),
    fan_speed_rpm: fanRpm,
    fault_code: fault,
    string_count_active: willFail ? 10 : 12,
    grid_status: grid,
    failure_within_7_days: willFail,
  }
})

