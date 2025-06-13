import React, { useState, useEffect } from 'react';
import { Home, User, Users, LogOut, Settings, Calendar, Utensils, HeartPulse, Sparkles, ChevronLeft, ChevronRight, Package, ShoppingCart, MapPin } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ setPage, currentPage, showNotification }) => {
  const { currentUser, userId, auth, db, appId } = useAuth();
  const [mainUserProfile, setMainUserProfile] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        console.error("Erreur lors du chargement du profil utilisateur pour la navbar:", error);
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, auth, db, appId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showNotification('Déconnexion réussie ! À bientôt 👋', 'success');
      setPage('login');
    } catch (error) {
      showNotification(`Erreur de déconnexion: ${error.message}`, 'error');
      console.error("Erreur de déconnexion:", error);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: Home, page: 'dashboard', color: 'text-blue-500' },
    { name: 'Ma Famille', icon: Users, page: 'my-family', color: 'text-green-500' },
    { name: 'Planification', icon: Calendar, page: 'meal-planning', color: 'text-purple-500' },
    { name: 'Recettes', icon: Utensils, page: 'recipes', color: 'text-orange-500' },
    { name: 'Gestion des Stocks', icon: Package, page: 'stock-management', color: 'text-teal-500' },
    { name: 'Liste de Courses', icon: ShoppingCart, page: 'shopping-list', color: 'text-pink-500' },
    { name: 'Mes Propositions', icon: ShoppingCart, page: 'client-propositions', color: 'text-indigo-500' },
    { name: 'Vendeurs Proches', icon: MapPin, page: 'vendor-map', color: 'text-red-500' },
    { name: 'Santé & Nutrition', icon: HeartPulse, page: 'health-nutrition', color: 'text-red-500' },
    { name: 'Paramètres', icon: Settings, page: 'settings', color: 'text-gray-500' },
  ];

  return (
    <nav className={`flex flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-2xl h-screen ${isCollapsed ? 'w-20' : 'w-64'} fixed top-0 left-0 z-40 transition-all duration-300 border-r border-gray-200/50 dark:border-gray-700/50`}>
      <div className={`p-6 border-b border-gray-200/50 dark:border-gray-700/50 ${isCollapsed ? 'px-4' : ''}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center animate-pulse-glow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                MealBloom
              </h1>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {!isCollapsed && mainUserProfile && (
          <div className="mt-4 flex items-center space-x-3 p-3 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl">
            <div className="relative">
              <img
                src={mainUserProfile.profilePic || `https://placehold.co/40x40/cccccc/000000?text=${mainUserProfile.fullName.charAt(0)}`}
                alt="Profil"
                className="w-10 h-10 rounded-full object-cover border-2 border-primary-500"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {mainUserProfile.fullName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">En ligne</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setPage(item.page)}
            className={`flex items-center w-full px-4 py-3 rounded-xl text-left font-medium transition-all duration-300 group ${currentPage === item.page
              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg transform scale-105'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50 hover:transform hover:scale-105'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
          >
            <item.icon className={`w-5 h-5 ${currentPage === item.page ? 'text-white' : item.color} ${isCollapsed ? '' : 'mr-3'} group-hover:scale-110 transition-transform duration-300`} />
            {!isCollapsed && (
              <span className="truncate">{item.name}</span>
            )}
            {currentPage === item.page && !isCollapsed && (
              <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      <div className={`p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setPage('user-profile')}
          className={`flex items-center w-full px-4 py-3 rounded-xl text-left font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-300 hover:transform hover:scale-105 ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
          <User className={`w-5 h-5 text-blue-500 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span>Mon Profil</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-4 py-3 rounded-xl text-left font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-300 hover:transform hover:scale-105 ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;