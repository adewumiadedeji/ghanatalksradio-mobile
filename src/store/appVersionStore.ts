import { create } from 'zustand';
import DeviceInfo from 'react-native-device-info';
import { checkAppVersion, AppVersionCheckResult } from '../services/appVersionApi';

interface AppVersionState {
  result: AppVersionCheckResult | null;
  /** Soft nag dismissed for this app session only - it comes back on the
   * next cold start (and immediately once the grace period elapses,
   * since that flips force_update server-side regardless). Deliberately
   * not persisted to AsyncStorage: this is a nag, not a block, and it
   * should stay a little annoying rather than be silence-able forever. */
  softNagDismissed: boolean;
  checkForUpdate: () => Promise<void>;
  dismissSoftNag: () => void;
}

export const useAppVersionStore = create<AppVersionState>((set) => ({
  result: null,
  softNagDismissed: false,

  checkForUpdate: async () => {
    try {
      const version = DeviceInfo.getVersion();
      const result = await checkAppVersion(version);
      set({ result });
    } catch {
      // Best-effort, matches every other call to this backend - a failed
      // check just means no update banner shows this launch, never blocks
      // the app from opening.
    }
  },

  dismissSoftNag: () => set({ softNagDismissed: true }),
}));
