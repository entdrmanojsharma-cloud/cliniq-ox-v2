/*
  Purpose: Utility functions to parse RFC 5545 recurrence rules and generate event occurrences on the fly.
  Responsibility: Map recurrences for DAILY/WEEKLY patterns to support overlap conflict checks without DB materialization.
*/

function getOccurrences(startTime, endTime, recurrenceRule, windowStart, windowEnd) {
  const occurrences = [];
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (!recurrenceRule) {
    if (start <= windowEnd && end >= windowStart) {
      occurrences.push({ startTime: start, endTime: end });
    }
    return occurrences;
  }

  // Parse key-value pairs (e.g. FREQ=DAILY;INTERVAL=1)
  const parts = recurrenceRule.split(';').reduce((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key.toUpperCase()] = val;
    return acc;
  }, {});

  const freq = parts.FREQ;
  const interval = parseInt(parts.INTERVAL, 10) || 1;
  const count = parts.COUNT ? parseInt(parts.COUNT, 10) : null;
  
  let until = null;
  if (parts.UNTIL) {
    const uStr = parts.UNTIL.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    until = new Date(uStr);
  }

  const durationMs = end.getTime() - start.getTime();
  let currentStart = new Date(start);
  let currentEnd = new Date(currentStart.getTime() + durationMs);
  let occurrenceIndex = 0;

  const byDay = parts.BYDAY ? parts.BYDAY.split(',').map(d => d.trim().toUpperCase()) : null;
  const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  // Limit iterations to protect memory/CPU
  while (occurrenceIndex < 500) {
    if (count !== null && occurrenceIndex >= count) break;
    if (until !== null && currentStart > until) break;
    if (currentStart > windowEnd) break;

    let isMatch = true;
    if (freq === 'WEEKLY' && byDay) {
      const dayName = Object.keys(dayMap).find(k => dayMap[k] === currentStart.getDay());
      if (!byDay.includes(dayName)) {
        isMatch = false;
      }
    }

    if (isMatch) {
      if (currentEnd >= windowStart && currentStart <= windowEnd) {
        occurrences.push({
          startTime: new Date(currentStart),
          endTime: new Date(currentEnd)
        });
      }
      occurrenceIndex++;
    }

    if (freq === 'DAILY') {
      currentStart.setDate(currentStart.getDate() + interval);
    } else if (freq === 'WEEKLY') {
      if (byDay) {
        currentStart.setDate(currentStart.getDate() + 1);
      } else {
        currentStart.setDate(currentStart.getDate() + 7 * interval);
      }
    } else {
      break; // Stop loop on invalid frequency
    }
    currentEnd = new Date(currentStart.getTime() + durationMs);
  }

  return occurrences;
}

module.exports = { getOccurrences };
