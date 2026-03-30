import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function MyTicketsScreen() {
  return <View style={s.root}><Text>MyTicketsScreen</Text></View>;
}
const s = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
