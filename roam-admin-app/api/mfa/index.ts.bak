import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MFAService } from '@roam/shared/dist/services/mfa-service';

const mfaService = new MFAService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action } = req.query;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'User ID required' });
      return;
    }

    switch (action) {
      case 'setup':
        await handleMFASetup(req, res, userId);
        break;
      case 'verify-setup':
        await handleMFAVerifySetup(req, res, userId);
        break;
      case 'create-challenge':
        await handleMFACreateChallenge(req, res, userId);
        break;
      case 'verify':
        await handleMFAVerify(req, res, userId);
        break;
      case 'verify-backup':
        await handleMFAVerifyBackup(req, res, userId);
        break;
      case 'status':
        await handleMFAStatus(req, res, userId);
        break;
      case 'methods':
        await handleMFAMethods(req, res, userId);
        break;
      case 'disable':
        await handleMFADisable(req, res, userId);
        break;
      case 'regenerate-backup':
        await handleMFARegenerateBackup(req, res, userId);
        break;
      case 'check-session':
        await handleMFACheckSession(req, res, userId);
        break;
      case 'create-session':
        await handleMFACreateSession(req, res, userId);
        break;
      case 'invalidate-session':
        await handleMFAInvalidateSession(req, res, userId);
        break;
      case 'settings':
        await handleMFASettings(req, res, userId);
        break;
      case 'update-settings':
        await handleMFAUpdateSettings(req, res, userId);
        break;
      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('MFA API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleMFASetup(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { method, friendlyName, phoneNumber, email } = req.body;

  if (!method) {
    res.status(400).json({ error: 'Method is required' });
    return;
  }

  const result = await mfaService.setupMFA(userId, {
    method,
    friendlyName,
    phoneNumber,
    email
  });

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAVerifySetup(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId, code } = req.body;

  if (!factorId || !code) {
    res.status(400).json({ error: 'Factor ID and code are required' });
    return;
  }

  const result = await mfaService.verifyMFASetup(userId, factorId, code);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFACreateChallenge(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!factorId) {
    res.status(400).json({ error: 'Factor ID is required' });
    return;
  }

  const result = await mfaService.createMFACallenge(userId, factorId, ipAddress, userAgent);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAVerify(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId, code, rememberDevice } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!factorId || !code) {
    res.status(400).json({ error: 'Factor ID and code are required' });
    return;
  }

  const result = await mfaService.verifyMFA(userId, {
    factorId,
    code,
    rememberDevice
  }, ipAddress, userAgent);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAVerifyBackup(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId, backupCode } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!factorId || !backupCode) {
    res.status(400).json({ error: 'Factor ID and backup code are required' });
    return;
  }

  const result = await mfaService.verifyBackupCode(userId, {
    factorId,
    backupCode
  }, ipAddress, userAgent);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAStatus(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await mfaService.getMFAStatus(userId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAMethods(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await mfaService.getMFAMethods(userId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFADisable(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId } = req.body;

  if (!factorId) {
    res.status(400).json({ error: 'Factor ID is required' });
    return;
  }

  const result = await mfaService.disableMFA(userId, factorId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFARegenerateBackup(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId } = req.body;

  if (!factorId) {
    res.status(400).json({ error: 'Factor ID is required' });
    return;
  }

  const result = await mfaService.regenerateBackupCodes(userId, factorId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFACheckSession(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'Session ID is required' });
    return;
  }

  const result = await mfaService.checkMFASession(userId, sessionId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFACreateSession(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { factorId, sessionId } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!factorId || !sessionId) {
    res.status(400).json({ error: 'Factor ID and session ID are required' });
    return;
  }

  const result = await mfaService.createMFASession(userId, factorId, sessionId, ipAddress, userAgent);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAInvalidateSession(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'Session ID is required' });
    return;
  }

  const result = await mfaService.invalidateMFASession(userId, sessionId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFASettings(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await mfaService.getMFASettings(userId);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}

async function handleMFAUpdateSettings(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const settings = req.body;

  const result = await mfaService.updateMFASettings(userId, settings);

  if (result.success) {
    res.status(200).json(result.data);
  } else {
    res.status(400).json({ error: result.error, code: result.code });
  }
}
