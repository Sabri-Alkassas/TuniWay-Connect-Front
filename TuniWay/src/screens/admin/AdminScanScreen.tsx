import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';

export function AdminScanScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.root}>
        <View style={s.iconWrap}>
          <AppIcon family="MaterialCommunityIcons" name="qrcode-scan" size={30} color={colors.red} />
        </View>
        <Text style={s.title}>Scan administrateur</Text>
        <Text style={s.subtitle}>Cette interface sera bientot disponible.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgLight },
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#ffe8e3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  subtitle: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
