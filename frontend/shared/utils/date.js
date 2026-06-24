/*
  Purpose: Utility functions for timezone-agnostic local date manipulation locked to Indian Standard Time (IST, UTC+05:30).
  Responsibility: Provide helpers to parse and format dates in IST to prevent device-specific timezone shifts.
*/

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const getKolkataComponents = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds()
  };
};

export const getLocalDateString = (date) => {
  if (!date) return '';
  const comps = getKolkataComponents(date);
  if (!comps) return '';
  const monthStr = String(comps.month).padStart(2, '0');
  const dayStr = String(comps.day).padStart(2, '0');
  return `${comps.year}-${monthStr}-${dayStr}`;
};

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  
  let year, month, day;
  
  if (dateStr instanceof Date) {
    const comps = getKolkataComponents(dateStr);
    if (!comps) return new Date();
    year = comps.year;
    month = comps.month;
    day = comps.day;
  } else if (typeof dateStr === 'string') {
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date();
      return parseLocalDate(d);
    }
  } else {
    return new Date();
  }
  
  // Construct Date representing 00:00:00 IST
  const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  return new Date(utcMs - IST_OFFSET_MS);
};

export const parseCombinedDateTimeToIST = (dateTimeStr) => {
  if (!dateTimeStr) return new Date();
  const [datePart, timePart] = dateTimeStr.split('T');
  if (!datePart || !timePart) return new Date(dateTimeStr);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes || 0, 0, 0);
  return new Date(utcMs - IST_OFFSET_MS);
};

export const getLocalTimeString = (date) => {
  const comps = getKolkataComponents(date);
  if (!comps) return '';
  const hoursStr = String(comps.hours).padStart(2, '0');
  const minsStr = String(comps.minutes).padStart(2, '0');
  return `${hoursStr}:${minsStr}`;
};
