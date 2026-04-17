import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors } from '../theme/colors';

interface TicketQrCodeProps {
  value: string;
  size?: number;
}

export function TicketQrCode({ value, size = 132 }: TicketQrCodeProps) {
  return (
    <View style={[styles.frame, { width: size + 24, height: size + 24 }]}>
      <QRCode
        value={value}
        size={size}
        backgroundColor={colors.white}
        color={colors.navy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
