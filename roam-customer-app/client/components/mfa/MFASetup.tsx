import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Copy, Download, QrCode, Shield, Smartphone, Mail, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

type MFAMethod = 'totp' | 'sms' | 'email';

interface SetupStep {
  method: MFAMethod;
  setupData?: {
    secret: string;
    qrCode: string;
    backupCodes: string[];
  };
  factorId?: string;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const { customer } = useAuth();
  const [currentStep, setCurrentStep] = useState<'select' | 'setup' | 'verify'>('select');
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>('totp');
  const [setupStep, setSetupStep] = useState<SetupStep | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get user ID from auth context
  const userId = customer?.user_id || customer?.id;

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const methodOptions = [
    {
      value: 'totp' as MFAMethod,
      title: 'Authenticator App',
      description: 'Use Google Authenticator, Authy, or similar apps',
      icon: QrCode,
      recommended: true
    },
    {
      value: 'sms' as MFAMethod,
      title: 'SMS Messages',
      description: 'Receive codes via text message',
      icon: Smartphone,
      recommended: false
    },
    {
      value: 'email' as MFAMethod,
      title: 'Email',
      description: 'Receive codes via email',
      icon: Mail,
      recommended: false
    }
  ];

  const setupMFA = async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        method: selectedMethod,
        friendlyName: data.friendlyName || `${methodOptions.find(m => m.value === selectedMethod)?.title}`,
        ...(selectedMethod === 'sms' && { phoneNumber: data.phoneNumber }),
        ...(selectedMethod === 'email' && { email: data.email })
      };

      if (!userId) {
        throw new Error('You must be logged in to setup MFA');
      }

      const response = await fetch('/api/mfa?action=setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to setup MFA');
      }

      setSetupStep({
        method: selectedMethod,
        setupData: result.setupData,
        factorId: result.factor.id
      });
      setCurrentStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup MFA');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySetup = async (code: string) => {
    if (!setupStep?.factorId) return;
    if (!userId) {
      setError('You must be logged in to verify MFA');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa?action=verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          factorId: setupStep.factorId,
          code
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify MFA setup');
      }

      toast.success('MFA has been successfully enabled!');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify MFA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadBackupCodes = () => {
    if (!setupStep?.setupData?.backupCodes) return;

    const content = `ROAM Platform MFA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${setupStep.setupData.backupCodes.join('\n')}\n\nKeep these codes safe and secure. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roam-mfa-backup-codes.txt';
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
    
    toast.success('Backup codes downloaded');
  };

  if (currentStep === 'select') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enable Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as MFAMethod)}>
            {methodOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 border rounded-lg p-4">
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="flex items-center gap-2 cursor-pointer">
                    <option.icon className="h-5 w-5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.title}</span>
                        {option.recommended && (
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>

          {selectedMethod === 'sms' && (
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register('phoneNumber', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+?[\d\s\-\(\)]+$/,
                    message: 'Please enter a valid phone number'
                  }
                })}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive">{errors.phoneNumber.message as string}</p>
              )}
            </div>
          )}

          {selectedMethod === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message as string}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="friendlyName">Friendly Name (Optional)</Label>
            <Input
              id="friendlyName"
              placeholder="My Phone / Work Email"
              {...register('friendlyName')}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(setupMFA)} disabled={isLoading}>
            {isLoading ? 'Setting up...' : 'Continue'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (currentStep === 'setup' && setupStep) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Setup Your {methodOptions.find(m => m.value === setupStep.method)?.title}</CardTitle>
          <CardDescription>
            Follow the instructions below to complete your MFA setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {setupStep.method === 'totp' && setupStep.setupData && (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium mb-2">Scan QR Code</h3>
                  <div className="flex justify-center mb-4">
                    <img 
                      src={setupStep.setupData.qrCode} 
                      alt="QR Code for MFA setup"
                      className="border rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Or enter code manually</h3>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code className="flex-1 text-sm">{setupStep.setupData.secret}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(setupStep.setupData!.secret)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {setupStep.setupData.backupCodes && setupStep.setupData.backupCodes.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Backup Codes</h3>
                    <Button size="sm" variant="outline" onClick={downloadBackupCodes}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Save these backup codes in a safe place. Each code can only be used once.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    {setupStep.setupData.backupCodes.map((code, index) => (
                      <code key={index} className="p-2 bg-background rounded border">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(setupStep.method === 'sms' || setupStep.method === 'email') && (
            <Alert>
              <AlertTitle>Verification code sent</AlertTitle>
              <AlertDescription>
                We've sent a verification code to your {setupStep.method === 'sms' ? 'phone' : 'email'}. 
                Enter it below to complete setup.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Enter verification code</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                onComplete={verifySetup}
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
              Enter the 6-digit code from your {setupStep.method === 'totp' ? 'authenticator app' : setupStep.method}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('select')}
            disabled={isLoading}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return null;
};

export default MFASetup;
