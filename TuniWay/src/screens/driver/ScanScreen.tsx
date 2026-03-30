import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function ScanScreen() {
  return <View style={s.root}><Text>ScanScreen</Text></View>;
}
const s = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
