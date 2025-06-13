import { useAuth } from '../context/AuthContext';
import { createNotification } from '../services/notificationService';

export const useNotifications = () => {
  const { db, appId, userId } = useAuth();

  const notify = async (title, message, type = 'info') => {
    if (!db || !appId || !userId) return;

    try {
      await createNotification(db, appId, userId, {
        title,
        message,
        type
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return { notify };
}; 