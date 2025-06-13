import React, { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VendorLogin from './pages/VendorLogin';
import VendorRegister from './pages/VendorRegister';
import VendorDashboard from './pages/VendorDashboard';
import VendorProfile from './pages/VendorProfile';
import VendorPropositions from './pages/VendorPropositions';
import VendorOrders from './pages/VendorOrders';
import ProfileSetup from './pages/ProfileSetup';
import AddFamilyMember from './pages/AddFamilyMember';
import Dashboard from './pages/Dashboard';
import MyFamily from './pages/MyFamily';
import UserProfile from './pages/UserProfile';
import Recipes from './pages/Recipes';
import Planning from './pages/Planning';
import StockManagement from './pages/StockManagement';
import ShoppingList from './pages/ShoppingList';
import Chatbot from './components/Chatbot';
import Navbar from './components/Navbar';
import NavbarVendor from './components/NavbarVendor';
import TopBar from './components/TopBar';
import Notification from './components/Notification';
import ClientPropositions from './pages/ClientPropositions';
import VendorMap from './pages/VendorMap';

function App() {
  const { currentUser, loading, isAuthReady, userId, db, appId } = useAuth();
  const [currentPage, setPage] = useState('login');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('fr');
  const [mainUserProfile, setMainUserProfile] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [userType, setUserType] = useState(null);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  useEffect(() => {
    if (isAuthReady && currentUser && userId && db && appId) {
      if (!userType) {
        const vendorDocRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, currentUser.uid);
        getDoc(vendorDocRef).then(vendorSnap => {
          if (vendorSnap.exists()) {
            setVendorProfile(vendorSnap.data());
            setUserType('vendor');
            if (!currentPage.startsWith('vendor-')) {
              setPage('vendor-dashboard');
            }
          } else {
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
            getDoc(userDocRef).then(userSnap => {
              if (userSnap.exists()) {
                setMainUserProfile(userSnap.data());
                setUserType('client');
                if (currentPage === 'login' || currentPage === 'register') {
                  setPage('dashboard');
                }
              } else {
                setUserType('new');
                setPage('profile-setup');
              }
            }).catch(error => {
              console.error("Erreur lors de la vérification du profil utilisateur:", error);
              showNotification("Erreur lors du chargement du profil utilisateur.", "error");
              setPage('profile-setup');
            });
          }
        }).catch(error => {
          console.error("Erreur lors de la vérification du profil vendeur:", error);
          showNotification("Erreur lors du chargement du profil.", "error");
          setPage('login');
        });
      }
    } else if (isAuthReady && !currentUser) {
      setVendorProfile(null);
      setMainUserProfile(null);
      setUserType(null);
      setPage('login');
    }
  }, [currentUser, isAuthReady, userId, db, appId, userType]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">Chargement de l'application...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {userType === 'vendor' && (
        <NavbarVendor setPage={setPage} showNotification={showNotification} />
      )}
      {userType === 'client' && (
        <>
          <Navbar setPage={setPage} currentPage={currentPage} showNotification={showNotification} />
          <TopBar
            setPage={setPage}
            showNotification={showNotification}
            mainUserProfile={mainUserProfile}
            theme={theme}
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
          />
        </>
      )}
      <div className={`flex-1 ${userType === 'client' ? 'ml-64 mt-16' : userType === 'vendor' ? 'mt-16' : ''} transition-all duration-300`}>
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
        <div className="transition-opacity duration-300">
          {(() => {
            switch (currentPage) {
              case 'login':
                return <Login setPage={setPage} showNotification={showNotification} />;
              case 'register':
                return <Register setPage={setPage} showNotification={showNotification} />;
              case 'vendor-login':
                return <VendorLogin setPage={setPage} showNotification={showNotification} />;
              case 'vendor-register':
                return <VendorRegister setPage={setPage} showNotification={showNotification} />;
              case 'vendor-dashboard':
                return <VendorDashboard setPage={setPage} showNotification={showNotification} />;
              case 'vendor-profile':
                return <VendorProfile setPage={setPage} showNotification={showNotification} />;
              case 'vendor-propositions':
                return <VendorPropositions setPage={setPage} showNotification={showNotification} />;
              case 'vendor-orders':
                return <VendorOrders setPage={setPage} showNotification={showNotification} />;
              case 'profile-setup':
                return <ProfileSetup setPage={setPage} showNotification={showNotification} />;
              case 'add-family-member':
                return <AddFamilyMember setPage={setPage} showNotification={showNotification} />;
              case 'dashboard':
                return <Dashboard setPage={setPage} showNotification={showNotification} />;
              case 'my-family':
                return <MyFamily setPage={setPage} showNotification={showNotification} />;
              case 'user-profile':
                return <UserProfile setPage={setPage} showNotification={showNotification} />;
              case 'recipes':
                return <Recipes setPage={setPage} showNotification={showNotification} />;
              case 'meal-planning':
                return <Planning setPage={setPage} showNotification={showNotification} />;
              case 'stock-management':
                return <StockManagement setPage={setPage} showNotification={showNotification} />;
              case 'shopping-list':
                return <ShoppingList setPage={setPage} showNotification={showNotification} />;
              case 'client-propositions':
                return <ClientPropositions setPage={setPage} showNotification={showNotification} />;
              case 'vendor-map':
                return <VendorMap setPage={setPage} showNotification={showNotification} />;
              case 'health-nutrition':
              case 'settings':
                return (
                  <div className="flex-1 p-8 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                      Page "{currentPage.replace('-', ' ').charAt(0).toUpperCase() + currentPage.replace('-', ' ').slice(1)}" à venir !
                    </p>
                  </div>
                );
              default:
                return <Login setPage={setPage} showNotification={showNotification} />;
            }
          })()}
        </div>
      </div>
      {userType === 'client' && <Chatbot />}
    </div>
  );
}

export default function WrappedApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}