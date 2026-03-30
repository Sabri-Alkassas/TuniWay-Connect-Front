import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function DashboardScreen() {
  return <View style={s.root}><Text>DashboardScreen</Text></View>;
}
const s = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
