import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface MFAFactor {
  id: string;
  method: 'totp' | 'sms' | 'email';
  friendlyName?: string;
  isPrimary: boolean;
  isVerified: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface MFAStatus {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  primaryFactorId?: string;
  primaryMethod?: string;
  backupCodesEnabled: boolean;
  backupCodesCount: number;
}

interface MFASettings {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  rememberDeviceDays: number;
  backupCodesEnabled: boolean;
  backupCodesCount: number;
}

interface UseMFAReturn {
  // Data
  factors: MFAFactor[];
  status: MFAStatus | null;
  settings: MFASettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMFAData: () => Promise<void>;
  setupMFA: (request: {
    method: 'totp' | 'sms' | 'email';
    friendlyName?: string;
    phoneNumber?: string;
    email?: string;
  }) => Promise<any>;
  verifyMFASetup: (factorId: string, code: string) => Promise<void>;
  createMFAChallenge: (factorId: string) => Promise<void>;
  verifyMFA: (factorId: string, code: string, rememberDevice?: boolean) => Promise<void>;
  verifyBackupCode: (factorId: string, backupCode: string) => Promise<void>;
  disableMFA: (factorId: string) => Promise<void>;
  regenerateBackupCodes: (factorId: string) => Promise<string[]>;
  updateMFASettings: (settings: Partial<MFASettings>) => Promise<void>;
  checkMFASession: (sessionId: string) => Promise<boolean>;
  createMFASession: (factorId: string, sessionId: string) => Promise<void>;
  invalidateMFASession: (sessionId: string) => Promise<void>;
}

export const useMFA = (userId: string): UseMFAReturn => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [settings, setSettings] = useState<MFASettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/mfa?action=${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Failed to ${endpoint}`);
    }

    return result;
  }, [userId]);

  const loadMFAData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [methodsResult, statusResult, settingsResult] = await Promise.all([
        apiCall('methods').catch(() => []),
        apiCall('status').catch(() => null),
        apiCall('settings').catch(() => null),
      ]);

      setFactors(methodsResult || []);
      setStatus(statusResult);
      setSettings(settingsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA data');
      console.error('Error loading MFA data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const setupMFA = useCallback(async (request: {
    method: 'totp' | 'sms' | 'email';
    friendlyName?: string;
    phoneNumber?: string;
    email?: string;
  }) => {
    setError(null);
    
    try {
      const result = await apiCall('setup', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to setup MFA';
      setError(message);
      throw err;
    }
  }, [apiCall]);

  const verifyMFASetup = useCallback(async (factorId: string, code: string) => {
    setError(null);

    try {
      await apiCall('verify-setup', {
        method: 'POST',
        body: JSON.stringify({ factorId, code }),
      });

      toast.success('MFA setup verified successfully');
      await loadMFAData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify MFA setup';
      setError(message);
      throw err;
    }
  }, [apiCall, loadMFAData]);

  const createMFAChallenge = useCallback(async (factorId: string) => {
    setError(null);

    try {
      await apiCall('create-challenge', {
        method: 'POST',
        body: JSON.stringify({ factorId }),
      });

      toast.success('Verification code sent');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create MFA challenge';
      setError(message);
      throw err;
    }
  }, [apiCall]);

  const verifyMFA = useCallback(async (factorId: string, code: string, rememberDevice = true) => {
    setError(null);

    try {
      await apiCall('verify', {
        method: 'POST',
        body: JSON.stringify({ factorId, code, rememberDevice }),
      });

      toast.success('MFA verification successful');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MFA verification failed';
      setError(message);
      throw err;
    }
  }, [apiCall]);

  const verifyBackupCode = useCallback(async (factorId: string, backupCode: string) => {
    setError(null);

    try {
      await apiCall('verify-backup', {
        method: 'POST',
        body: JSON.stringify({ factorId, backupCode }),
      });

      toast.success('Backup code verification successful');
      await loadMFAData(); // Reload to update backup code count
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backup code verification failed';
      setError(message);
      throw err;
    }
  }, [apiCall, loadMFAData]);

  const disableMFA = useCallback(async (factorId: string) => {
    setError(null);

    try {
      await apiCall('disable', {
        method: 'DELETE',
        body: JSON.stringify({ factorId }),
      });

      toast.success('MFA method removed');
      await loadMFAData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove MFA method';
      setError(message);
      throw err;
    }
  }, [apiCall, loadMFAData]);

  const regenerateBackupCodes = useCallback(async (factorId: string): Promise<string[]> => {
    setError(null);

    try {
      const result = await apiCall('regenerate-backup', {
        method: 'POST',
        body: JSON.stringify({ factorId }),
      });

      toast.success('New backup codes generated');
      await loadMFAData();
      return result.backupCodes;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate backup codes';
      setError(message);
      throw err;
    }
  }, [apiCall, loadMFAData]);

  const updateMFASettings = useCallback(async (newSettings: Partial<MFASettings>) => {
    setError(null);

    try {
      const result = await apiCall('update-settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings),
      });

      setSettings(result.settings);
      toast.success('MFA settings updated');
      await loadMFAData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update MFA settings';
      setError(message);
      throw err;
    }
  }, [apiCall, loadMFAData]);

  const checkMFASession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const result = await apiCall(`check-session&sessionId=${sessionId}`);
      return result.mfaCompleted;
    } catch (err) {
      console.error('Error checking MFA session:', err);
      return false;
    }
  }, [apiCall]);

  const createMFASession = useCallback(async (factorId: string, sessionId: string) => {
    setError(null);

    try {
      await apiCall('create-session', {
        method: 'POST',
        body: JSON.stringify({ factorId, sessionId }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create MFA session';
      setError(message);
      throw err;
    }
  }, [apiCall]);

  const invalidateMFASession = useCallback(async (sessionId: string) => {
    setError(null);

    try {
      await apiCall('invalidate-session', {
        method: 'DELETE',
        body: JSON.stringify({ sessionId }),
      });

      toast.success('MFA session invalidated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to invalidate MFA session';
      setError(message);
      throw err;
    }
  }, [apiCall]);

  return {
    // Data
    factors,
    status,
    settings,
    isLoading,
    error,

    // Actions
    loadMFAData,
    setupMFA,
    verifyMFASetup,
    createMFAChallenge,
    verifyMFA,
    verifyBackupCode,
    disableMFA,
    regenerateBackupCodes,
    updateMFASettings,
    checkMFASession,
    createMFASession,
    invalidateMFASession,
  };
};

export default useMFA;
