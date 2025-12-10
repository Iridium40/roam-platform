/**
 * Utility for parsing AI chat messages and extracting actionable links
 * Supports [Button: Label](URL) format
 */

export interface MessageAction {
  type: 'navigate' | 'filter' | 'search';
  label: string;
  icon?: string;
  data: {
    url?: string;
    category?: string;
    delivery?: string;
    location?: string;
    query?: string;
  };
}

export interface ParsedMessage {
  text: string;
  actions: MessageAction[];
}

/**
 * Parse a chat message and extract action buttons
 * @param content - The raw message content from AI
 * @returns Parsed message with text and actions
 */
export function parseChatMessage(content: string): ParsedMessage {
  const actions: MessageAction[] = [];
  let text = content;

  // Parse [Button: Text](URL) format
  const buttonRegex = /\[Button:\s*([^\]]+)\]\(([^\)]+)\)/gi;
  let match;

  while ((match = buttonRegex.exec(content)) !== null) {
    const [fullMatch, label, url] = match;
    
    try {
      // Extract URL parameters
      const urlObj = new URL(url, window.location.origin);
      const params = new URLSearchParams(urlObj.search);
      
      actions.push({
        type: determineActionType(params),
        label: label.trim(),
        icon: getIconForAction(params),
        data: {
          url,
          category: params.get('category') || undefined,
          delivery: params.get('delivery') || undefined,
          location: params.get('location') || undefined,
          query: params.get('search') || undefined,
        }
      });

      // Remove button syntax from display text
      text = text.replace(fullMatch, '');
    } catch (error) {
      console.error('Error parsing button URL:', url, error);
      // Keep the original text if parsing fails
    }
  }

  // Clean up extra whitespace from removed buttons
  text = text.replace(/\n\n+/g, '\n\n').trim();

  return { text, actions };
}

/**
 * Determine the action type based on URL parameters
 */
function determineActionType(params: URLSearchParams): MessageAction['type'] {
  if (params.has('search')) return 'search';
  if (params.has('category') || params.has('delivery')) return 'filter';
  return 'navigate';
}

/**
 * Get appropriate icon name for action based on parameters
 */
function getIconForAction(params: URLSearchParams): string {
  if (params.has('location')) return 'map-pin';
  if (params.has('search')) return 'search';
  if (params.has('category')) return 'filter';
  if (params.has('delivery')) return 'truck';
  return 'chevron-right';
}

/**
 * Format category name for display
 */
export function formatCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    'massage': 'Massage & Bodywork',
    'beauty': 'Beauty & Aesthetics',
    'fitness': 'Fitness & Performance',
    'iv-therapy': 'IV Therapy & Recovery',
    'medical': 'Medical & Health Services',
    'lifestyle': 'Lifestyle & Wellness',
  };
  
  return categoryMap[category] || category;
}

/**
 * Format delivery method for display
 */
export function formatDeliveryMethod(delivery: string): string {
  const deliveryMap: Record<string, string> = {
    'mobile': 'Mobile Service',
    'in-studio': 'In-Studio',
    'virtual': 'Virtual/Online',
  };
  
  return deliveryMap[delivery] || delivery;
}

/**
 * Build a search URL with filters
 */
export function buildSearchUrl(filters: {
  category?: string;
  delivery?: string;
  location?: string;
  query?: string;
}): string {
  const params = new URLSearchParams();
  
  if (filters.category) params.append('category', filters.category);
  if (filters.delivery) params.append('delivery', filters.delivery);
  if (filters.location) params.append('location', filters.location);
  if (filters.query) params.append('search', filters.query);
  
  const queryString = params.toString();
  return `/booknow${queryString ? `?${queryString}` : ''}`;
}
