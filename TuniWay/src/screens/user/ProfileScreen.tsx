import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function ProfileScreen() {
  return <View style={s.root}><Text>ProfileScreen</Text></View>;
}
const s = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
