import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from './Picker';
import { theme } from '../styles/theme';

export const DateDropdown = ({ value, onChange }) => {
  // value format: YYYY-MM-DD
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      setYear(parts[0] || '');
      setMonth(parts[1] || '');
      setDay(parts[2] || '');
    }
  }, [value]);

  const updateDate = (y, m, d) => {
    if (y && m && d) {
      const newVal = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      onChange(newVal);
    }
  };

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i.toString());

  const months = Array.from({ length: 12 }, (_, i) => ({ label: new Date(0, i).toLocaleString('default', { month: 'short' }), value: (i + 1).toString().padStart(2, '0') }));

  const daysInMonth = month && year ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31;
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) days.push(i.toString().padStart(2, '0'));

  return (
    <View style={styles.container}>
      <Picker selectedValue={day} style={styles.picker} onValueChange={v => { setDay(v); updateDate(year, month, v); }}>
        <Picker.Item label="Day" value="" />
        {days.map(d => (<Picker.Item key={d} label={d} value={d} />))}
      </Picker>
      <Picker selectedValue={month} style={styles.picker} onValueChange={v => { setMonth(v); updateDate(year, v, day); }}>
        <Picker.Item label="Month" value="" />
        {months.map(m => (<Picker.Item key={m.value} label={m.label} value={m.value} />))}
      </Picker>
      <Picker selectedValue={year} style={styles.picker} onValueChange={v => { setYear(v); updateDate(v, month, day); }}>
        <Picker.Item label="Year" value="" />
        {years.map(y => (<Picker.Item key={y} label={y} value={y} />))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  picker: { flex: 1, backgroundColor: theme.colors.background, color: theme.colors.text, height: 44, marginHorizontal: 4 },
});
