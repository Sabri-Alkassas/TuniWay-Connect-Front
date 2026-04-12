import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage = new Map<string, string>();
let warnedAboutFallback = false;

function warnFallback(error: unknown) {
  if (warnedAboutFallback) {
    return;
  }

  warnedAboutFallback = true;
  console.warn('[storage] AsyncStorage unavailable, using in-memory fallback for this session.', error);
}

export async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    warnFallback(error);
    return memoryStorage.get(key) ?? null;
  }
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    warnFallback(error);
    memoryStorage.set(key, value);
  }
}

export async function safeRemoveItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    warnFallback(error);
  } finally {
    memoryStorage.delete(key);
  }
}

export async function safeMultiRemove(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    warnFallback(error);
  } finally {
    keys.forEach((key) => memoryStorage.delete(key));
  }
}
