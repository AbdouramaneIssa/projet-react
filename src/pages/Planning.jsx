import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc, setDoc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import Modal from '../components/Modal';
import { Calendar, Search, Plus, Trash2, CheckSquare, Send, Users, User } from 'lucide-react';

const Planning = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const { notify } = useNotifications();
  const [view, setView] = useState('weekly');
  const [recipes, setRecipes] = useState([]);
  const [publicRecipes, setPublicRecipes] = useState([]);
  const [mealPlan, setMealPlan] = useState({});
  const [familyCoefficient, setFamilyCoefficient] = useState(0);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGroupMessage, setIsGroupMessage] = useState(false);

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      // Fetch private recipes
      const privateRecipesQuery = query(collection(db, `artifacts/${appId}/users/${userId}/recipes`));
      const unsubscribePrivate = onSnapshot(privateRecipesQuery, (snapshot) => {
        const privateRecipesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecipes(privateRecipesData);
      }, (error) => {
        showNotification(`Erreur lors du chargement des recettes privées: ${error.message}`, 'error');
      });

      // Fetch public recipes
      const publicRecipesQuery = query(collection(db, `artifacts/${appId}/recipes`));
      const unsubscribePublic = onSnapshot(publicRecipesQuery, (snapshot) => {
        const publicRecipesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPublicRecipes(publicRecipesData);
      }, (error) => {
        showNotification(`Erreur lors du chargement des recettes publiques: ${error.message}`, 'error');
      });

      // Fetch family members (including main user)
      const familyQuery = query(collection(db, `artifacts/${appId}/users/${userId}/profiles`));
      const unsubscribeFamily = onSnapshot(familyQuery, (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFamilyMembers(members); // Include all profiles, including main user
        calculateFamilyCoefficient(members);
      }, (error) => {
        showNotification(`Erreur lors du chargement des membres de la famille: ${error.message}`, 'error');
      });

      // Fetch meal plan
      const mealPlanQuery = query(collection(db, `artifacts/${appId}/users/${userId}/mealPlans`));
      const unsubscribeMealPlan = onSnapshot(mealPlanQuery, (snapshot) => {
        const plan = {};
        snapshot.docs.forEach(doc => {
          plan[doc.id] = doc.data();
        });
        setMealPlan(plan);
      }, (error) => {
        showNotification(`Erreur lors du chargement du plan de repas: ${error.message}`, 'error');
      });

      return () => {
        unsubscribePrivate();
        unsubscribePublic();
        unsubscribeFamily();
        unsubscribeMealPlan();
      };
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const calculateFamilyCoefficient = (members) => {
    let coefficient = 0;
    members.forEach(member => {
      const age = parseInt(member.age) || 0;
      let base = 1;
      if (age < 18) {
        if (age <= 5) base = 0.5;
        else if (age <= 12) base = 0.7;
        else base = 0.9;
      }
      if (member.gender === 'Homme') base += 0.1;
      else if (member.gender === 'Femme') base -= 0.1;
      coefficient += base;
    });
    setFamilyCoefficient(coefficient.toFixed(2));
  };

  const handleSelectDish = async (recipe) => {
    if (!currentSlot) return;
    const { day, mealType } = currentSlot;
    const mealData = {
      [mealType]: { dishId: recipe.id, name: recipe.name, image: recipe.image || '' }
    };

    try {
      const mealDocRef = doc(db, `artifacts/${appId}/users/${userId}/mealPlans`, day);
      if (autoUpdate) {
        const docSnap = await getDoc(mealDocRef);
        if (!docSnap.exists()) {
          await setDoc(mealDocRef, mealData);
        } else {
          await updateDoc(mealDocRef, mealData, { merge: true });
        }
        if (recipe && Array.isArray(recipe.ingredients)) {
          await updateStockAndShoppingList(recipe);
        } else {
          showNotification('Aucun ingrédient trouvé pour ce plat.', 'warning');
        }
        showNotification(`Repas ${mealType} ajouté pour ${day}!`, 'success');
        notify(
          'Nouveau repas planifié',
          `${recipe.name} a été ajouté comme ${mealType} pour le ${new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          'success'
        );
      } else {
        setMealPlan(prev => ({
          ...prev,
          [day]: { ...prev[day], ...mealData }
        }));
      }
      setShowModal(false);
    } catch (error) {
      showNotification(`Erreur lors de l'ajout du repas: ${error.message}`, 'error');
    }
  };

  const updateStockAndShoppingList = async (recipe) => {
    try {
      const stockQuery = query(collection(db, `artifacts/${appId}/users/${userId}/stock`));
      const stockSnapshot = await getDocs(stockQuery);
      const stock = stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const shoppingList = [];

      for (const ing of recipe.ingredients) {
        if (!ing.name || !ing.quantity || !ing.unit) continue;
        const requiredQuantity = ing.quantity * familyCoefficient;
        const stockItem = stock.find(s => s.name?.toLowerCase() === ing.name.toLowerCase() && s.unit === ing.unit);
        if (stockItem && stockItem.quantity >= requiredQuantity) {
          await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/stock`, stockItem.id), {
            quantity: stockItem.quantity - requiredQuantity
          });
        } else {
          const missingQuantity = stockItem ? requiredQuantity - stockItem.quantity : requiredQuantity;
          shoppingList.push({
            name: ing.name,
            quantity: missingQuantity,
            unit: ing.unit,
            price: ing.price || 0
          });
        }
      }

      if (shoppingList.length > 0) {
        const shoppingListRef = collection(db, `artifacts/${appId}/users/${userId}/shoppingList`);
        for (const item of shoppingList) {
          await addDoc(shoppingListRef, item);
        }
        showNotification('Ingrédients manquants ajoutés à la liste de courses.', 'warning');
        notify(
          'Mise à jour de la liste de courses',
          `${shoppingList.length} ingrédient(s) manquant(s) ont été ajoutés à votre liste de courses`,
          'warning'
        );
      }
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour du stock: ${error.message}`, 'error');
    }
  };

  const handleUpdatePlan = async () => {
    try {
      for (const [day, plan] of Object.entries(mealPlan)) {
        const mealDocRef = doc(db, `artifacts/${appId}/users/${userId}/mealPlans`, day);
        const docSnap = await getDoc(mealDocRef);
        if (!docSnap.exists()) {
          await setDoc(mealDocRef, plan);
        } else {
          await updateDoc(mealDocRef, plan, { merge: true });
        }
        const recipe = [...recipes, ...publicRecipes].find(r => r.id === plan.breakfast?.dishId || r.id === plan.lunch?.dishId || r.id === plan.dinner?.dishId);
        if (recipe && Array.isArray(recipe.ingredients)) {
          await updateStockAndShoppingList(recipe);
        }
      }
      showNotification('Plan de repas mis à jour avec succès!', 'success');
      notify(
        'Plan de repas mis à jour',
        'Votre planning de repas a été mis à jour avec succès',
        'success'
      );
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour du plan: ${error.message}`, 'error');
    }
  };

  const getDays = () => {
    const days = [];
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);

    if (view === 'weekly') {
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        days.push(date.toISOString().split('T')[0]);
      }
    } else {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      for (let i = 0; i <= lastDay.getDate() - 1; i++) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() + i);
        days.push(date.toISOString().split('T')[0]);
      }
    }
    return days;
  };

  const getWeekPeriod = () => {
    const days = getDays();
    if (view === 'weekly' && days.length === 7) {
      const start = new Date(days[0]);
      const end = new Date(days[6]);
      return `Semaine du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    return '';
  };

  const handleSendMealPlan = async () => {
    if (!currentUser || !userId || Object.keys(mealPlan).length === 0) {
      showNotification('Aucun plan de repas ou utilisateur non connecté.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const weeklyDays = getDays();
      const formattedMealPlan = {};

      daysOfWeek.forEach((dayName, index) => {
        const date = weeklyDays[index];
        if (date && mealPlan[date]) {
          formattedMealPlan[dayName] = {
            'Petit-déjeuner': mealPlan[date].breakfast || { name: 'Non planifié' },
            'Déjeuner': mealPlan[date].lunch || { name: 'Non planifié' },
            'Dîner': mealPlan[date].dinner || { name: 'Non planifié' }
          };
        } else {
          formattedMealPlan[dayName] = {
            'Petit-déjeuner': { name: 'Non planifié' },
            'Déjeuner': { name: 'Non planifié' },
            'Dîner': { name: 'Non planifié' }
          };
        }
      });

      const validMembers = familyMembers
        .filter(member => member.email && member.age >= 5)
        .map(member => ({
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          age: member.age,
          gender: member.gender
        }));

      if (validMembers.length === 0) {
        showNotification('Aucun membre de la famille avec un email valide.', 'error');
        setIsSending(false);
        return;
      }

      const response = await fetch('http://localhost:3001/send-meal-plan-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          members: validMembers,
          mealPlan: formattedMealPlan
        })
      });

      const result = await response.json();
      if (response.ok) {
        showNotification('Planning envoyé par email avec succès !', 'success');
      } else {
        showNotification(`Erreur: ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Erreur lors de l'envoi: ${error.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = async (member = null) => {
    if (!currentUser || !userId || Object.keys(mealPlan).length === 0) {
      showNotification('Aucun plan de repas ou utilisateur non connecté.', 'error');
      return;
    }

    setShowWhatsAppModal(true);

    try {
      const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const weeklyDays = getDays();
      const formattedMealPlan = {};

      daysOfWeek.forEach((dayName, index) => {
        const date = weeklyDays[index];
        if (date && mealPlan[date]) {
          formattedMealPlan[dayName] = {
            'Petit-déjeuner': mealPlan[date].breakfast || { name: 'Non planifié' },
            'Déjeuner': mealPlan[date].lunch || { name: 'Non planifié' },
            'Dîner': mealPlan[date].dinner || { name: 'Non planifié' }
          };
        } else {
          formattedMealPlan[dayName] = {
            'Petit-déjeuner': { name: 'Non planifié' },
            'Déjeuner': { name: 'Non planifié' },
            'Dîner': { name: 'Non planifié' }
          };
        }
      });

      const payload = {
        userId,
        mealPlan: formattedMealPlan
      };

      if (!isGroupMessage && member) {
        payload.member = {
          id: member.id,
          fullName: member.fullName,
          age: member.age,
          gender: member.gender
        };
      }

      const response = await fetch('http://localhost:3001/generate-whatsapp-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        setGeneratedMessage(result.message);
      } else {
        showNotification(`Erreur lors de la génération du message: ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Erreur lors de la génération du message: ${error.message}`, 'error');
    }
  };

  const handleWhatsAppSubmit = () => {
    if (!phoneNumber || !generatedMessage) {
      showNotification('Veuillez entrer un numéro de téléphone et attendre la génération du message.', 'error');
      return;
    }

    const encodedMessage = encodeURIComponent(generatedMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setShowWhatsAppModal(false);
    setPhoneNumber('');
    setGeneratedMessage('');
    setSelectedMember(null);
    setIsGroupMessage(false);
    showNotification('Message envoyé à WhatsApp !', 'success');
  };

  const filteredRecipes = [...recipes, ...publicRecipes].filter(recipe =>
    recipe && (
      recipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recipe.altNames && recipe.altNames.some(name => name?.toLowerCase().includes(searchQuery.toLowerCase())))
    )
  );

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Planification des Repas</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Organisez les repas de votre famille</p>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Coefficient Familial: {familyCoefficient}</p>
              {view === 'weekly' && (
                <p className="text-gray-700 dark:text-gray-300 font-medium">{getWeekPeriod()}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-4 flex-wrap gap-2">
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </select>
            <button
              onClick={() => setPage('stock-management')}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300"
            >
              Gestion des Stocks
            </button>
            <button
              onClick={() => setPage('shopping-list')}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300"
            >
              Liste de Courses
            </button>
            <button
              onClick={handleSendMealPlan}
              disabled={isSending || Object.keys(mealPlan).length === 0}
              className={`flex items-center px-4 py-2 rounded-xl text-white transition-all duration-300 ${isSending || Object.keys(mealPlan).length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
                }`}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Envoi...' : 'Envoyer par Email'}
            </button>
            <button
              onClick={() => setShowWhatsAppModal(true)}
              disabled={Object.keys(mealPlan).length === 0}
              className={`flex items-center px-4 py-2 rounded-xl text-white transition-all duration-300 ${Object.keys(mealPlan).length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer via WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={autoUpdate}
            onChange={(e) => setAutoUpdate(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Mise à jour automatique du plan</span>
        </label>
        {!autoUpdate && (
          <button
            onClick={handleUpdatePlan}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Mettre à jour le plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {getDays().map(day => (
          <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-scale-in">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            {['breakfast', 'lunch', 'dinner'].map(mealType => (
              <div key={mealType} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 capitalize">
                  {mealType === 'breakfast' ? 'Petit Déjeuner' : mealType === 'lunch' ? 'Déjeuner' : 'Dîner'}
                </h4>
                {mealPlan[day]?.[mealType] ? (
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4">
                      <img
                        src={mealPlan[day][mealType].image || 'https://via.placeholder.com/50'}
                        alt={mealPlan[day][mealType].name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                      />
                      <p className="text-gray-700 dark:text-gray-300">{mealPlan[day][mealType].name}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newPlan = {
                          ...mealPlan,
                          [day]: { ...mealPlan[day], [mealType]: null }
                        };
                        setMealPlan(newPlan);
                        if (autoUpdate) {
                          const mealDocRef = doc(db, `artifacts/${appId}/users/${userId}/mealPlans`, day);
                          await updateDoc(mealDocRef, { [mealType]: null }, { merge: true });
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentSlot({ day, mealType });
                      setShowModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un plat
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Sélectionner un Plat">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-3 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher des plats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-100/50 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
        <div className="max-h-96 overflow-y-auto space-y-4">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                onClick={() => handleSelectDish(recipe)}
                className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-300"
              >
                <img
                  src={recipe.image || 'https://via.placeholder.com/50'}
                  alt={recipe.name}
                  className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-blue-500"
                />
                <p className="font-semibold text-gray-800 dark:text-gray-100">{recipe.name}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">Aucun plat trouvé.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showWhatsAppModal}
        onClose={() => {
          setShowWhatsAppModal(false);
          setSelectedMember(null);
          setPhoneNumber('');
          setGeneratedMessage('');
          setIsGroupMessage(false);
        }}
        title="Envoyer le Planning via WhatsApp"
        className="backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl max-w-lg mx-auto"
      >
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={() => {
                setIsGroupMessage(false);
                setGeneratedMessage('');
                setPhoneNumber('');
                setSelectedMember(null);
              }}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${!isGroupMessage
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              title="Envoyer à un membre"
            >
              <User className="w-5 h-5 mr-2" />
              Membre
            </button>
            <button
              onClick={() => {
                setIsGroupMessage(true);
                setSelectedMember(null);
                setPhoneNumber('');
                setGeneratedMessage('');
                handleSendWhatsApp();
              }}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${isGroupMessage
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              title="Envoyer au groupe"
            >
              <Users className="w-5 h-5 mr-2" />
              Groupe
            </button>
          </div>

          {!isGroupMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sélectionner un membre
              </label>
              <select
                value={selectedMember ? selectedMember.id : ''}
                onChange={(e) => {
                  const member = familyMembers.find(m => m.id === e.target.value);
                  setSelectedMember(member);
                  if (member) handleSendWhatsApp(member);
                }}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Sélectionner un membre</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ({member.age} ans, {member.gender})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message généré
            </label>
            <textarea
              value={generatedMessage}
              readOnly
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              rows="5"
            />
          </div>

          <button
            onClick={handleWhatsAppSubmit}
            disabled={!phoneNumber || !generatedMessage}
            className={`w-full flex justify-center py-3 px-4 rounded-lg text-white transition-all duration-300 ${!phoneNumber || !generatedMessage
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            <Send className="w-4 h-4 mr-2" />
            Envoyer via WhatsApp
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Planning;