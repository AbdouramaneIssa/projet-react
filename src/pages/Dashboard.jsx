import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
// Importation des icônes existantes, et ajout de 'Bot'
import { Users, Utensils, Calendar, UserPlus, TrendingUp, Heart, Clock, ChefHat, Star, Activity, MessageCircle, Bot } from 'lucide-react';

const Dashboard = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [profileCount, setProfileCount] = useState(0);
  const [mainUserProfile, setMainUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      // Compter tous les profils
      const q = collection(db, `artifacts/${appId}/users/${userId}/profiles`);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setProfileCount(snapshot.size);
      }, (error) => {
        console.error("Erreur lors du comptage des profils:", error);
        showNotification("Erreur lors du chargement des données du tableau de bord.", "error");
      });

      // Charger le profil de l'utilisateur principal
      const mainUserDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
      const unsubscribeMainUser = onSnapshot(mainUserDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setMainUserProfile(docSnap.data());
        } else {
          setMainUserProfile(null);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Erreur lors du chargement du profil principal:", error);
        setIsLoading(false);
      });

      return () => {
        unsubscribe();
        unsubscribeMainUser();
      };
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const statsCards = [
    {
      title: "Profils familiaux",
      value: profileCount,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900",
      textColor: "text-blue-600 dark:text-blue-300"
    },
    {
      title: "Repas planifiés",
      value: "12",
      icon: Utensils,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
      textColor: "text-green-600 dark:text-green-300"
    },
    {
      title: "Recettes favorites",
      value: "8",
      icon: Heart,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-100 dark:bg-red-900",
      textColor: "text-red-600 dark:text-red-300"
    },
    {
      title: "Prochains événements",
      value: "3",
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900",
      textColor: "text-purple-600 dark:text-purple-300"
    }
  ];

  const quickActions = [
    {
      title: "Voir ma famille",
      description: "Gérer les profils de votre famille",
      icon: Users,
      action: () => setPage('my-family'),
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Ajouter un membre",
      description: "Ajouter un nouveau membre à votre famille",
      icon: UserPlus,
      action: () => setPage('add-family-member'),
      color: "from-green-500 to-green-600"
    },
    {
      title: "Planifier des repas",
      description: "Organiser vos repas de la semaine",
      icon: Calendar,
      action: () => setPage('meal-planning'),
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Découvrir des recettes",
      description: "Explorer de nouvelles recettes",
      icon: ChefHat,
      action: () => setPage('recipes'),
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "Poser une question au chef",
      description: "Interagir avec le chatbot MealBloom",
      // Changement ici : utilisation de l'icône Bot au lieu de MessageCircle
      icon: Bot, // Changed from MessageCircle to Bot
      action: () => {
        // Simuler un clic sur l'icône flottante du chatbot
        // Assurez-vous que le composant Chatbot est rendu globalement dans votre application (ex: dans App.jsx)
        // pour que son bouton flottant soit toujours présent.
        const chatbotButton = document.querySelector('button[title="Ouvrir le chatbot"]');
        if (chatbotButton) {
          chatbotButton.click();
        } else {
          showNotification("Erreur : impossible d'ouvrir le chatbot. Le chatbot n'est peut-être pas initialisé.", "error");
        }
      },
      color: "from-teal-500 to-teal-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-down">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Bonjour, {mainUserProfile?.fullName?.split(' ')[0] || 'Utilisateur'} ! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Bienvenue sur votre tableau de bord MealBloom
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl px-4 py-2 shadow-lg">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Actif</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up">
          {statsCards.map((stat, index) => (
            <div 
              key={stat.title}
              className="card p-6 transform hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 text-sm font-medium">+12%</span>
                <span className="text-gray-500 text-sm ml-1">ce mois</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Star className="w-6 h-6 mr-2 text-yellow-500" />
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={action.title}
                onClick={action.action}
                className="card p-6 text-left group hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                style={{ animationDelay: `${(index + 4) * 0.1}s` }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {/* Utilisation de action.icon ici pour que l'icône change dynamiquement */}
                  <action.icon className="w-6 h-6 text-white" /> 
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {action.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Welcome Section */}
        <div className="card p-8 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center animate-pulse-glow">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Bienvenue sur MealBloom ! 🌟
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                Gérez facilement les repas de votre famille, planifiez des menus sains et suivez les préférences alimentaires de chacun.
                Commencez par explorer les membres de votre famille ou ajoutez de nouveaux profils pour une expérience complète.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setPage('my-family')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Users className="w-5 h-5" />
                  <span>Voir ma famille</span>
                </button>
                <button
                  onClick={() => setPage('add-family-member')}
                  className="btn-accent flex items-center space-x-2"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Ajouter un membre</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 card p-6 animate-fade-in-up" style={{ animationDelay: '1s' }}>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-500" />
            Activité récente
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">Profil configuré avec succès</span>
              <span className="text-gray-500 text-sm ml-auto">Il y a 2 minutes</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">Connexion réussie</span>
              <span className="text-gray-500 text-sm ml-auto">Il y a 5 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;