// Main API exports
export { authAPI } from "./auth";
export { bookingsAPI } from "./bookings";
export { servicesAPI } from "./services";
export { businessesAPI } from "./businesses";
export { customersAPI } from "./customers";

// Re-export for backward compatibility
export { authAPI as directSupabase } from "./auth";
