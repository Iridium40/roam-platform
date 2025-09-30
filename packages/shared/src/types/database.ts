// Legacy database types file - now re-exports from modular structure
// This file maintains backwards compatibility

export * from "./database/index";

/*
MIGRATION NOTICE: The original 2,268-line database.ts has been refactored into:
- /database/enums.ts - Type definitions  
- /database/tables/ - Table types by domain
- /database/models/ - Business logic interfaces
- /database/schema.ts - Main Database interface
- /database/index.ts - Consolidated exports
*/
