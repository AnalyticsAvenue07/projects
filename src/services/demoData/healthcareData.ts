/**
 * Realistic Demo Data for Healthcare Domain
 * Covers:
 * 1. Healthscope Insights
 * 2. Patient Visit Analytics & Hospital Performance
 * 3. PatientFlow Navigator
 */

export interface HealthscopeRow {
  Date: string
  Hospital: string
  Department: string
  Doctor: string
  Patient: string
  AgeGroup: string
  Gender: string
  Visits: number
  TreatmentCost: number
  Revenue: number
  RecoveryRate: number
  SatisfactionScore: number
  [key: string]: any
}

export const DEMO_HEALTHSCOPE_DATA: HealthscopeRow[] = [
  { Date: '2026-02-01', Hospital: 'City Central Hospital', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient: 'Anil Kumar', AgeGroup: '45-60', Gender: 'Male', Visits: 42, TreatmentCost: 85000, Revenue: 145000, RecoveryRate: 94.2, SatisfactionScore: 4.8 },
  { Date: '2026-02-01', Hospital: 'Apollo Care Center', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient: 'Sunita Rao', AgeGroup: '60+', Gender: 'Female', Visits: 38, TreatmentCost: 65000, Revenue: 115000, RecoveryRate: 91.5, SatisfactionScore: 4.6 },
  { Date: '2026-02-02', Hospital: 'Max Life Medical', Department: 'Neurology', Doctor: 'Dr. Sunita Mehta', Patient: 'Rahul Verma', AgeGroup: '30-45', Gender: 'Male', Visits: 29, TreatmentCost: 110000, Revenue: 185000, RecoveryRate: 88.4, SatisfactionScore: 4.7 },
  { Date: '2026-02-02', Hospital: 'Fortis Health Hospital', Department: 'Pediatrics', Doctor: 'Dr. Vikram Patel', Patient: 'Aarav Gupta', AgeGroup: '0-18', Gender: 'Male', Visits: 55, TreatmentCost: 28000, Revenue: 58000, RecoveryRate: 98.1, SatisfactionScore: 4.9 },
  { Date: '2026-02-03', Hospital: 'City Central Hospital', Department: 'Oncology', Doctor: 'Dr. Ananya Sen', Patient: 'Kavita Das', AgeGroup: '45-60', Gender: 'Female', Visits: 22, TreatmentCost: 210000, Revenue: 340000, RecoveryRate: 82.6, SatisfactionScore: 4.5 },
  { Date: '2026-02-03', Hospital: 'Manipal Health Institute', Department: 'General Medicine', Doctor: 'Dr. Suresh Reddy', Patient: 'Ramesh Gowda', AgeGroup: '18-30', Gender: 'Male', Visits: 64, TreatmentCost: 15000, Revenue: 38000, RecoveryRate: 96.5, SatisfactionScore: 4.4 },
  { Date: '2026-02-04', Hospital: 'Apollo Care Center', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient: 'Meera Iyer', AgeGroup: '60+', Gender: 'Female', Visits: 48, TreatmentCost: 92000, Revenue: 160000, RecoveryRate: 93.8, SatisfactionScore: 4.8 },
  { Date: '2026-02-04', Hospital: 'Max Life Medical', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient: 'Vikram Joshi', AgeGroup: '45-60', Gender: 'Male', Visits: 34, TreatmentCost: 72000, Revenue: 125000, RecoveryRate: 92.0, SatisfactionScore: 4.6 },
  { Date: '2026-02-05', Hospital: 'Fortis Health Hospital', Department: 'Neurology', Doctor: 'Dr. Sunita Mehta', Patient: 'Deepa Menon', AgeGroup: '30-45', Gender: 'Female', Visits: 31, TreatmentCost: 105000, Revenue: 178000, RecoveryRate: 89.2, SatisfactionScore: 4.7 },
  { Date: '2026-02-05', Hospital: 'City Central Hospital', Department: 'Pediatrics', Doctor: 'Dr. Vikram Patel', Patient: 'Rohan Deshmukh', AgeGroup: '0-18', Gender: 'Male', Visits: 52, TreatmentCost: 26000, Revenue: 54000, RecoveryRate: 97.9, SatisfactionScore: 4.9 },
  { Date: '2026-02-06', Hospital: 'Manipal Health Institute', Department: 'Oncology', Doctor: 'Dr. Ananya Sen', Patient: 'Pooja Bhatia', AgeGroup: '45-60', Gender: 'Female', Visits: 25, TreatmentCost: 225000, Revenue: 360000, RecoveryRate: 83.1, SatisfactionScore: 4.5 },
  { Date: '2026-02-06', Hospital: 'Apollo Care Center', Department: 'General Medicine', Doctor: 'Dr. Suresh Reddy', Patient: 'Kiran Kulkarni', AgeGroup: '30-45', Gender: 'Male', Visits: 71, TreatmentCost: 16500, Revenue: 42000, RecoveryRate: 95.8, SatisfactionScore: 4.3 },
  { Date: '2026-02-07', Hospital: 'Max Life Medical', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient: 'Sanjay Malhotra', AgeGroup: '45-60', Gender: 'Male', Visits: 45, TreatmentCost: 88000, Revenue: 152000, RecoveryRate: 94.0, SatisfactionScore: 4.8 },
  { Date: '2026-02-07', Hospital: 'Fortis Health Hospital', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient: 'Geeta Pillai', AgeGroup: '60+', Gender: 'Female', Visits: 36, TreatmentCost: 68000, Revenue: 119000, RecoveryRate: 91.8, SatisfactionScore: 4.7 },
  { Date: '2026-02-08', Hospital: 'City Central Hospital', Department: 'Neurology', Doctor: 'Dr. Sunita Mehta', Patient: 'Arun George', AgeGroup: '18-30', Gender: 'Male', Visits: 28, TreatmentCost: 112000, Revenue: 189000, RecoveryRate: 87.9, SatisfactionScore: 4.6 },
  { Date: '2026-02-08', Hospital: 'Manipal Health Institute', Department: 'Pediatrics', Doctor: 'Dr. Vikram Patel', Patient: 'Ananya Roy', AgeGroup: '0-18', Gender: 'Female', Visits: 58, TreatmentCost: 27500, Revenue: 57000, RecoveryRate: 98.4, SatisfactionScore: 4.9 },
  { Date: '2026-02-09', Hospital: 'Apollo Care Center', Department: 'Oncology', Doctor: 'Dr. Ananya Sen', Patient: 'Harish Nambiar', AgeGroup: '60+', Gender: 'Male', Visits: 21, TreatmentCost: 230000, Revenue: 375000, RecoveryRate: 81.5, SatisfactionScore: 4.4 },
  { Date: '2026-02-09', Hospital: 'Max Life Medical', Department: 'General Medicine', Doctor: 'Dr. Suresh Reddy', Patient: 'Lakshmi Narayan', AgeGroup: '45-60', Gender: 'Female', Visits: 68, TreatmentCost: 17000, Revenue: 41000, RecoveryRate: 96.1, SatisfactionScore: 4.5 },
  { Date: '2026-02-10', Hospital: 'Fortis Health Hospital', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient: 'Ashok Bhatt', AgeGroup: '60+', Gender: 'Male', Visits: 50, TreatmentCost: 95000, Revenue: 165000, RecoveryRate: 93.5, SatisfactionScore: 4.8 },
  { Date: '2026-02-10', Hospital: 'City Central Hospital', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient: 'Shalini Kapoor', AgeGroup: '30-45', Gender: 'Female', Visits: 40, TreatmentCost: 70000, Revenue: 122000, RecoveryRate: 92.5, SatisfactionScore: 4.7 },
]

export interface PatientVisitRow {
  Date: string
  Department: string
  Doctor: string
  Patient_ID: number
  Age: number
  Gender: string
  Visit_Type: string
  Revenue: number
  Admission: string
  [key: string]: any
}

export const DEMO_PATIENT_VISITS_DATA: PatientVisitRow[] = [
  { Date: '2026-02-01', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient_ID: 1001, Age: 58, Gender: 'Male', Visit_Type: 'Emergency', Revenue: 45000, Admission: 'Yes' },
  { Date: '2026-02-01', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient_ID: 1002, Age: 64, Gender: 'Female', Visit_Type: 'OP', Revenue: 3500, Admission: 'No' },
  { Date: '2026-02-01', Department: 'Neurology', Doctor: 'Dr. Sunita Mehta', Patient_ID: 1003, Age: 42, Gender: 'Male', Visit_Type: 'IP', Revenue: 78000, Admission: 'Yes' },
  { Date: '2026-02-02', Department: 'Pediatrics', Doctor: 'Dr. Vikram Patel', Patient_ID: 1004, Age: 8, Gender: 'Male', Visit_Type: 'OP', Revenue: 1800, Admission: 'No' },
  { Date: '2026-02-02', Department: 'Oncology', Doctor: 'Dr. Ananya Sen', Patient_ID: 1005, Age: 52, Gender: 'Female', Visit_Type: 'IP', Revenue: 125000, Admission: 'Yes' },
  { Date: '2026-02-02', Department: 'General Medicine', Doctor: 'Dr. Suresh Reddy', Patient_ID: 1006, Age: 29, Gender: 'Male', Visit_Type: 'OP', Revenue: 1200, Admission: 'No' },
  { Date: '2026-02-03', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient_ID: 1007, Age: 66, Gender: 'Female', Visit_Type: 'Follow-up', Revenue: 2200, Admission: 'No' },
  { Date: '2026-02-03', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient_ID: 1008, Age: 48, Gender: 'Male', Visit_Type: 'IP', Revenue: 58000, Admission: 'Yes' },
  { Date: '2026-02-03', Department: 'Neurology', Doctor: 'Dr. Sunita Mehta', Patient_ID: 1009, Age: 36, Gender: 'Female', Visit_Type: 'OP', Revenue: 4200, Admission: 'No' },
  { Date: '2026-02-04', Department: 'Pediatrics', Doctor: 'Dr. Vikram Patel', Patient_ID: 1010, Age: 5, Gender: 'Male', Visit_Type: 'Emergency', Revenue: 12000, Admission: 'Yes' },
  { Date: '2026-02-04', Department: 'Oncology', Doctor: 'Dr. Ananya Sen', Patient_ID: 1011, Age: 61, Gender: 'Female', Visit_Type: 'Follow-up', Revenue: 5500, Admission: 'No' },
  { Date: '2026-02-04', Department: 'General Medicine', Doctor: 'Dr. Suresh Reddy', Patient_ID: 1012, Age: 33, Gender: 'Male', Visit_Type: 'OP', Revenue: 1500, Admission: 'No' },
  { Date: '2026-02-05', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient_ID: 1013, Age: 54, Gender: 'Male', Visit_Type: 'IP', Revenue: 62000, Admission: 'Yes' },
  { Date: '2026-02-05', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient_ID: 1014, Age: 71, Gender: 'Female', Visit_Type: 'Emergency', Revenue: 34000, Admission: 'Yes' },
  { Date: '2026-02-05', Department: 'Neurology', Doctor: 'Dr. Sunita Mehta', Patient_ID: 1015, Age: 27, Gender: 'Male', Visit_Type: 'OP', Revenue: 3800, Admission: 'No' },
  { Date: '2026-02-06', Department: 'Pediatrics', Doctor: 'Dr. Vikram Patel', Patient_ID: 1016, Age: 11, Gender: 'Female', Visit_Type: 'Follow-up', Revenue: 1600, Admission: 'No' },
  { Date: '2026-02-06', Department: 'Oncology', Doctor: 'Dr. Ananya Sen', Patient_ID: 1017, Age: 59, Gender: 'Male', Visit_Type: 'IP', Revenue: 140000, Admission: 'Yes' },
  { Date: '2026-02-06', Department: 'General Medicine', Doctor: 'Dr. Suresh Reddy', Patient_ID: 1018, Age: 46, Gender: 'Female', Visit_Type: 'OP', Revenue: 1400, Admission: 'No' },
  { Date: '2026-02-07', Department: 'Cardiology', Doctor: 'Dr. Priya Sharma', Patient_ID: 1019, Age: 62, Gender: 'Male', Visit_Type: 'OP', Revenue: 3200, Admission: 'No' },
  { Date: '2026-02-07', Department: 'Orthopedics', Doctor: 'Dr. Rajesh Nair', Patient_ID: 1020, Age: 53, Gender: 'Female', Visit_Type: 'OP', Revenue: 2800, Admission: 'No' },
]

export interface PatientFlowRow {
  Patient_ID: number
  Age: number
  Gender: string
  Disease: string
  Symptoms: string
  Treatment: string
  Admission_Date: string
  Discharge_Date: string
  Treatment_Cost: number
  Readmission: string
  Department: string
  Visit_Date: string
  Outcome: string
  Risk_Level: string
  Risk_Score: number
  [key: string]: any
}

export const DEMO_PATIENT_FLOW_DATA: PatientFlowRow[] = [
  { Patient_ID: 201, Age: 65, Gender: 'Male', Disease: 'Coronary Artery Disease', Symptoms: 'Chest Pain, Dyspnea', Treatment: 'Angioplasty', Admission_Date: '2026-01-10', Discharge_Date: '2026-01-14', Treatment_Cost: 195000, Readmission: 'No', Department: 'Cardiology', Visit_Date: '2026-01-10', Outcome: 'Recovered', Risk_Level: 'Medium', Risk_Score: 42 },
  { Patient_ID: 202, Age: 72, Gender: 'Female', Disease: 'Osteoarthritis', Symptoms: 'Joint Pain, Immobility', Treatment: 'Knee Replacement', Admission_Date: '2026-01-12', Discharge_Date: '2026-01-18', Treatment_Cost: 240000, Readmission: 'No', Department: 'Orthopedics', Visit_Date: '2026-01-12', Outcome: 'Recovered', Risk_Level: 'Low', Risk_Score: 28 },
  { Patient_ID: 203, Age: 58, Gender: 'Male', Disease: 'Ischemic Stroke', Symptoms: 'Hemiparesis, Speech Difficulty', Treatment: 'Thrombolysis & Rehab', Admission_Date: '2026-01-15', Discharge_Date: '2026-01-23', Treatment_Cost: 310000, Readmission: 'Yes', Department: 'Neurology', Visit_Date: '2026-01-15', Outcome: 'Stabilized', Risk_Level: 'High', Risk_Score: 78 },
  { Patient_ID: 204, Age: 8, Gender: 'Female', Disease: 'Acute Bronchitis', Symptoms: 'Wheezing, Fever', Treatment: 'Nebulization & Antibiotics', Admission_Date: '2026-01-18', Discharge_Date: '2026-01-20', Treatment_Cost: 32000, Readmission: 'No', Department: 'Pediatrics', Visit_Date: '2026-01-18', Outcome: 'Recovered', Risk_Level: 'Low', Risk_Score: 18 },
  { Patient_ID: 205, Age: 54, Gender: 'Female', Disease: 'Breast Carcinoma', Symptoms: 'Palpable Mass', Treatment: 'Chemotherapy Cycle 3', Admission_Date: '2026-01-20', Discharge_Date: '2026-01-22', Treatment_Cost: 180000, Readmission: 'No', Department: 'Oncology', Visit_Date: '2026-01-20', Outcome: 'Under Treatment', Risk_Level: 'Medium', Risk_Score: 55 },
  { Patient_ID: 206, Age: 41, Gender: 'Male', Disease: 'Type 2 Diabetes Complications', Symptoms: 'Fatigue, Neuropathy', Treatment: 'Insulin Regimen & IV Fluids', Admission_Date: '2026-01-22', Discharge_Date: '2026-01-25', Treatment_Cost: 48000, Readmission: 'Yes', Department: 'General Medicine', Visit_Date: '2026-01-22', Outcome: 'Controlled', Risk_Level: 'High', Risk_Score: 68 },
  { Patient_ID: 207, Age: 61, Gender: 'Male', Disease: 'Myocardial Infarction', Symptoms: 'Acute Angina, Diaphoresis', Treatment: 'Emergency CABG', Admission_Date: '2026-01-25', Discharge_Date: '2026-02-02', Treatment_Cost: 420000, Readmission: 'No', Department: 'Cardiology', Visit_Date: '2026-01-25', Outcome: 'Recovered', Risk_Level: 'High', Risk_Score: 82 },
  { Patient_ID: 208, Age: 49, Gender: 'Female', Disease: 'Lumbar Disc Herniation', Symptoms: 'Sciatica, Numbness', Treatment: 'Microdiscectomy', Admission_Date: '2026-01-28', Discharge_Date: '2026-01-31', Treatment_Cost: 165000, Readmission: 'No', Department: 'Orthopedics', Visit_Date: '2026-01-28', Outcome: 'Recovered', Risk_Level: 'Low', Risk_Score: 32 },
  { Patient_ID: 209, Age: 67, Gender: 'Male', Disease: 'Parkinsonism', Symptoms: 'Tremors, Bradykinesia', Treatment: 'Dopaminergic Therapy & Physio', Admission_Date: '2026-02-01', Discharge_Date: '2026-02-05', Treatment_Cost: 85000, Readmission: 'Yes', Department: 'Neurology', Visit_Date: '2026-02-01', Outcome: 'Managed', Risk_Level: 'Medium', Risk_Score: 61 },
  { Patient_ID: 210, Age: 12, Gender: 'Male', Disease: 'Type 1 Diabetes Ketoacidosis', Symptoms: 'Vomiting, Hyperglycemia', Treatment: 'ICU Insulin Infusion', Admission_Date: '2026-02-03', Discharge_Date: '2026-02-06', Treatment_Cost: 75000, Readmission: 'No', Department: 'Pediatrics', Visit_Date: '2026-02-03', Outcome: 'Recovered', Risk_Level: 'Medium', Risk_Score: 48 },
]
