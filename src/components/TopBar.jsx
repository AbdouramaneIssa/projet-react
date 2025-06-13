// src/components/TopBar.jsx
import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Bell, User, Settings, LogOut, Globe, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TopBar = ({ setPage, showNotification, theme, setTheme, language, setLanguage }) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { currentUser, userId, db, appId } = useAuth();
  const [mainUserProfile, setMainUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setMainUserProfile(docSnap.data());
        } else {
          setMainUserProfile(null);
        }
      }, (error) => {
        console.error("Erreur lors du chargement du profil utilisateur pour la TopBar:", error);
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId]);

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const unsubscribe = getNotifications(db, appId, userId, (notifs) => {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(db, appId, userId);
      showNotification("Toutes les notifications ont été marquées comme lues", "success");
    } catch (error) {
      console.error("Erreur lors du marquage des notifications:", error);
      showNotification("Erreur lors du marquage des notifications", "error");
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(db, appId, userId, notificationId);
    } catch (error) {
      console.error("Erreur lors du marquage de la notification:", error);
    }
  };

  const languages = [
    { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w20/fr.png' },
    { code: 'en', name: 'English', flag: 'https://flagcdn.com/w20/gb.png' },
    { code: 'ar', name: 'العربية', flag: 'https://flagcdn.com/w20/sa.png' },
  ];

  const currentLang = languages.find(lang => lang.code === language) || languages[0];

  return (
    <div className="fixed top-0 left-64 right-0 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg flex items-center justify-between px-6 z-30 border-b border-gray-200/50 dark:border-gray-700/50">
      {/* Search Bar */}
      <div className="relative flex items-center w-1/3 max-w-md">
        <Search className="absolute left-4 text-gray-400 dark:text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher des recettes, membres..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 transition-all duration-300"
        />
      </div>

      <div className="flex items-center space-x-4">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => {
              const currentIndex = languages.findIndex(lang => lang.code === language);
              const nextIndex = (currentIndex + 1) % languages.length;
              setLanguage(languages[nextIndex].code);
            }}
            className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 group"
            title="Changer la langue"
          >
            <img
              src={currentLang.flag || "/placeholder.svg"}
              alt={currentLang.name}
              className="w-5 h-5 rounded-full group-hover:scale-110 transition-transform duration-300"
            />
            <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-primary-500 transition-colors duration-300" />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 group"
          title="Changer de thème"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-primary-500 group-hover:scale-110 transition-all duration-300" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-all duration-300" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 group"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-primary-500 group-hover:scale-110 transition-all duration-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-scale-in">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Tout marquer comme lu
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Aucune notification
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleMarkAsRead(notification.id)}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{notification.timeAgo}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 group"
          >
            <div className="relative">
              <img
                src={mainUserProfile?.profilePic || `https://placehold.co/32x32/cccccc/000000?text=${mainUserProfile?.fullName?.charAt(0) || 'U'}`}
                alt="Profil utilisateur"
                className="w-8 h-8 rounded-full object-cover border-2 border-primary-500 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            {mainUserProfile && (
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {mainUserProfile.fullName?.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">En ligne</p>
              </div>
            )}
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-scale-in">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <img
                    src={mainUserProfile?.profilePic || `https://placehold.co/40x40/cccccc/000000?text=${mainUserProfile?.fullName?.charAt(0) || 'U'}`}
                    alt="Profil"
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {mainUserProfile?.fullName || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <button
                  onClick={() => {
                    setPage('user-profile');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <User className="w-4 h-4 mr-3 text-blue-500" />
                  Voir mon profil
                </button>
                <button
                  onClick={() => {
                    setPage('settings');
                    setIsProfileDropdownOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-3 text-gray-500" />
                  Paramètres
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                <button
                  onClick={() => {
                    showNotification("Déconnexion en cours...", "info");
                    setIsProfileDropdownOpen(false);
                    setPage('login');
                  }}
                  className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;