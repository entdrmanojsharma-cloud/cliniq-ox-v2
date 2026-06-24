/*
  Purpose: Utility functions for timezone-agnostic local date manipulation.
  Responsibility: Provide helpers to parse and format dates in local time to avoid timezone shifts.
*/

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  // If it is already a Date object, return it or convert to date
  if (dateStr instanceof Date) return dateStr;
  
  // If it's a string, try to parse YYYY-MM-DD
  if (typeof dateStr === 'string') {
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  return d;
};

export const getLocalDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
