import React from 'react';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type MaterialCommunityIconsName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type MaterialIconsName = React.ComponentProps<typeof MaterialIcons>['name'];

type AppIconProps =
  | { family: 'Feather'; name: FeatherName; size?: number; color?: string }
  | { family: 'Ionicons'; name: IoniconsName; size?: number; color?: string }
  | { family: 'MaterialCommunityIcons'; name: MaterialCommunityIconsName; size?: number; color?: string }
  | { family: 'MaterialIcons'; name: MaterialIconsName; size?: number; color?: string };

export function AppIcon(props: AppIconProps) {
  const { size = 20, color } = props;

  if (props.family === 'Feather') {
    return <Feather name={props.name} size={size} color={color} />;
  }

  if (props.family === 'Ionicons') {
    return <Ionicons name={props.name} size={size} color={color} />;
  }

  if (props.family === 'MaterialIcons') {
    return <MaterialIcons name={props.name} size={size} color={color} />;
  }

  return <MaterialCommunityIcons name={props.name} size={size} color={color} />;
}
