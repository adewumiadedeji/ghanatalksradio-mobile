import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'gtr_device_id_v1';

let cachedDeviceId: string | null = null;

/**
 * A stable, app-generated device identifier (not a real hardware id -
 * iOS restricts those anyway) used to tag raffle entries. Generated once
 * and persisted; every call after the first resolves from AsyncStorage
 * or an in-memory cache instead of generating a new one.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const generated = uuidv4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  cachedDeviceId = generated;
  return generated;
}
