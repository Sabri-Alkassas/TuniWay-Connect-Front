import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/colors';

export function UsersScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.root}>
        <View style={s.iconWrap}>
          <AppIcon family="Feather" name="users" size={28} color={colors.green} />
        </View>
        <Text style={s.title}>Gestion des utilisateurs</Text>
        <Text style={s.subtitle}>Cette page sera bientot disponible.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgLight },
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#eaf3de', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  subtitle: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
