import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types/user';

export function useAuthGuard(requiredRole: Role) {
  const { role } = useAuthStore();
  const navigation = useNavigation();

  useEffect(() => {
    if (role !== requiredRole) {
      navigation.goBack();
    }
  }, [role, requiredRole]);
}
