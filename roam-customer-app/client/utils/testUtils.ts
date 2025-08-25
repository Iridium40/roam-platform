import { logger } from '@/utils/logger';
// Test utilities for development - can be called from browser console
// Usage: window.testUtils.deleteTestUser('test@example.com')

export const testUtils = {
  async deleteTestUser(email: string) {
    try {
      const response = await fetch("/api/admin/delete-test-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        logger.debug(`✅ Successfully deleted test user: ${email}`);
        return result;
      } else {
        logger.error(`❌ Failed to delete test user: ${result.error}`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error deleting test user:`, error);
      return null;
    }
  },

  async listTestUsers() {
    try {
      const response = await fetch("/api/admin/list-test-users");
      const result = await response.json();

      if (response.ok) {
        logger.debug("📋 Test users:", result.users);
        return result.users;
      } else {
        logger.error(`❌ Failed to list test users: ${result.error}`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error listing test users:`, error);
      return null;
    }
  },

  async debugUserBusiness(email: string, fix: boolean = false) {
    try {
      const method = fix ? "POST" : "GET";
      const body = fix
        ? JSON.stringify({ email, fixRelationships: true })
        : undefined;

      const response = await fetch("/api/admin/debug-user-business", {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      const result = await response.json();

      if (response.ok) {
        logger.debug(`🔍 User-business debug for ${email}:`, result);
        if (fix && result.message) {
          logger.debug(`✅ ${result.message}`);
        }
        return result;
      } else {
        logger.error(`❌ Failed to debug user-business: ${result.error}`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error debugging user-business:`, error);
      return null;
    }
  },

  async approveApplication(
    businessId: string,
    adminUserId: string,
    notes?: string,
  ) {
    try {
      const response = await fetch("/api/admin/approve-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          adminUserId,
          approvalNotes: notes,
          sendEmail: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        logger.debug(`✅ Application approved for business ${businessId}`);
        logger.debug("📧 Approval email sent to provider");
        return result;
      } else {
        logger.error(`❌ Failed to approve application: ${result.error}`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error approving application:`, error);
      return null;
    }
  },

  async rejectApplication(
    businessId: string,
    adminUserId: string,
    reason: string,
    nextSteps: string,
  ) {
    try {
      const response = await fetch("/api/admin/reject-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          adminUserId,
          reason,
          nextSteps,
          sendEmail: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        logger.debug(`❌ Application rejected for business ${businessId}`);
        logger.debug("📧 Rejection email sent to provider");
        return result;
      } else {
        logger.error(`❌ Failed to reject application: ${result.error}`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error rejecting application:`, error);
      return null;
    }
  },

  async completeOnboarding(userId: string, businessId: string) {
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          businessId,
          phase2Data: {
            identityVerified: true,
            paymentSetupComplete: true,
          },
        }),
      });

      const result = await response.json();

      if (response.ok) {
        logger.debug(`🎉 Onboarding completed for user ${userId}`);
        logger.debug("📧 Welcome email sent to provider");
        return result;
      } else {
        logger.error(`❌ Failed to complete onboarding: ${result.error}`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error completing onboarding:`, error);
      return null;
    }
  },

  async testApplicationSubmission(userId: string, businessId: string) {
    try {
      const response = await fetch("/api/onboarding/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          businessId,
          finalConsents: {
            informationAccuracy: true,
            termsAccepted: true,
            backgroundCheckConsent: true,
          },
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      logger.debug(
        `📋 Application submission test - Status: ${response.status}, Content-Type: ${contentType}`,
      );

      if (contentType.includes("application/json")) {
        const result = await response.json();

        if (response.ok) {
          logger.debug(
            `✅ Application submitted successfully for user ${userId}`,
          );
          logger.debug("📧 Application submitted email sent to provider");
          return result;
        } else {
          logger.error(`❌ Application submission failed: ${result.error}`);
          return { error: result.error, debug: result.debug };
        }
      } else {
        const text = await response.text();
        logger.error(`❌ Non-JSON response:`, text);
        return { error: "Server returned non-JSON response", response: text };
      }
    } catch (error) {
      logger.error(`❌ Error testing application submission:`, error);
      return { error: error.message };
    }
  },

  async generatePhase2Token(businessId: string) {
    logger.debug("🔑 Generating Phase 2 token for business:", businessId);

    try {
      const response = await fetch("/api/test/generate-phase2-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      const result = await response.json();

      if (result.success) {
        logger.debug("✅ Phase 2 Token Generated!");
        logger.debug("🏢 Business ID:", result.businessId);
        logger.debug("👤 User ID:", result.userId);
        logger.debug("📋 Application ID:", result.applicationId);
        logger.debug("🔗 Phase 2 URL:", result.phase2Url);
        logger.debug("⏰ Expires:", result.expiresAt);
        logger.debug("🎫 Token:", result.token);

        // Make the URL clickable in console
        logger.debug("\n🚀 CLICK TO TEST PHASE 2:");
        logger.debug(
          `%c${result.phase2Url}`,
          "color: blue; font-size: 14px; text-decoration: underline;",
        );

        return result;
      } else {
        logger.error("❌ Failed to generate token:", result.error);
        return result;
      }
    } catch (error) {
      logger.error("❌ Error generating Phase 2 token:", error);
      return { error: error.message };
    }
  },
};

// Make it available globally for console access
if (typeof window !== "undefined") {
  (window as any).testUtils = testUtils;
}
