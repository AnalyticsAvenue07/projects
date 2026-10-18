/**
 * Realistic Demo Data for Manufacturing Domain
 * Covers:
 * 1. Machine Failure & Predictive Maintenance Lab
 * 2. Order-to-Delivery Analytics Lab
 * 3. Inventory Pileup & Shortage Analytics Lab
 */

export interface MachineFailureRow {
  Timestamp: string
  Machine_ID: string
  Machine_Type: string
  Temperature: number
  Vibration: number
  RPM: number
  Load: number
  Run_Hours: number
  Temp_Anomaly: number
  Vib_Anomaly: number
  Load_Anomaly: number
  RPM_Anomaly: number
  Failure_Flag: number
  [key: string]: any
}

export const DEMO_MACHINE_FAILURE_DATA: MachineFailureRow[] = [
  { Timestamp: '2026-02-15 08:00:00', Machine_ID: 'CNC-M-01', Machine_Type: 'CNC Milling', Temperature: 68.2, Vibration: 2.1, RPM: 3200, Load: 74, Run_Hours: 1420, Temp_Anomaly: 0, Vib_Anomaly: 0, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 0 },
  { Timestamp: '2026-02-15 08:15:00', Machine_ID: 'CNC-M-02', Machine_Type: 'CNC Milling', Temperature: 94.6, Vibration: 5.8, RPM: 2840, Load: 92, Run_Hours: 3890, Temp_Anomaly: 1, Vib_Anomaly: 1, Load_Anomaly: 1, RPM_Anomaly: 1, Failure_Flag: 1 },
  { Timestamp: '2026-02-15 08:30:00', Machine_ID: 'INJ-P-01', Machine_Type: 'Injection Molding', Temperature: 185.0, Vibration: 1.8, RPM: 1450, Load: 68, Run_Hours: 850, Temp_Anomaly: 0, Vib_Anomaly: 0, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 0 },
  { Timestamp: '2026-02-15 08:45:00', Machine_ID: 'INJ-P-02', Machine_Type: 'Injection Molding', Temperature: 228.4, Vibration: 4.1, RPM: 1120, Load: 89, Run_Hours: 4200, Temp_Anomaly: 1, Vib_Anomaly: 1, Load_Anomaly: 0, RPM_Anomaly: 1, Failure_Flag: 1 },
  { Timestamp: '2026-02-15 09:00:00', Machine_ID: 'LATHE-01', Machine_Type: 'CNC Lathe', Temperature: 62.5, Vibration: 1.6, RPM: 2400, Load: 60, Run_Hours: 1980, Temp_Anomaly: 0, Vib_Anomaly: 0, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 0 },
  { Timestamp: '2026-02-15 09:15:00', Machine_ID: 'STAMP-01', Machine_Type: 'Hydraulic Press', Temperature: 71.0, Vibration: 2.4, RPM: 950, Load: 82, Run_Hours: 2750, Temp_Anomaly: 0, Vib_Anomaly: 0, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 0 },
  { Timestamp: '2026-02-15 09:30:00', Machine_ID: 'STAMP-02', Machine_Type: 'Hydraulic Press', Temperature: 91.2, Vibration: 6.4, RPM: 710, Load: 96, Run_Hours: 5100, Temp_Anomaly: 1, Vib_Anomaly: 1, Load_Anomaly: 1, RPM_Anomaly: 1, Failure_Flag: 1 },
  { Timestamp: '2026-02-15 09:45:00', Machine_ID: 'CNC-M-03', Machine_Type: 'CNC Milling', Temperature: 69.8, Vibration: 2.3, RPM: 3150, Load: 72, Run_Hours: 1650, Temp_Anomaly: 0, Vib_Anomaly: 0, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 0 },
  { Timestamp: '2026-02-15 10:00:00', Machine_ID: 'LATHE-02', Machine_Type: 'CNC Lathe', Temperature: 86.4, Vibration: 4.6, RPM: 2050, Load: 88, Run_Hours: 3400, Temp_Anomaly: 1, Vib_Anomaly: 1, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 1 },
  { Timestamp: '2026-02-15 10:15:00', Machine_ID: 'INJ-P-03', Machine_Type: 'Injection Molding', Temperature: 182.3, Vibration: 1.7, RPM: 1480, Load: 65, Run_Hours: 1100, Temp_Anomaly: 0, Vib_Anomaly: 0, Load_Anomaly: 0, RPM_Anomaly: 0, Failure_Flag: 0 },
]

export interface OrderToDeliveryRow {
  Order_ID: string
  Order_Date: string
  Product_Type: string
  Machine_Type: string
  Scheduling_Delay_Hrs: number
  Production_Time_Hrs: number
  Machine_Delay_Hrs: number
  Dispatch_Delay_Hrs: number
  Total_Lead_Time_Hrs: number
  Estimated_Delivery_Date: string
  Predicted_Lead_Time_Hrs: number
  Customer_Satisfaction_Score: number
  [key: string]: any
}

export const DEMO_ORDER_TO_DELIVERY_DATA: OrderToDeliveryRow[] = [
  { Order_ID: 'ORD-MFG-1001', Order_Date: '2026-02-01', Product_Type: 'Precision Gearbox', Machine_Type: 'CNC Milling', Scheduling_Delay_Hrs: 2.5, Production_Time_Hrs: 18.0, Machine_Delay_Hrs: 1.2, Dispatch_Delay_Hrs: 2.0, Total_Lead_Time_Hrs: 23.7, Estimated_Delivery_Date: '2026-02-03', Predicted_Lead_Time_Hrs: 24.0, Customer_Satisfaction_Score: 4.6 },
  { Order_ID: 'ORD-MFG-1002', Order_Date: '2026-02-01', Product_Type: 'Hydraulic Flange', Machine_Type: 'CNC Lathe', Scheduling_Delay_Hrs: 6.8, Production_Time_Hrs: 24.5, Machine_Delay_Hrs: 8.5, Dispatch_Delay_Hrs: 4.2, Total_Lead_Time_Hrs: 44.0, Estimated_Delivery_Date: '2026-02-04', Predicted_Lead_Time_Hrs: 42.5, Customer_Satisfaction_Score: 3.2 },
  { Order_ID: 'ORD-MFG-1003', Order_Date: '2026-02-02', Product_Type: 'Injection Molded Casing', Machine_Type: 'Injection Molding', Scheduling_Delay_Hrs: 1.0, Production_Time_Hrs: 12.0, Machine_Delay_Hrs: 0.5, Dispatch_Delay_Hrs: 1.5, Total_Lead_Time_Hrs: 15.0, Estimated_Delivery_Date: '2026-02-03', Predicted_Lead_Time_Hrs: 15.4, Customer_Satisfaction_Score: 4.9 },
  { Order_ID: 'ORD-MFG-1004', Order_Date: '2026-02-02', Product_Type: 'Heavy Base Bracket', Machine_Type: 'Hydraulic Press', Scheduling_Delay_Hrs: 4.2, Production_Time_Hrs: 28.0, Machine_Delay_Hrs: 3.8, Dispatch_Delay_Hrs: 3.0, Total_Lead_Time_Hrs: 39.0, Estimated_Delivery_Date: '2026-02-05', Predicted_Lead_Time_Hrs: 38.2, Customer_Satisfaction_Score: 4.1 },
  { Order_ID: 'ORD-MFG-1005', Order_Date: '2026-02-03', Product_Type: 'Precision Gearbox', Machine_Type: 'CNC Milling', Scheduling_Delay_Hrs: 2.0, Production_Time_Hrs: 17.5, Machine_Delay_Hrs: 0.8, Dispatch_Delay_Hrs: 1.8, Total_Lead_Time_Hrs: 22.1, Estimated_Delivery_Date: '2026-02-05', Predicted_Lead_Time_Hrs: 22.5, Customer_Satisfaction_Score: 4.8 },
  { Order_ID: 'ORD-MFG-1006', Order_Date: '2026-02-03', Product_Type: 'Hydraulic Flange', Machine_Type: 'CNC Lathe', Scheduling_Delay_Hrs: 1.5, Production_Time_Hrs: 16.0, Machine_Delay_Hrs: 1.0, Dispatch_Delay_Hrs: 2.2, Total_Lead_Time_Hrs: 20.7, Estimated_Delivery_Date: '2026-02-05', Predicted_Lead_Time_Hrs: 21.0, Customer_Satisfaction_Score: 4.7 },
  { Order_ID: 'ORD-MFG-1007', Order_Date: '2026-02-04', Product_Type: 'Injection Molded Casing', Machine_Type: 'Injection Molding', Scheduling_Delay_Hrs: 7.2, Production_Time_Hrs: 15.0, Machine_Delay_Hrs: 11.2, Dispatch_Delay_Hrs: 5.0, Total_Lead_Time_Hrs: 38.4, Estimated_Delivery_Date: '2026-02-06', Predicted_Lead_Time_Hrs: 37.0, Customer_Satisfaction_Score: 2.9 },
  { Order_ID: 'ORD-MFG-1008', Order_Date: '2026-02-04', Product_Type: 'Heavy Base Bracket', Machine_Type: 'Hydraulic Press', Scheduling_Delay_Hrs: 3.0, Production_Time_Hrs: 26.0, Machine_Delay_Hrs: 2.0, Dispatch_Delay_Hrs: 2.5, Total_Lead_Time_Hrs: 33.5, Estimated_Delivery_Date: '2026-02-07', Predicted_Lead_Time_Hrs: 34.0, Customer_Satisfaction_Score: 4.3 },
]

export interface InventoryPileupRow {
  SKU: string
  Date: string
  Daily_Demand: number
  Predicted_Demand: number
  Forecast_Error: number
  Production_Qty: number
  Production_Delay_Hrs: number
  Procurement_Qty: number
  Procurement_Delay_Hrs: number
  Inventory_Level: number
  Safety_Stock: number
  Stock_Turnover: number
  Lead_Time_Days: number
  Backorder_Qty: number
  Wastage_Qty: number
  Shortage_Flag: number
  Pileup_Flag: number
  [key: string]: any
}

export const DEMO_INVENTORY_PILEUP_DATA: InventoryPileupRow[] = [
  { SKU: 'SKU-BEARING-6205', Date: '2026-02-01', Daily_Demand: 180, Predicted_Demand: 175, Forecast_Error: 5, Production_Qty: 200, Production_Delay_Hrs: 0, Procurement_Qty: 100, Procurement_Delay_Hrs: 2, Inventory_Level: 1450, Safety_Stock: 600, Stock_Turnover: 8.4, Lead_Time_Days: 4, Backorder_Qty: 0, Wastage_Qty: 2, Shortage_Flag: 0, Pileup_Flag: 0 },
  { SKU: 'SKU-VALVE-SEAL-X', Date: '2026-02-01', Daily_Demand: 340, Predicted_Demand: 220, Forecast_Error: 120, Production_Qty: 150, Production_Delay_Hrs: 14, Procurement_Qty: 100, Procurement_Delay_Hrs: 24, Inventory_Level: 210, Safety_Stock: 500, Stock_Turnover: 14.2, Lead_Time_Days: 9, Backorder_Qty: 85, Wastage_Qty: 0, Shortage_Flag: 1, Pileup_Flag: 0 },
  { SKU: 'SKU-ALUM-PLATE-10', Date: '2026-02-02', Daily_Demand: 45, Predicted_Demand: 95, Forecast_Error: -50, Production_Qty: 180, Production_Delay_Hrs: 0, Procurement_Qty: 250, Procurement_Delay_Hrs: 0, Inventory_Level: 4200, Safety_Stock: 800, Stock_Turnover: 2.1, Lead_Time_Days: 3, Backorder_Qty: 0, Wastage_Qty: 12, Shortage_Flag: 0, Pileup_Flag: 1 },
  { SKU: 'SKU-GASKET-NEO-02', Date: '2026-02-02', Daily_Demand: 220, Predicted_Demand: 210, Forecast_Error: 10, Production_Qty: 230, Production_Delay_Hrs: 1, Procurement_Qty: 120, Procurement_Delay_Hrs: 0, Inventory_Level: 1100, Safety_Stock: 450, Stock_Turnover: 7.9, Lead_Time_Days: 5, Backorder_Qty: 0, Wastage_Qty: 4, Shortage_Flag: 0, Pileup_Flag: 0 },
  { SKU: 'SKU-FASTENER-M8X40', Date: '2026-02-03', Daily_Demand: 1250, Predicted_Demand: 1200, Forecast_Error: 50, Production_Qty: 1300, Production_Delay_Hrs: 0, Procurement_Qty: 1500, Procurement_Delay_Hrs: 0, Inventory_Level: 8900, Safety_Stock: 3000, Stock_Turnover: 9.2, Lead_Time_Days: 2, Backorder_Qty: 0, Wastage_Qty: 15, Shortage_Flag: 0, Pileup_Flag: 0 },
  { SKU: 'SKU-SENSOR-TEMP-K', Date: '2026-02-03', Daily_Demand: 80, Predicted_Demand: 40, Forecast_Error: 40, Production_Qty: 30, Production_Delay_Hrs: 18, Procurement_Qty: 20, Procurement_Delay_Hrs: 36, Inventory_Level: 35, Safety_Stock: 120, Stock_Turnover: 16.5, Lead_Time_Days: 14, Backorder_Qty: 45, Wastage_Qty: 1, Shortage_Flag: 1, Pileup_Flag: 0 },
  { SKU: 'SKU-HYD-FLUID-68', Date: '2026-02-04', Daily_Demand: 30, Predicted_Demand: 60, Forecast_Error: -30, Production_Qty: 100, Production_Delay_Hrs: 0, Procurement_Qty: 200, Procurement_Delay_Hrs: 0, Inventory_Level: 2850, Safety_Stock: 500, Stock_Turnover: 1.8, Lead_Time_Days: 4, Backorder_Qty: 0, Wastage_Qty: 8, Shortage_Flag: 0, Pileup_Flag: 1 },
]
