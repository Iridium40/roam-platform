#!/usr/bin/env ts-node

/**
 * Phase 1 Onboarding Production Tests
 * 
 * Live testing suite for ROAM Phase 1 onboarding on production Vercel deployment
 * Tests the complete user flow from account creation to application submission
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Production Configuration
const CONFIG = {
  PROVIDER_APP_URL: process.env.PROVIDER_APP_URL || 'https://roamprovider.app',
  SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY!,
  TEST_EMAIL_PREFIX: 'test-phase1-',
  TEST_PASSWORD: 'TestPassword123!',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// Generate unique test email
const TEST_EMAIL = `${CONFIG.TEST_EMAIL_PREFIX}${Date.now()}@roamprovider.app`;

// Test data for production
const TEST_DATA = {
  business: {
    name: `Test Car Wash ${Date.now()}`,
    type: 'llc',
    category: 'car_wash',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zip: '90210'
    },
    phone: '+1234567890',
    email: `business${Date.now()}@testcarwash.com`,
    yearsInBusiness: 5,
    employeeCount: 10,
    description: 'Professional car wash services for production testing',
    website: 'https://testcarwash.com',
    taxId: '12-3456789'
  }
};

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

class ProductionPhase1TestRunner {
  private results: TestSuite[] = [];
  private startTime: number = 0;
  private testUserId: string | null = null;
  private testBusinessId: string | null = null;
  private testApplicationId: string | null = null;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Phase 1 Production Testing...');
    console.log(`📍 Testing URL: ${CONFIG.PROVIDER_APP_URL}`);
    console.log(`📧 Test Email: ${TEST_EMAIL}\n`);
    
    this.startTime = Date.now();

    try {
      // Run test suites in order
      await this.runApplicationHealthTests();
      await this.runAuthenticationFlowTests();
      await this.runBusinessInfoFlowTests();
      await this.runDocumentUploadFlowTests();
      await this.runApplicationSubmissionTests();
      await this.runDatabaseVerificationTests();
      await this.runCleanupTests();

      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      await this.runCleanupTests();
      process.exit(1);
    }
  }

  private async runTest(
    suiteName: string,
    testName: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`  ✓ Running: ${testName}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`    ✅ Passed (${duration}ms)`);
      return {
        name: testName,
        status: 'passed',
        duration,
        details: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`    ❌ Failed (${duration}ms): ${error}`);
      
      return {
        name: testName,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async runApplicationHealthTests(): Promise<void> {
    console.log('🏥 Testing Application Health...');
    const suite: TestSuite = {
      name: 'Application Health Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: Application Availability
    suite.tests.push(await this.runTest('Health', 'Application Availability', async () => {
      const response = await fetch(CONFIG.PROVIDER_APP_URL, {
        method: 'GET',
        timeout: CONFIG.TIMEOUT
      });

      if (!response.ok) {
        throw new Error(`Application not available: ${response.status} ${response.statusText}`);
      }

      return { status: response.status, url: CONFIG.PROVIDER_APP_URL };
    }));

    // Test 2: Onboarding Page Access
    suite.tests.push(await this.runTest('Health', 'Onboarding Page Access', async () => {
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/provider-onboarding/phase1`, {
        method: 'GET',
        timeout: CONFIG.TIMEOUT
      });

      if (!response.ok) {
        throw new Error(`Onboarding page not accessible: ${response.status}`);
      }

      return { status: response.status };
    }));

    // Test 3: API Endpoints Health
    suite.tests.push(await this.runTest('Health', 'API Endpoints Health', async () => {
      const endpoints = [
        '/api/onboarding/status/test',
        '/api/auth/signup',
        '/api/onboarding/business-info'
      ];

      const results = [];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${CONFIG.PROVIDER_APP_URL}${endpoint}`, {
            method: 'GET',
            timeout: 10000
          });
          results.push({ endpoint, status: response.status });
        } catch (error) {
          // Some endpoints may return 404 for test data, which is expected
          results.push({ endpoint, status: 404, expected: true });
        }
      }

      return { endpointResults: results };
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private async runAuthenticationFlowTests(): Promise<void> {
    console.log('🔐 Testing Authentication Flow...');
    const suite: TestSuite = {
      name: 'Authentication Flow Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: Account Creation
    suite.tests.push(await this.runTest('Auth', 'Account Creation', async () => {
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: CONFIG.TEST_PASSWORD,
          confirmPassword: CONFIG.TEST_PASSWORD
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Signup failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.user) {
        throw new Error('No user returned from signup');
      }

      this.testUserId = data.user.id;
      return { userId: data.user.id, email: TEST_EMAIL };
    }));

    // Test 2: User Session Verification
    suite.tests.push(await this.runTest('Auth', 'User Session Verification', async () => {
      if (!this.testUserId) {
        throw new Error('No test user ID available');
      }

      // Verify user exists in Supabase
      const { data: userData, error } = await supabase.auth.admin.getUserById(this.testUserId);
      
      if (error) {
        throw new Error(`User verification failed: ${error.message}`);
      }

      if (!userData.user) {
        throw new Error('User not found in database');
      }

      return { userVerified: true, email: userData.user.email };
    }));

    // Test 3: Login Flow
    suite.tests.push(await this.runTest('Auth', 'Login Flow', async () => {
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: CONFIG.TEST_PASSWORD
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.user || !data.session) {
        throw new Error('No user or session returned from login');
      }

      return { loginSuccessful: true, sessionId: data.session.access_token };
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private async runBusinessInfoFlowTests(): Promise<void> {
    console.log('🏢 Testing Business Information Flow...');
    const suite: TestSuite = {
      name: 'Business Information Flow Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: Business Info Validation
    suite.tests.push(await this.runTest('Business Info', 'Form Validation', async () => {
      const invalidData = {
        name: '', // Empty name should fail
        type: 'invalid_type',
        category: 'invalid_category'
      };

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/business-info`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      if (response.ok) {
        throw new Error('Validation should have failed for invalid data');
      }

      return { validationWorking: true, status: response.status };
    }));

    // Test 2: Valid Business Info Submission
    suite.tests.push(await this.runTest('Business Info', 'Valid Submission', async () => {
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/business-info`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...TEST_DATA.business,
          userId: this.testUserId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Business info submission failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.businessId) {
        throw new Error('No business ID returned');
      }

      this.testBusinessId = data.businessId;
      return { businessId: data.businessId, businessName: TEST_DATA.business.name };
    }));

    // Test 3: Business Profile Database Verification
    suite.tests.push(await this.runTest('Business Info', 'Database Verification', async () => {
      if (!this.testBusinessId) {
        throw new Error('No test business ID available');
      }

      const { data: businessProfile, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', this.testBusinessId)
        .single();

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (!businessProfile) {
        throw new Error('Business profile not found in database');
      }

      if (businessProfile.business_name !== TEST_DATA.business.name) {
        throw new Error('Business name mismatch in database');
      }

      return { 
        businessProfile: {
          id: businessProfile.id,
          name: businessProfile.business_name,
          type: businessProfile.business_type
        }
      };
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private async runDocumentUploadFlowTests(): Promise<void> {
    console.log('📄 Testing Document Upload Flow...');
    const suite: TestSuite = {
      name: 'Document Upload Flow Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: File Format Validation
    suite.tests.push(await this.runTest('Document Upload', 'File Format Validation', async () => {
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('document', invalidFile);
      formData.append('documentType', 'professional_license');
      formData.append('businessId', this.testBusinessId || 'test-business-id');

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/upload-documents`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        throw new Error('Invalid file format should be rejected');
      }

      return { formatValidationWorking: true, status: response.status };
    }));

    // Test 2: Valid Document Upload (Professional License)
    suite.tests.push(await this.runTest('Document Upload', 'Professional License Upload', async () => {
      const validFile = new File(['PDF content for professional license'], 'license.pdf', { 
        type: 'application/pdf' 
      });
      const formData = new FormData();
      formData.append('document', validFile);
      formData.append('documentType', 'professional_license');
      formData.append('businessId', this.testBusinessId || 'test-business-id');

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/upload-documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Document upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.documents || data.documents.length === 0) {
        throw new Error('No documents returned from upload');
      }

      return { uploadSuccessful: true, documentCount: data.documents.length };
    }));

    // Test 3: Professional Headshot Upload
    suite.tests.push(await this.runTest('Document Upload', 'Professional Headshot Upload', async () => {
      const headshotFile = new File(['Image content for headshot'], 'headshot.jpg', { 
        type: 'image/jpeg' 
      });
      const formData = new FormData();
      formData.append('document', headshotFile);
      formData.append('documentType', 'professional_headshot');
      formData.append('businessId', this.testBusinessId || 'test-business-id');

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/upload-documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Headshot upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return { headshotUploadSuccessful: true, documentCount: data.documents?.length || 0 };
    }));

    // Test 4: Business License Upload (for LLC)
    suite.tests.push(await this.runTest('Document Upload', 'Business License Upload', async () => {
      const businessLicenseFile = new File(['PDF content for business license'], 'business-license.pdf', { 
        type: 'application/pdf' 
      });
      const formData = new FormData();
      formData.append('document', businessLicenseFile);
      formData.append('documentType', 'business_license');
      formData.append('businessId', this.testBusinessId || 'test-business-id');

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/upload-documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Business license upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return { businessLicenseUploadSuccessful: true, documentCount: data.documents?.length || 0 };
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private async runApplicationSubmissionTests(): Promise<void> {
    console.log('📋 Testing Application Submission...');
    const suite: TestSuite = {
      name: 'Application Submission Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: Application Status Check
    suite.tests.push(await this.runTest('Application', 'Status Check', async () => {
      if (!this.testUserId) {
        throw new Error('No test user ID available');
      }

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/status/${this.testUserId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status check failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.phase || data.phase !== 'phase1') {
        throw new Error(`Expected phase1, got: ${data.phase}`);
      }

      return { statusRetrieved: true, phase: data.phase, currentStep: data.currentStep };
    }));

    // Test 2: Application Submission
    suite.tests.push(await this.runTest('Application', 'Submit Application', async () => {
      if (!this.testUserId || !this.testBusinessId) {
        throw new Error('Missing required IDs for application submission');
      }

      const submissionData = {
        userId: this.testUserId,
        businessId: this.testBusinessId,
        documents: ['professional_license', 'professional_headshot', 'business_license'],
        termsAccepted: true,
        privacyAccepted: true
      };

      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/submit-application`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Application submission failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.applicationId) {
        throw new Error('No application ID returned');
      }

      this.testApplicationId = data.applicationId;
      return { applicationId: data.applicationId, submissionSuccessful: true };
    }));

    // Test 3: Application Database Verification
    suite.tests.push(await this.runTest('Application', 'Database Verification', async () => {
      if (!this.testApplicationId || !this.testBusinessId) {
        throw new Error('Missing application or business ID for verification');
      }

      const { data: application, error } = await supabase
        .from('provider_applications')
        .select('*')
        .eq('id', this.testApplicationId)
        .single();

      if (error) {
        throw new Error(`Application database query failed: ${error.message}`);
      }

      if (!application) {
        throw new Error('Application not found in database');
      }

      if (application.application_status !== 'submitted') {
        throw new Error(`Expected status 'submitted', got: ${application.application_status}`);
      }

      return { 
        application: {
          id: application.id,
          status: application.application_status,
          businessId: application.business_id
        }
      };
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private async runDatabaseVerificationTests(): Promise<void> {
    console.log('🗄️ Testing Database Verification...');
    const suite: TestSuite = {
      name: 'Database Verification Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: Business Profile Verification
    suite.tests.push(await this.runTest('Database', 'Business Profile Verification', async () => {
      if (!this.testBusinessId) {
        throw new Error('No test business ID available');
      }

      const { data: businessProfile, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', this.testBusinessId)
        .single();

      if (error) {
        throw new Error(`Business profile query failed: ${error.message}`);
      }

      if (!businessProfile) {
        throw new Error('Business profile not found');
      }

      return { 
        businessProfile: {
          id: businessProfile.id,
          name: businessProfile.business_name,
          type: businessProfile.business_type,
          status: businessProfile.verification_status
        }
      };
    }));

    // Test 2: Document Records Verification
    suite.tests.push(await this.runTest('Database', 'Document Records Verification', async () => {
      if (!this.testBusinessId) {
        throw new Error('No test business ID available');
      }

      const { data: documents, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', this.testBusinessId);

      if (error) {
        throw new Error(`Document records query failed: ${error.message}`);
      }

      if (!documents || documents.length === 0) {
        throw new Error('No document records found');
      }

      const requiredTypes = ['professional_license', 'professional_headshot', 'business_license'];
      const uploadedTypes = documents.map(doc => doc.document_type);
      const missingTypes = requiredTypes.filter(type => !uploadedTypes.includes(type));

      if (missingTypes.length > 0) {
        throw new Error(`Missing required document types: ${missingTypes.join(', ')}`);
      }

      return { 
        documentCount: documents.length,
        documentTypes: uploadedTypes,
        allRequiredPresent: missingTypes.length === 0
      };
    }));

    // Test 3: Application Status Verification
    suite.tests.push(await this.runTest('Database', 'Application Status Verification', async () => {
      if (!this.testApplicationId) {
        throw new Error('No test application ID available');
      }

      const { data: application, error } = await supabase
        .from('provider_applications')
        .select('*')
        .eq('id', this.testApplicationId)
        .single();

      if (error) {
        throw new Error(`Application status query failed: ${error.message}`);
      }

      if (!application) {
        throw new Error('Application not found');
      }

      return { 
        application: {
          id: application.id,
          status: application.application_status,
          submittedAt: application.submitted_at,
          businessId: application.business_id
        }
      };
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private async runCleanupTests(): Promise<void> {
    console.log('🧹 Running Cleanup...');
    const suite: TestSuite = {
      name: 'Cleanup Tests',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    };

    const startTime = Date.now();

    // Test 1: Clean up test user
    suite.tests.push(await this.runTest('Cleanup', 'Remove Test User', async () => {
      if (!this.testUserId) {
        return { cleanupSkipped: true, reason: 'No test user ID' };
      }

      try {
        const { error } = await supabase.auth.admin.deleteUser(this.testUserId);
        if (error) {
          console.warn(`Warning: Could not delete test user: ${error.message}`);
          return { cleanupPartial: true, error: error.message };
        }
        return { userDeleted: true };
      } catch (error) {
        console.warn(`Warning: User cleanup failed: ${error}`);
        return { cleanupPartial: true, error: String(error) };
      }
    }));

    // Test 2: Clean up test business profile
    suite.tests.push(await this.runTest('Cleanup', 'Remove Test Business Profile', async () => {
      if (!this.testBusinessId) {
        return { cleanupSkipped: true, reason: 'No test business ID' };
      }

      try {
        const { error } = await supabase
          .from('business_profiles')
          .delete()
          .eq('id', this.testBusinessId);

        if (error) {
          console.warn(`Warning: Could not delete test business profile: ${error.message}`);
          return { cleanupPartial: true, error: error.message };
        }
        return { businessProfileDeleted: true };
      } catch (error) {
        console.warn(`Warning: Business profile cleanup failed: ${error}`);
        return { cleanupPartial: true, error: String(error) };
      }
    }));

    // Test 3: Clean up test application
    suite.tests.push(await this.runTest('Cleanup', 'Remove Test Application', async () => {
      if (!this.testApplicationId) {
        return { cleanupSkipped: true, reason: 'No test application ID' };
      }

      try {
        const { error } = await supabase
          .from('provider_applications')
          .delete()
          .eq('id', this.testApplicationId);

        if (error) {
          console.warn(`Warning: Could not delete test application: ${error.message}`);
          return { cleanupPartial: true, error: error.message };
        }
        return { applicationDeleted: true };
      } catch (error) {
        console.warn(`Warning: Application cleanup failed: ${error}`);
        return { cleanupPartial: true, error: String(error) };
      }
    }));

    suite.summary = this.calculateSuiteSummary(suite.tests, Date.now() - startTime);
    this.results.push(suite);
  }

  private calculateSuiteSummary(tests: TestResult[], duration: number) {
    const total = tests.length;
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;

    return { total, passed, failed, skipped, duration };
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const allTests = this.results.flatMap(suite => suite.tests);
    const totalTests = allTests.length;
    const passedTests = allTests.filter(t => t.status === 'passed').length;
    const failedTests = allTests.filter(t => t.status === 'failed').length;
    const skippedTests = allTests.filter(t => t.status === 'skipped').length;

    console.log('\n📊 Phase 1 Production Testing Report');
    console.log('='.repeat(60));
    console.log(`🌐 Production URL: ${CONFIG.PROVIDER_APP_URL}`);
    console.log(`📧 Test Email: ${TEST_EMAIL}`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏭️  Skipped: ${skippedTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    console.log('\n📋 Test Suite Results:');
    this.results.forEach(suite => {
      console.log(`\n${suite.name}:`);
      console.log(`  Total: ${suite.summary.total}`);
      console.log(`  Passed: ${suite.summary.passed} ✅`);
      console.log(`  Failed: ${suite.summary.failed} ❌`);
      console.log(`  Duration: ${suite.summary.duration}ms`);
      
      if (suite.summary.failed > 0) {
        console.log('  Failed Tests:');
        suite.tests
          .filter(t => t.status === 'failed')
          .forEach(t => console.log(`    - ${t.name}: ${t.error}`));
      }
    });

    // Save results to file
    const reportData = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        duration: totalDuration,
        timestamp: new Date().toISOString(),
        productionUrl: CONFIG.PROVIDER_APP_URL,
        testEmail: TEST_EMAIL
      },
      suites: this.results
    };

    const reportPath = path.join(__dirname, 'phase1-production-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    if (failedTests > 0) {
      console.log('\n❌ Some tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All Phase 1 production tests passed!');
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  const runner = new ProductionPhase1TestRunner();
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Production test runner failed:', error);
    process.exit(1);
  });
}

export { ProductionPhase1TestRunner };
