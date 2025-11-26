import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Smartphone, Mail, QrCode, Key, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface MFAVerificationProps {
  userId: string;
  sessionId: string;
  onSuccess: (factorId: string) => void;
  onCancel?: () => void;
  required?: boolean;
}

interface MFAFactor {
  id: string;
  method: 'totp' | 'sms' | 'email';
  friendlyName?: string;
  isPrimary: boolean;
  isVerified: boolean;
  lastUsedAt?: string;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ 
  userId, 
  sessionId, 
  onSuccess, 
  onCancel,
  required = false 
}) => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<MFAFactor | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'verify' | 'backup'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [canResend, setCanResend] = useState(true);

  useEffect(() => {
    loadMFAMethods();
  }, [userId]);

  useEffect(() => {
    if (remainingTime && remainingTime > 0) {
      const timer = setTimeout(() => setRemainingTime(remainingTime - 1), 1000);
      return () => clearTimeout(timer);
    } else if (remainingTime === 0) {
      setCanResend(true);
      setRemainingTime(null);
    }
  }, [remainingTime]);

  const loadMFAMethods = async () => {
    try {
      const response = await fetch('/api/mfa?action=methods', {
        headers: {
          'x-user-id': userId
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load MFA methods');
      }

      const verifiedFactors = result.filter((factor: MFAFactor) => factor.isVerified);
      setFactors(verifiedFactors);

      // Auto-select primary factor if available
      const primaryFactor = verifiedFactors.find((factor: MFAFactor) => factor.isPrimary);
      if (primaryFactor) {
        setSelectedFactor(primaryFactor);
        if (primaryFactor.method !== 'totp') {
          // Automatically create challenge for SMS/Email
          await createChallenge(primaryFactor);
        }
        setCurrentStep('verify');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA methods');
    }
  };

  const createChallenge = async (factor: MFAFactor) => {
    if (factor.method === 'totp') return; // TOTP doesn't need challenges

    setIsLoading(true);
    try {
      const response = await fetch('/api/mfa?action=create-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          factorId: factor.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create verification challenge');
      }

      toast.success(`Verification code sent to your ${factor.method}`);
      setCanResend(false);
      setRemainingTime(60); // 60 seconds cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (code: string, isBackupCode = false) => {
    if (!selectedFactor) return;

    setIsLoading(true);
    setError(null);

    try {
      const action = isBackupCode ? 'verify-backup' : 'verify';
      const payload = isBackupCode ? {
        factorId: selectedFactor.id,
        backupCode: code
      } : {
        factorId: selectedFactor.id,
        code,
        rememberDevice: true
      };

      const response = await fetch(`/api/mfa?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid verification code');
      }

      // Create MFA session
      await createMFASession(selectedFactor.id);
      
      toast.success('MFA verification successful');
      onSuccess(selectedFactor.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const createMFASession = async (factorId: string) => {
    try {
      await fetch('/api/mfa?action=create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          factorId,
          sessionId
        })
      });
    } catch (err) {
      console.error('Failed to create MFA session:', err);
    }
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

  if (currentStep === 'select' && factors.length > 1) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Choose Verification Method
          </CardTitle>
          <CardDescription>
            Select how you'd like to verify your identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {factors.map((factor) => {
            const Icon = getMethodIcon(factor.method);
            return (
              <Button
                key={factor.id}
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={async () => {
                  setSelectedFactor(factor);
                  if (factor.method !== 'totp') {
                    await createChallenge(factor);
                  }
                  setCurrentStep('verify');
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon className="h-5 w-5" />
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getMethodName(factor.method)}</span>
                      {factor.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                    </div>
                    {factor.friendlyName && (
                      <p className="text-sm text-muted-foreground">{factor.friendlyName}</p>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!required && onCancel && (
            <Button variant="outline" className="w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'verify' && selectedFactor) {
    const Icon = getMethodIcon(selectedFactor.method);
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {getMethodName(selectedFactor.method)} Verification
          </CardTitle>
          <CardDescription>
            {selectedFactor.method === 'totp' 
              ? 'Enter the code from your authenticator app'
              : `Enter the code sent to your ${selectedFactor.method}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                onComplete={verifyCode}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-digit verification code
            </p>
          </div>

          {selectedFactor.method !== 'totp' && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => createChallenge(selectedFactor)}
                disabled={!canResend || isLoading}
              >
                {remainingTime ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Resend in {remainingTime}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
          )}

          <Separator />

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => setCurrentStep('backup')}
              className="text-muted-foreground"
            >
              <Key className="h-4 w-4 mr-2" />
              Use backup code instead
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {factors.length > 1 && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setCurrentStep('select')}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            {!required && onCancel && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'backup' && selectedFactor) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Backup Code Verification
          </CardTitle>
          <CardDescription>
            Enter one of your backup codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Using a backup code</AlertTitle>
            <AlertDescription>
              Each backup code can only be used once. Make sure to generate new ones if you're running low.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex justify-center">
              <InputOTP
                maxLength={8}
                onComplete={(code) => verifyCode(code, true)}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Enter your 8-character backup code
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setCurrentStep('verify')}
              disabled={isLoading}
            >
              Back
            </Button>
            {!required && onCancel && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <Shield className="h-8 w-8 mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading MFA methods...</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MFAVerification;
