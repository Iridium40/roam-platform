/**
 * Action button component for AI chat messages
 * Renders clickable buttons that navigate or filter services
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Search, 
  Filter, 
  MapPin, 
  Truck,
  Calendar,
  Star,
  DollarSign
} from 'lucide-react';
import type { MessageAction } from '@/utils/parseChatLinks';

interface ChatActionButtonProps {
  action: MessageAction;
  onNavigate?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

export function ChatActionButton({ 
  action, 
  onNavigate,
  variant = 'primary' 
}: ChatActionButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (action.type === 'navigate' && action.data.url) {
      navigate(action.data.url);
      onNavigate?.(); // Optional: Close chat after navigation
    }
  };

  const getIcon = () => {
    // Use custom icon if specified
    if (action.icon) {
      switch (action.icon) {
        case 'search': return <Search className="w-4 h-4" />;
        case 'filter': return <Filter className="w-4 h-4" />;
        case 'map-pin': return <MapPin className="w-4 h-4" />;
        case 'truck': return <Truck className="w-4 h-4" />;
        case 'calendar': return <Calendar className="w-4 h-4" />;
        case 'star': return <Star className="w-4 h-4" />;
        case 'dollar-sign': return <DollarSign className="w-4 h-4" />;
        default: return <ChevronRight className="w-4 h-4" />;
      }
    }

    // Infer icon from action data
    if (action.data.location) return <MapPin className="w-4 h-4" />;
    if (action.data.query) return <Search className="w-4 h-4" />;
    if (action.data.category || action.data.delivery) return <Filter className="w-4 h-4" />;
    
    return <ChevronRight className="w-4 h-4" />;
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-roam-blue hover:bg-roam-blue/90 text-white shadow-md hover:shadow-lg';
      case 'secondary':
        return 'bg-roam-yellow hover:bg-roam-yellow/90 text-roam-blue shadow-md hover:shadow-lg';
      case 'tertiary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300';
      default:
        return 'bg-roam-blue hover:bg-roam-blue/90 text-white shadow-md hover:shadow-lg';
    }
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      className={`w-full justify-between transition-all duration-200 ${getVariantClasses()}`}
    >
      <span className="truncate">{action.label}</span>
      {getIcon()}
    </Button>
  );
}

/**
 * Container for multiple action buttons
 */
interface ChatActionListProps {
  actions: MessageAction[];
  onNavigate?: () => void;
}

export function ChatActionList({ actions, onNavigate }: ChatActionListProps) {
  if (actions.length === 0) return null;

  // Determine variant based on position
  const getVariant = (index: number): 'primary' | 'secondary' | 'tertiary' => {
    if (index === 0) return 'primary';
    if (index === 1) return 'secondary';
    return 'tertiary';
  };

  return (
    <div className="mt-3 space-y-2">
      {actions.map((action, index) => (
        <ChatActionButton
          key={`${action.label}-${index}`}
          action={action}
          onNavigate={onNavigate}
          variant={getVariant(index)}
        />
      ))}
    </div>
  );
}
