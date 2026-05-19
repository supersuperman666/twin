import { seedHealthData } from "../../shared/mock/health-data.js";

const STORAGE_KEY = "digital-twin-doctor-pc-mock-v2";

const clone = (value) => JSON.parse(JSON.stringify(value));

export function loadState() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return clone(seedHealthData);
  try {
    return JSON.parse(cached);
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
