import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from './Picker';
import { theme } from '../styles/theme';

export const TimeDropdown = ({ value, onChange }) => {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [ampm, setAmpm] = useState('AM');

  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      let h24 = parseInt(parts[0], 10);
      let m = parts[1] || '';
      
      let ap = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;

      setHour(h12.toString());
      setMinute(m);
      setAmpm(ap);
    }
  }, [value]);

  const updateTime = (h, m, ap) => {
    if (h && m && ap) {
      let h24 = parseInt(h, 10);
      if (ap === 'PM' && h24 !== 12) h24 += 12;
      if (ap === 'AM' && h24 === 12) h24 = 0;
      
      const newVal = `${h24.toString().padStart(2, '0')}:${m.padStart(2, '0')}`;
      onChange(newVal);
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  return (
    <View style={styles.container}>
      <Picker selectedValue={hour} style={styles.picker} onValueChange={v => { setHour(v); updateTime(v, minute, ampm); }}>
        <Picker.Item label="Hour" value="" />
        {hours.map(h => (<Picker.Item key={h} label={h} value={h} />))}
      </Picker>
      <Picker selectedValue={minute} style={styles.picker} onValueChange={v => { setMinute(v); updateTime(hour, v, ampm); }}>
        <Picker.Item label="Min" value="" />
        {minutes.map(m => (<Picker.Item key={m} label={m} value={m} />))}
      </Picker>
      <Picker selectedValue={ampm} style={styles.picker} onValueChange={v => { setAmpm(v); updateTime(hour, minute, v); }}>
        <Picker.Item label="AM" value="AM" />
        <Picker.Item label="PM" value="PM" />
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  picker: { flex: 1, backgroundColor: theme.colors.background, color: theme.colors.text, height: 44, marginHorizontal: 2 },
});
