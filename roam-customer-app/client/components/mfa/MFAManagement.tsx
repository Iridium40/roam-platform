import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Shield, Plus, Trash2, Download, RefreshCw, Smartphone, Mail, QrCode, Key, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import MFASetup from './MFASetup';
import { logger } from '@/utils/logger';

interface MFAManagementProps {
  userId: string;
}

interface MFAFactor {
  id: string;
  method: 'totp' | 'sms' | 'email';
  friendlyName?: string;
  isPrimary: boolean;
  isVerified: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface MFASettings {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  rememberDeviceDays: number;
  backupCodesEnabled: boolean;
  backupCodesCount: number;
}

interface MFAStatus {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  primaryFactorId?: string;
  primaryMethod?: string;
  backupCodesEnabled: boolean;
  backupCodesCount: number;
}

const MFAManagement: React.FC<MFAManagementProps> = ({ userId }) => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [settings, setSettings] = useState<MFASettings | null>(null);
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMFAData();
  }, [userId]);

  const loadMFAData = async () => {
    setIsLoading(true);
    try {
      const [methodsResponse, settingsResponse, statusResponse] = await Promise.all([
        fetch('/api/mfa?action=methods', {
          headers: { 'x-user-id': userId }
        }),
        fetch('/api/mfa?action=settings', {
          headers: { 'x-user-id': userId }
        }),
        fetch('/api/mfa?action=status', {
          headers: { 'x-user-id': userId }
        })
      ]);

      const [methodsResult, settingsResult, statusResult] = await Promise.all([
        methodsResponse.json(),
        settingsResponse.json(),
        statusResponse.json()
      ]);

      if (methodsResponse.ok) setFactors(methodsResult);
      if (settingsResponse.ok) setSettings(settingsResult);
      if (statusResponse.ok) setStatus(statusResult);
    } catch (err) {
      setError('Failed to load MFA data');
      logger.error('Error loading MFA data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMFA = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/mfa?action=update-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          mfaEnabled: enabled
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update MFA settings');
      }

      toast.success(enabled ? 'MFA enabled' : 'MFA disabled');
      await loadMFAData();
    } catch (err) {
      toast.error('Failed to update MFA settings');
      logger.error('Error updating MFA:', err);
    }
  };

  const deleteFactor = async (factorId: string) => {
    try {
      const response = await fetch('/api/mfa?action=disable', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ factorId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove MFA method');
      }

      toast.success('MFA method removed');
      await loadMFAData();
    } catch (err) {
      toast.error('Failed to remove MFA method');
      logger.error('Error removing MFA method:', err);
    }
  };

  const regenerateBackupCodes = async (factorId: string) => {
    try {
      const response = await fetch('/api/mfa?action=regenerate-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ factorId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to regenerate backup codes');
      }

      // Download new backup codes
      downloadBackupCodes(result.backupCodes);
      toast.success('New backup codes generated and downloaded');
      await loadMFAData();
    } catch (err) {
      toast.error('Failed to regenerate backup codes');
      logger.error('Error regenerating backup codes:', err);
    }
  };

  const downloadBackupCodes = (backupCodes: string[]) => {
    const content = `ROAM Platform MFA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\nUser: ${userId}\n\n${backupCodes.join('\n')}\n\nImportant:\n- Keep these codes safe and secure\n- Each code can only be used once\n- Generate new codes if you lose these`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roam-mfa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Use setTimeout to ensure the click event completes before removing
    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      } catch (error) {
        // Element might have been removed already, ignore the error
        logger.warn('Element already removed:', error);
      }
      URL.revokeObjectURL(url);
    }, 100);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'totp': return QrCode;
      case 'sms': return Smartphone;
      case 'email': return Mail;
      default: return Shield;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'totp': return 'Authenticator App';
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      default: return method;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Shield className="h-8 w-8 mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading MFA settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* MFA Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable MFA</p>
              <p className="text-sm text-muted-foreground">
                Require additional verification when signing in
              </p>
            </div>
            <Switch
              checked={status?.mfaEnabled || false}
              onCheckedChange={toggleMFA}
              disabled={factors.length === 0}
            />
          </div>

          {status?.mfaEnabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>MFA is enabled</AlertTitle>
              <AlertDescription>
                Your account is protected with two-factor authentication. 
                {status.backupCodesCount > 0 && ` You have ${status.backupCodesCount} backup codes remaining.`}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* MFA Methods Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>MFA Methods</CardTitle>
              <CardDescription>
                Manage your two-factor authentication methods
              </CardDescription>
            </div>
            <Dialog open={showSetup} onOpenChange={setShowSetup}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Method
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add MFA Method</DialogTitle>
                  <DialogDescription>
                    Choose a new method for two-factor authentication
                  </DialogDescription>
                </DialogHeader>
                <MFASetup
                  onComplete={() => {
                    setShowSetup(false);
                    loadMFAData();
                  }}
                  onCancel={() => setShowSetup(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {factors.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No MFA methods configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a two-factor authentication method to secure your account
              </p>
              <Button onClick={() => setShowSetup(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Method
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {factors.map((factor) => {
                const Icon = getMethodIcon(factor.method);
                return (
                  <div key={factor.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getMethodName(factor.method)}</span>
                            {factor.isPrimary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                            {!factor.isVerified && (
                              <Badge variant="destructive" className="text-xs">Unverified</Badge>
                            )}
                          </div>
                          {factor.friendlyName && (
                            <p className="text-sm text-muted-foreground">{factor.friendlyName}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Added {formatDistanceToNow(new Date(factor.createdAt))} ago
                            </span>
                            {factor.lastUsedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last used {formatDistanceToNow(new Date(factor.lastUsedAt))} ago
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {factor.method === 'totp' && factor.isVerified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenerateBackupCodes(factor.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            New Backup Codes
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove MFA Method</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this {getMethodName(factor.method).toLowerCase()} method? 
                                This action cannot be undone.
                                {factors.length === 1 && ' Removing this method will disable MFA for your account.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFactor(factor.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Method
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Use an authenticator app</p>
              <p className="text-muted-foreground">Apps like Google Authenticator or Authy are more secure than SMS</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Download className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Save your backup codes</p>
              <p className="text-muted-foreground">Store them in a safe place in case you lose access to your device</p>
            </div>
          </div>
          <div className="flex gap-3">
            <RefreshCw className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Regenerate backup codes regularly</p>
              <p className="text-muted-foreground">Generate new backup codes if you've used several or suspect they're compromised</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAManagement;
