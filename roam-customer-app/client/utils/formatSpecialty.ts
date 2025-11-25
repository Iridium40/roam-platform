/**
 * Formats a specialty string from snake_case to Title Case
 * Handles special cases like "iv" -> "IV"
 * 
 * @param str - The specialty string in snake_case format (e.g., "iv_therapy")
 * @returns The formatted specialty in Title Case (e.g., "IV Therapy")
 */
export function formatSpecialty(str: string): string {
  return str
    .split("_")
    .map((word) => {
      // Handle special cases like "iv" -> "IV"
      if (word.toLowerCase() === "iv") {
        return "IV";
      }
      // Convert to Title Case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

