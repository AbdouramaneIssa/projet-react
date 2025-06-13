import React, { useState } from 'react';
import { Store, User, ShoppingCart, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

const NavbarVendor = ({ setPage, showNotification }) => {
  const { auth } = useAuth();
  const [currentPage, setCurrentPage] = useState('vendor-dashboard');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showNotification('Déconnexion réussie ! À bientôt 👋', 'success');
      setPage('vendor-login');
    } catch (error) {
      showNotification(`Erreur de déconnexion: ${error.message}`, 'error');
      console.error("Erreur de déconnexion:", error);
    }
  };

  const navItems = [
    { name: 'Tableau de bord', icon: Store, page: 'vendor-dashboard', color: 'text-blue-500' },
    { name: 'Propositions de Courses', icon: ShoppingCart, page: 'vendor-propositions', color: 'text-green-500' },
    { name: 'Mes Commandes', icon: ShoppingCart, page: 'vendor-orders', color: 'text-purple-500' },
    { name: 'Mon Profil', icon: User, page: 'vendor-profile', color: 'text-orange-500' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg z-40 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            MealBloom Vendeur
          </h1>
        </div>

        <div className="flex space-x-4">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setCurrentPage(item.page);
                setPage(item.page);
              }}
              className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${currentPage === item.page
                  ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                }`}
            >
              <item.icon className={`w-5 h-5 mr-2 ${currentPage === item.page ? 'text-white' : item.color}`} />
              <span>{item.name}</span>
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-300"
          >
            <LogOut className="w-5 h-5 mr-2" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavbarVendor;