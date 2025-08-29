import { useAuth } from '@/contexts/AuthContext';
import { useConversations as useSharedConversations } from '@roam/shared';

export const useConversations = () => {
  const { customer } = useAuth();
  
  return useSharedConversations({
    userId: customer?.id || '',
    userType: 'customer',
    onError: (error) => {
      console.error('Conversations error:', error);
    }
  });
};
