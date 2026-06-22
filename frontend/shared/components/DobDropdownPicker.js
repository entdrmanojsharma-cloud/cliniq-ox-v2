import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { theme } from '../styles/theme';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function DobDropdownPicker({ value, onChange }) {
  // value format: YYYY-MM-DD
  const [day, setDay] = useState('');
  const [month, setMonth] = useState(''); // '01' - '12'
  const [year, setYear] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0] || '');
        setMonth(parts[1] || '');
        setDay(parts[2] || '');
      }
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1900; y--) {
    years.push(y.toString());
  }

  // Calculate days in the selected month & year
  const getDaysInMonth = (y, m) => {
    if (!m) return 31;
    const yearNum = y ? parseInt(y, 10) : 2020; // leap year fallback
    const monthNum = parseInt(m, 10);
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const daysCount = getDaysInMonth(year, month);
  const days = [];
  for (let d = 1; d <= daysCount; d++) {
    days.push(d.toString().padStart(2, '0'));
  }

  const handleDayChange = (d) => {
    setDay(d);
    triggerChange(year, month, d);
  };

  const handleMonthChange = (m) => {
    setMonth(m);
    // Adjust day if it exceeds the new month's daysCount
    const newDaysCount = getDaysInMonth(year, m);
    let currentDay = day;
    if (day && parseInt(day, 10) > newDaysCount) {
      currentDay = newDaysCount.toString().padStart(2, '0');
      setDay(currentDay);
    }
    triggerChange(year, m, currentDay);
  };

  const handleYearChange = (y) => {
    setYear(y);
    // Adjust day for leap years
    const newDaysCount = getDaysInMonth(y, month);
    let currentDay = day;
    if (day && parseInt(day, 10) > newDaysCount) {
      currentDay = newDaysCount.toString().padStart(2, '0');
      setDay(currentDay);
    }
    triggerChange(y, month, currentDay);
  };

  const triggerChange = (y, m, d) => {
    if (y && m && d) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <div style={webStyles.row}>
          <div style={webStyles.selectWrapper}>
            <label style={webStyles.selectLabel}>Day</label>
            <select
              value={day}
              onChange={(e) => handleDayChange(e.target.value)}
              style={webStyles.select}
            >
              <option value="">DD</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div style={webStyles.selectWrapper}>
            <label style={webStyles.selectLabel}>Month</label>
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              style={webStyles.select}
            >
              <option value="">Month</option>
              {MONTH_NAMES.map((m, idx) => {
                const val = String(idx + 1).padStart(2, '0');
                return (
                  <option key={val} value={val}>
                    {m}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={webStyles.selectWrapper}>
            <label style={webStyles.selectLabel}>Year</label>
            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              style={webStyles.select}
            >
              <option value="">YYYY</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </View>
    );
  }

  // Fallback for native view (simplified text inputs or styled lists)
  return (
    <View style={styles.container}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
        Select Date of Birth (Web interface recommended)
      </Text>
      {/* Fallback layout code here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    width: '100%',
  },
});

const webStyles = {
  row: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  selectWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  selectLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#334155', // darker for better contrast
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    backgroundColor: 'var(--surface, #1e293b)',
    color: 'var(--text, #f8fafc)',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--border, #334155)',
    fontSize: '14px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
    minHeight: '46px',
    appearance: 'none', // standard clean drop-down icon is added via backdrop
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%23cbd5e1' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: '32px',
  },
};
