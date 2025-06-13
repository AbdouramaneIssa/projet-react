// src/pages/StockManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import Modal from '../components/Modal';
import { Package, Plus, Trash2, Edit, AlertTriangle, AlertCircle } from 'lucide-react';

const StockManagement = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const { notify } = useNotifications();
  const [stock, setStock] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: '',
    unit: '',
    expirationDate: ''
  });
  const [editIngredient, setEditIngredient] = useState(null);

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const stockQuery = query(collection(db, `artifacts/${appId}/users/${userId}/stock`));
      const unsubscribe = onSnapshot(stockQuery, (snapshot) => {
        const stockItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStock(stockItems);
        checkExpirations(stockItems);
      }, (error) => {
        showNotification(`Erreur lors du chargement du stock: ${error.message}`, 'error');
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const checkExpirations = (items) => {
    const today = new Date();
    const notificationKey = `stockNotifications_${appId}_${userId}`;
    let notifications = JSON.parse(localStorage.getItem(notificationKey)) || {};

    items.forEach(item => {
      if (item.expirationDate) {
        const expDate = new Date(item.expirationDate);
        const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        const notificationData = notifications[item.id] || { count: 0, lastNotified: null };

        // Skip if already notified 3 times
        if (notificationData.count >= 3) return;

        const sendNotification = (message, type) => {
          notify('Alerte d\'expiration', message, type);
          notifications[item.id] = {
            count: notificationData.count + 1,
            lastNotified: new Date().toISOString()
          };
          localStorage.setItem(notificationKey, JSON.stringify(notifications));
        };

        if (daysDiff <= 0) {
          // Delete expired item
          deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/stock`, item.id))
            .then(() => {
              sendNotification(`L'ingrédient ${item.name} a expiré et a été supprimé du stock.`, 'error');
            })
            .catch(error => {
              showNotification(`Erreur lors de la suppression de ${item.name}: ${error.message}`, 'error');
            });
        } else if (daysDiff <= 2) {
          sendNotification(`L'ingrédient ${item.name} expire dans ${daysDiff} jour(s) ! Danger imminent !`, 'error');
        } else if (daysDiff <= 7) {
          sendNotification(`L'ingrédient ${item.name} expire dans ${daysDiff} jours. Attention !`, 'warning');
        }
      }
    });
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    try {
      const ingredientData = {
        ...newIngredient,
        quantity: parseFloat(newIngredient.quantity) || 0,
        addedAt: new Date().toISOString(),
        expirationDate: newIngredient.expirationDate || null
      };
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/stock`), ingredientData);
      notify(
        'Ingrédient ajouté',
        `${ingredientData.name} (${ingredientData.quantity} ${ingredientData.unit}) a été ajouté au stock`,
        'success'
      );
      setNewIngredient({ name: '', quantity: '', unit: '', expirationDate: '' });
      setShowAddModal(false);
    } catch (error) {
      showNotification(`Erreur lors de l'ajout de l'ingrédient: ${error.message}`, 'error');
    }
  };

  const handleEditIngredient = async (e) => {
    e.preventDefault();
    if (!editIngredient?.id) return;
    try {
      const ingredientData = {
        name: editIngredient.name,
        quantity: parseFloat(editIngredient.quantity) || 0,
        unit: editIngredient.unit,
        expirationDate: editIngredient.expirationDate || null,
        addedAt: editIngredient.addedAt || new Date().toISOString()
      };
      await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/stock`, editIngredient.id), ingredientData);
      // Reset notification count for this ingredient
      const notificationKey = `stockNotifications_${appId}_${userId}`;
      let notifications = JSON.parse(localStorage.getItem(notificationKey)) || {};
      delete notifications[editIngredient.id];
      localStorage.setItem(notificationKey, JSON.stringify(notifications));
      notify(
        'Ingrédient mis à jour',
        `${ingredientData.name} a été mis à jour dans le stock`,
        'success'
      );
      setEditIngredient(null);
      setShowEditModal(false);
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour de l'ingrédient: ${error.message}`, 'error');
    }
  };

  const handleDeleteIngredient = async (id, name) => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/stock`, id));
      // Remove notification tracking for this ingredient
      const notificationKey = `stockNotifications_${appId}_${userId}`;
      let notifications = JSON.parse(localStorage.getItem(notificationKey)) || {};
      delete notifications[id];
      localStorage.setItem(notificationKey, JSON.stringify(notifications));
      notify(
        'Ingrédient supprimé',
        `${name} a été supprimé du stock`,
        'warning'
      );
    } catch (error) {
      showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
  };

  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return { color: 'text-gray-500', icon: null };
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 0) {
      return { color: 'text-red-500', icon: <AlertCircle className="w-4 h-4 inline mr-1" /> };
    } else if (daysDiff <= 2) {
      return { color: 'text-red-500', icon: <AlertCircle className="w-4 h-4 inline mr-1" /> };
    } else if (daysDiff <= 7) {
      return { color: 'text-yellow-500', icon: <AlertTriangle className="w-4 h-4 inline mr-1" /> };
    }
    return { color: 'text-gray-500', icon: null };
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Gestion des Stocks</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Gérez vos ingrédients disponibles</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un Ingrédient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stock.length > 0 ? (
          stock.map(item => {
            const { color, icon } = getExpirationStatus(item.expirationDate);
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-scale-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-gray-600 dark:text-gray-400">{item.quantity} {item.unit}</p>
                    {item.expirationDate && (
                      <p className={`text-sm ${color}`}>
                        {icon} Expire le: {new Date(item.expirationDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditIngredient({ ...item });
                        setShowEditModal(true);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteIngredient(item.id, item.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-400 col-span-full">Aucun ingrédient en stock.</p>
        )}
      </div>

      {/* Add Ingredient Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter un Ingrédient">
        <form onSubmit={handleAddIngredient} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nom</label>
            <input
              type="text"
              value={newIngredient.name}
              onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quantité</label>
              <input
                type="number"
                step="0.01"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Unité</label>
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Sélectionner</option>
                <option value="g">Grammes</option>
                <option value="kg">Kilogrammes</option>
                <option value="ml">Millilitres</option>
                <option value="L">Litres</option>
                <option value="pièce">Pièce</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date d'expiration (optionnel)</label>
            <input
              type="date"
              value={newIngredient.expirationDate}
              onChange={(e) => setNewIngredient({ ...newIngredient, expirationDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600"
          >
            Ajouter
          </button>
        </form>
      </Modal>

      {/* Edit Ingredient Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier un Ingrédient">
        {editIngredient && (
          <form onSubmit={handleEditIngredient} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nom</label>
              <input
                type="text"
                value={editIngredient.name}
                onChange={(e) => setEditIngredient({ ...editIngredient, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quantité</label>
                <input
                  type="number"
                  step="0.01"
                  value={editIngredient.quantity}
                  onChange={(e) => setEditIngredient({ ...editIngredient, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Unité</label>
                <select
                  value={editIngredient.unit}
                  onChange={(e) => setEditIngredient({ ...editIngredient, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Sélectionner</option>
                  <option value="g">Grammes</option>
                  <option value="kg">Kilogrammes</option>
                  <option value="ml">Millilitres</option>
                  <option value="L">Litres</option>
                  <option value="pièce">Pièce</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date d'expiration (optionnel)</label>
              <input
                type="date"
                value={editIngredient.expirationDate || ''}
                onChange={(e) => setEditIngredient({ ...editIngredient, expirationDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600"
            >
              Mettre à jour
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default StockManagement;