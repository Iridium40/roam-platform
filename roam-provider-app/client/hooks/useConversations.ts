import { useAuth } from '@/contexts/AuthContext';
import { useConversations as useSharedConversations } from '@roam/shared';

export const useConversations = () => {
  const { user, customer, userType } = useAuth();
  
  // Get the current user data (either provider or customer)
  const currentUser = user || customer;
  const currentUserType = userType || (currentUser?.provider_role ? 'provider' : 'customer');
  
  return useSharedConversations({
    userId: currentUser?.id || '',
    userType: currentUserType,
    onError: (error) => {
      console.error('Conversations error:', error);
    }
  });
};
