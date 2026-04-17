import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { AppIcon } from './AppIcon';

interface Props {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
}

export function DateTimePickerInput({ value, onChange, label, error, placeholder }: Props) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const dateValue = value ? new Date(value) : new Date();

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, error && styles.btnError]} onPress={() => setShowDate(true)}>
          <AppIcon family="Feather" name="calendar" size={14} color={colors.navy} />
          <Text style={styles.btnTxt}>
            {value ? dateValue.toLocaleDateString('fr-FR') : (placeholder || 'Date')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, error && styles.btnError]} onPress={() => setShowTime(true)}>
          <AppIcon family="Feather" name="clock" size={14} color={colors.navy} />
          <Text style={styles.btnTxt}>
            {value ? dateValue.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Heure'}
          </Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      {showDate && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setShowDate(false);
            if (d) {
              const newD = new Date(dateValue);
              newD.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
              const tzOffset = newD.getTimezoneOffset() * 60000;
              const localISOTime = (new Date(newD.getTime() - tzOffset)).toISOString().slice(0, 16);
              onChange(localISOTime);
            }
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={dateValue}
          mode="time"
          display="default"
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setShowTime(false);
            if (d) {
              const newD = new Date(dateValue);
              newD.setHours(d.getHours(), d.getMinutes());
              const tzOffset = newD.getTimezoneOffset() * 60000;
              const localISOTime = (new Date(newD.getTime() - tzOffset)).toISOString().slice(0, 16);
              onChange(localISOTime);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border },
  btnError: { borderColor: colors.red },
  btnTxt: { color: colors.navy, fontSize: 13, fontWeight: '500' },
  error: { color: colors.red, fontSize: 12, marginTop: 4 },
});
