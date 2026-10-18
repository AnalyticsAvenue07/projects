/**
 * Realistic Demo Data for EV Domain
 * Covers:
 * 1. EV Dynamic Range Prediction & Anxiety Reduction Lab
 * 2. EV Charging Station Fault Detection Lab
 */

export interface EvRangeRow {
  vehicle_id: string
  battery_capacity_kwh: number
  state_of_charge_pct: number
  state_of_health_pct: number
  battery_temp_c: number
  vehicle_weight_kg: number
  payload_kg: number
  avg_speed_kmph: number
  acceleration_score: number
  regen_braking_pct: number
  driving_style: string
  terrain_type: string
  elevation_gain_m: number
  traffic_level: string
  ambient_temp_c: number
  rain_intensity_mm: number
  wind_speed_kmph: number
  energy_consumption_wh_per_km: number
  static_range_km: number
  dynamic_range_km: number
  actual_range_km: number
  range_error_km: number
  range_anxiety_flag: number
  [key: string]: any
}

export const DEMO_EV_RANGE_DATA: EvRangeRow[] = [
  { vehicle_id: 'EV-NEXON-01', battery_capacity_kwh: 40.5, state_of_charge_pct: 85, state_of_health_pct: 96, battery_temp_c: 28, vehicle_weight_kg: 1400, payload_kg: 180, avg_speed_kmph: 55, acceleration_score: 72, regen_braking_pct: 22, driving_style: 'Normal', terrain_type: 'City Flat', elevation_gain_m: 45, traffic_level: 'Moderate', ambient_temp_c: 30, rain_intensity_mm: 0, wind_speed_kmph: 12, energy_consumption_wh_per_km: 128, static_range_km: 268, dynamic_range_km: 262, actual_range_km: 259, range_error_km: 3, range_anxiety_flag: 0 },
  { vehicle_id: 'EV-TIAGO-02', battery_capacity_kwh: 24.0, state_of_charge_pct: 35, state_of_health_pct: 92, battery_temp_c: 34, vehicle_weight_kg: 1150, payload_kg: 240, avg_speed_kmph: 72, acceleration_score: 88, regen_braking_pct: 14, driving_style: 'Aggressive', terrain_type: 'Highway', elevation_gain_m: 110, traffic_level: 'Low', ambient_temp_c: 35, rain_intensity_mm: 2, wind_speed_kmph: 18, energy_consumption_wh_per_km: 152, static_range_km: 74, dynamic_range_km: 55, actual_range_km: 52, range_error_km: 3, range_anxiety_flag: 1 },
  { vehicle_id: 'EV-ZS-03', battery_capacity_kwh: 50.3, state_of_charge_pct: 92, state_of_health_pct: 98, battery_temp_c: 26, vehicle_weight_kg: 1620, payload_kg: 150, avg_speed_kmph: 48, acceleration_score: 55, regen_braking_pct: 32, driving_style: 'Eco', terrain_type: 'Urban', elevation_gain_m: 30, traffic_level: 'Heavy', ambient_temp_c: 27, rain_intensity_mm: 0, wind_speed_kmph: 8, energy_consumption_wh_per_km: 118, static_range_km: 388, dynamic_range_km: 395, actual_range_km: 392, range_error_km: 3, range_anxiety_flag: 0 },
  { vehicle_id: 'EV-CURVV-04', battery_capacity_kwh: 55.0, state_of_charge_pct: 22, state_of_health_pct: 97, battery_temp_c: 38, vehicle_weight_kg: 1550, payload_kg: 310, avg_speed_kmph: 85, acceleration_score: 82, regen_braking_pct: 12, driving_style: 'Aggressive', terrain_type: 'Uphill Hilly', elevation_gain_m: 480, traffic_level: 'Low', ambient_temp_c: 33, rain_intensity_mm: 5, wind_speed_kmph: 24, energy_consumption_wh_per_km: 184, static_range_km: 98, dynamic_range_km: 66, actual_range_km: 64, range_error_km: 2, range_anxiety_flag: 1 },
  { vehicle_id: 'EV-IONIQ-05', battery_capacity_kwh: 72.6, state_of_charge_pct: 78, state_of_health_pct: 99, battery_temp_c: 25, vehicle_weight_kg: 1980, payload_kg: 210, avg_speed_kmph: 68, acceleration_score: 64, regen_braking_pct: 28, driving_style: 'Normal', terrain_type: 'Expressway', elevation_gain_m: 60, traffic_level: 'Moderate', ambient_temp_c: 28, rain_intensity_mm: 0, wind_speed_kmph: 14, energy_consumption_wh_per_km: 144, static_range_km: 432, dynamic_range_km: 394, actual_range_km: 389, range_error_km: 5, range_anxiety_flag: 0 },
  { vehicle_id: 'EV-NEXON-06', battery_capacity_kwh: 40.5, state_of_charge_pct: 18, state_of_health_pct: 94, battery_temp_c: 39, vehicle_weight_kg: 1400, payload_kg: 260, avg_speed_kmph: 42, acceleration_score: 60, regen_braking_pct: 25, driving_style: 'Normal', terrain_type: 'City Flat', elevation_gain_m: 20, traffic_level: 'Heavy', ambient_temp_c: 36, rain_intensity_mm: 0, wind_speed_kmph: 10, energy_consumption_wh_per_km: 139, static_range_km: 57, dynamic_range_km: 48, actual_range_km: 46, range_error_km: 2, range_anxiety_flag: 1 },
  { vehicle_id: 'EV-ATTO-07', battery_capacity_kwh: 60.5, state_of_charge_pct: 65, state_of_health_pct: 98, battery_temp_c: 27, vehicle_weight_kg: 1750, payload_kg: 170, avg_speed_kmph: 52, acceleration_score: 58, regen_braking_pct: 30, driving_style: 'Eco', terrain_type: 'Suburban', elevation_gain_m: 40, traffic_level: 'Moderate', ambient_temp_c: 29, rain_intensity_mm: 0, wind_speed_kmph: 11, energy_consumption_wh_per_km: 126, static_range_km: 335, dynamic_range_km: 312, actual_range_km: 308, range_error_km: 4, range_anxiety_flag: 0 },
  { vehicle_id: 'EV-PUNCH-08', battery_capacity_kwh: 35.0, state_of_charge_pct: 45, state_of_health_pct: 95, battery_temp_c: 31, vehicle_weight_kg: 1320, payload_kg: 190, avg_speed_kmph: 60, acceleration_score: 70, regen_braking_pct: 20, driving_style: 'Normal', terrain_type: 'Mixed', elevation_gain_m: 75, traffic_level: 'Moderate', ambient_temp_c: 31, rain_intensity_mm: 0, wind_speed_kmph: 15, energy_consumption_wh_per_km: 136, static_range_km: 148, dynamic_range_km: 116, actual_range_km: 114, range_error_km: 2, range_anxiety_flag: 0 },
  { vehicle_id: 'EV-XUV400-09', battery_capacity_kwh: 39.4, state_of_charge_pct: 28, state_of_health_pct: 93, battery_temp_c: 36, vehicle_weight_kg: 1580, payload_kg: 280, avg_speed_kmph: 75, acceleration_score: 85, regen_braking_pct: 16, driving_style: 'Aggressive', terrain_type: 'Highway', elevation_gain_m: 90, traffic_level: 'Low', ambient_temp_c: 34, rain_intensity_mm: 8, wind_speed_kmph: 22, energy_consumption_wh_per_km: 168, static_range_km: 98, dynamic_range_km: 66, actual_range_km: 62, range_error_km: 4, range_anxiety_flag: 1 },
  { vehicle_id: 'EV-ZS-10', battery_capacity_kwh: 50.3, state_of_charge_pct: 80, state_of_health_pct: 97, battery_temp_c: 28, vehicle_weight_kg: 1620, payload_kg: 160, avg_speed_kmph: 50, acceleration_score: 52, regen_braking_pct: 34, driving_style: 'Eco', terrain_type: 'Urban', elevation_gain_m: 25, traffic_level: 'Moderate', ambient_temp_c: 28, rain_intensity_mm: 0, wind_speed_kmph: 9, energy_consumption_wh_per_km: 120, static_range_km: 340, dynamic_range_km: 335, actual_range_km: 331, range_error_km: 4, range_anxiety_flag: 0 },
]

export interface EvChargerRow {
  charger_id: string
  timestamp: string
  voltage: number
  current: number
  temperature: number
  power_kw: number
  session_active: boolean
  fault_flag: number
  fault_type: string
  [key: string]: any
}

export const DEMO_EV_CHARGER_DATA: EvChargerRow[] = [
  { charger_id: 'CHG-BLR-01', timestamp: '2026-02-15 08:30:00', voltage: 415.2, current: 72.4, temperature: 42.1, power_kw: 30.06, session_active: true, fault_flag: 0, fault_type: 'None' },
  { charger_id: 'CHG-BLR-02', timestamp: '2026-02-15 08:45:00', voltage: 382.0, current: 89.1, temperature: 68.4, power_kw: 34.03, session_active: true, fault_flag: 1, fault_type: 'Over-temperature' },
  { charger_id: 'CHG-MUM-01', timestamp: '2026-02-15 09:00:00', voltage: 418.5, current: 120.5, temperature: 48.0, power_kw: 50.43, session_active: true, fault_flag: 0, fault_type: 'None' },
  { charger_id: 'CHG-MUM-02', timestamp: '2026-02-15 09:15:00', voltage: 452.1, current: 14.2, temperature: 41.5, power_kw: 6.42, session_active: false, fault_flag: 1, fault_type: 'Over-voltage' },
  { charger_id: 'CHG-DEL-01', timestamp: '2026-02-15 09:30:00', voltage: 409.8, current: 145.0, temperature: 52.3, power_kw: 59.42, session_active: true, fault_flag: 0, fault_type: 'None' },
  { charger_id: 'CHG-DEL-02', timestamp: '2026-02-15 09:45:00', voltage: 330.4, current: 110.2, temperature: 56.1, power_kw: 36.41, session_active: true, fault_flag: 1, fault_type: 'Under-voltage' },
  { charger_id: 'CHG-HYD-01', timestamp: '2026-02-15 10:00:00', voltage: 416.0, current: 118.0, temperature: 45.2, power_kw: 49.09, session_active: true, fault_flag: 0, fault_type: 'None' },
  { charger_id: 'CHG-HYD-02', timestamp: '2026-02-15 10:15:00', voltage: 412.3, current: 2.1, temperature: 38.0, power_kw: 0.86, session_active: true, fault_flag: 1, fault_type: 'Communication Timeout' },
  { charger_id: 'CHG-CHN-01', timestamp: '2026-02-15 10:30:00', voltage: 414.7, current: 75.3, temperature: 44.1, power_kw: 31.23, session_active: true, fault_flag: 0, fault_type: 'None' },
  { charger_id: 'CHG-PUN-01', timestamp: '2026-02-15 10:45:00', voltage: 417.8, current: 132.4, temperature: 71.8, power_kw: 55.32, session_active: true, fault_flag: 1, fault_type: 'Thermal Throttling' },
  { charger_id: 'CHG-BLR-03', timestamp: '2026-02-15 11:00:00', voltage: 415.9, current: 65.0, temperature: 40.5, power_kw: 27.03, session_active: true, fault_flag: 0, fault_type: 'None' },
  { charger_id: 'CHG-MUM-03', timestamp: '2026-02-15 11:15:00', voltage: 416.2, current: 110.0, temperature: 46.2, power_kw: 45.78, session_active: true, fault_flag: 0, fault_type: 'None' },
]
