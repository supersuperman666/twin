import { seedHealthData } from "../../shared/mock/health-data.js";

const STORAGE_KEY = "digital-twin-doctor-pc-mock-v2";

const clone = (value) => JSON.parse(JSON.stringify(value));

export function loadState() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return clone(seedHealthData);
  try {
    const parsed = JSON.parse(cached);
    // Merge currentDoctor to ensure new fields (isAdmin) are added
    parsed.currentDoctor = { ...seedHealthData.currentDoctor, ...parsed.currentDoctor };
    if (!Array.isArray(parsed.sleepReports)) parsed.sleepReports = clone(seedHealthData.sleepReports || []);
    else {
      const cachedReports = parsed.sleepReports;
      parsed.sleepReports = clone(seedHealthData.sleepReports || []).map((seedReport) => {
        const cachedReport = cachedReports.find((item) => item.id === seedReport.id);
        return cachedReport ? { ...seedReport, ...cachedReport } : seedReport;
      });
    }
    // Oxygen reports — always use seed data (new feature)
    parsed.oxygenReports = clone(seedHealthData.oxygenReports || []);
    // COPD symptoms — always use seed data
    parsed.copdSymptoms = clone(seedHealthData.copdSymptoms || []);
    // Oxygen trend — always use seed data
    parsed.oxygenTrend = clone(seedHealthData.oxygenTrend || []);
    // Scale records — merge: keep cached edits but add new seed entries
    if (!Array.isArray(parsed.scaleRecords)) parsed.scaleRecords = clone(seedHealthData.scaleRecords || []);
    else {
      parsed.scaleRecords = clone(seedHealthData.scaleRecords || []).map((seedRecord) => {
        const cachedRecord = parsed.scaleRecords.find((item) => item.id === seedRecord.id);
        return cachedRecord ? { ...seedRecord, ...cachedRecord } : seedRecord;
      });
    }
    // Metric dictionary — always use seed as canonical (read-only)
    parsed.metricDictionary = clone(seedHealthData.metricDictionary || []);
    // Goal management — preserve user edits but add new seed entries
    if (!Array.isArray(parsed.goalManagement)) parsed.goalManagement = clone(seedHealthData.goalManagement || []);
    else {
      parsed.goalManagement = clone(seedHealthData.goalManagement || []).map((seedGoal) => {
        const cachedGoal = parsed.goalManagement.find((item) => item.id === seedGoal.id);
        return cachedGoal ? { ...seedGoal, ...cachedGoal } : seedGoal;
      });
    }
    return parsed;
  } catch {
    return clone(seedHealthData);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = clone(seedHealthData);
  saveState(state);
  return state;
}

export function nowText() {
  const pad = (num) => String(num).padStart(2, "0");
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
