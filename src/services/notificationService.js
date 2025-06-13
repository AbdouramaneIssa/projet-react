import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export const createNotification = async (db, appId, userId, notification) => {
  try {
    const notificationsRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    const newNotification = {
      ...notification,
      timestamp: serverTimestamp(),
      read: false,
    };
    await addDoc(notificationsRef, newNotification);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getNotifications = (db, appId, userId, callback) => {
  try {
    const notificationsRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    const q = query(notificationsRef, orderBy('timestamp', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        let timeAgo = '';

        if (timestamp) {
          const now = new Date();
          const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));

          if (diffInMinutes < 1) {
            timeAgo = "À l'instant";
          } else if (diffInMinutes < 60) {
            timeAgo = `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
          } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            timeAgo = `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
          } else {
            const days = Math.floor(diffInMinutes / 1440);
            timeAgo = `Il y a ${days} jour${days > 1 ? 's' : ''}`;
          }
        }

        notifications.push({
          id: doc.id,
          ...data,
          timeAgo
        });
      });
      callback(notifications);
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (db, appId, userId) => {
  try {
    const notificationsRef = collection(db, `artifacts/${appId}/users/${userId}/notifications`);
    const q = query(notificationsRef, where('read', '==', false));
    const querySnapshot = await getDocs(q);

    const updatePromises = querySnapshot.docs.map(async (document) => {
      const docRef = doc(db, `artifacts/${appId}/users/${userId}/notifications`, document.id);
      return updateDoc(docRef, { read: true });
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (db, appId, userId, notificationId) => {
  try {
    const notificationRef = doc(db, `artifacts/${appId}/users/${userId}/notifications`, notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}; 