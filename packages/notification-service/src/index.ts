// Export SMS service and routes for use across all ROAM apps
export { smsService } from './services/smsService';
export type { SMSOptions, BookingDetails, CancellationDetails } from './services/smsService';

export {
  handleTestSMS,
  handleGetSMSSettings,
  handleProviderBookingNotification,
  handleCustomerBookingConfirmation,
  handleCancellationNotification,
  handleBookingReminder
} from './routes/smsRoutes';
