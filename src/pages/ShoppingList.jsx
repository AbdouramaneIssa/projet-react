// src/pages/ShoppingList.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../components/Modal';
import { ShoppingCart, CheckSquare, Download, Trash2, AlertTriangle } from 'lucide-react';

const ShoppingList = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [shoppingList, setShoppingList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [prices, setPrices] = useState({}); // { itemId: { price: number, unitReference: string } }
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const shoppingListQuery = query(collection(db, `artifacts/${appId}/users/${userId}/shoppingList`));
      const unsubscribe = onSnapshot(shoppingListQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setShoppingList(items);
      }, (error) => {
        showNotification(`Erreur lors du chargement de la liste de courses: ${error.message}`, 'error');
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === shoppingList.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(shoppingList.map(item => item.id));
    }
  };

  const handlePriceChange = (id, field, value) => {
    setPrices(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const calculateTotalCost = () => {
    return shoppingList.reduce((total, item) => {
      const priceInfo = prices[item.id] || { price: item.price || 0, unitReference: 'pièce' };
      const pricePerUnit = parseFloat(priceInfo.price) || 0;
      return total + pricePerUnit * item.quantity;
    }, 0).toFixed(2);
  };

  const handleValidateList = async () => {
    try {
      const stockRef = collection(db, `artifacts/${appId}/users/${userId}/stock`);
      for (const id of selectedItems) {
        const item = shoppingList.find(i => i.id === id);
        if (item) {
          await addDoc(stockRef, {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            addedAt: new Date().toISOString(),
            expirationDate: null
          });
          await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/shoppingList`, id));
        }
      }
      setSelectedItems([]);
      showNotification('Liste de courses validée et transférée au stock!', 'success');
    } catch (error) {
      showNotification(`Erreur lors de la validation de la liste: ${error.message}`, 'error');
    }
  };

  const handleDeleteIngredient = async (id, name) => {
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/shoppingList`, id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      showNotification(`Ingrédient ${name} supprimé de la liste de courses.`, 'success');
    } catch (error) {
      showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
    }
  };

  const handleClearList = async () => {
    try {
      for (const item of shoppingList) {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/shoppingList`, item.id));
      }
      setSelectedItems([]);
      setShowClearModal(false);
      showNotification('Liste de courses réinitialisée avec succès !', 'success');
    } catch (error) {
      showNotification(`Erreur lors de la réinitialisation de la liste: ${error.message}`, 'error');
    }
  };

  const handleExportList = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.setTextColor(52, 73, 94);
      const date = new Date().toLocaleDateString('fr-FR');
      doc.text(`Liste de Courses - ${date}`, 105, 14, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text('Généré pour vos besoins d\'achat.', pageWidth / 2, 20);

      const tableColumn = [
        'Produit',
        'Quantité',
        'Unité',
        'Prix Unitaire (FCFA)',
        'Référence Unité',
        'Total (FCFA)'
      ];
      const tableRows = [];

      if (shoppingList.length === 0) {
        tableRows.push([{
          content: 'Aucune liste de courses.',
          colSpan: 6,
          styles: { fontStyle: 'italic', textColor: [150, 150, 150], halign: 'center' }
        }]);
      } else {
        shoppingList.forEach(item => {
          const priceInfo = prices[item.id] || { price: item.price || 0, unitReference: 'pièce' };
          const unitPrice = parseFloat(priceInfo.price) || 0;
          const total = (unitPrice * item.quantity).toFixed(2);
          tableRows.push([
            item.name.charAt(0).toUpperCase() + item.name.slice(1),
            item.quantity,
            item.unit,
            unitPrice > 0 ? unitPrice.toFixed(2) : 'N/A',
            priceInfo.unitReference,
            isNaN(total) ? 'N/A' : total
          ]);
        });
      }

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 30, right: 10, bottom: 10, left: 10 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25, halign: 'right' },
          2: { cellWidth: 25 },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30 },
          5: { cellWidth: 30, halign: 'right' }
        }
      });

      const finalY = doc.lastAutoTable.finalY || 30;
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      doc.text(`Coût Total Estimé: ${calculateTotalCost()} FCFA`, 10, finalY + 10);
      doc.save(`shopping_list_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erreur lors de l\'exportation PDF:', error);
      showNotification('Erreur lors de l\'exportation PDF.', 'error');
    }
  };

  const handleSendToVendors = async () => {
    try {
      if (shoppingList.length === 0) {
        showNotification("Votre liste de courses est vide !", "error");
        return;
      }

      // Récupérer le profil utilisateur pour obtenir le nom
      const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      const clientName = userProfileSnap.exists() ? userProfileSnap.data().fullName : "Client";

      // Créer la proposition
      const propositionsRef = collection(db, `artifacts/${appId}/propositions`);
      await addDoc(propositionsRef, {
        clientId: currentUser.uid,
        clientName: clientName,
        items: shoppingList.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        })),
        status: 'EN ATTENTE',
        createdAt: new Date().toISOString(),
        messages: []
      });

      // Vider la liste de courses
      for (const item of shoppingList) {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/shoppingList`, item.id));
      }
      setSelectedItems([]);
      showNotification('Liste de courses envoyée aux vendeurs !', 'success');
      setPage('client-propositions');
    } catch (error) {
      console.error("Erreur lors de l'envoi aux vendeurs:", error);
      showNotification(`Erreur lors de l'envoi aux vendeurs: ${error.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Liste de Courses</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Gérez vos besoins d'achat</p>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Coût Total Estimé: {calculateTotalCost()} FCFA</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleSendToVendors}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all duration-300"
              disabled={shoppingList.length === 0}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Envoyer aux Vendeurs
            </button>
            <button
              onClick={handleValidateList}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
              disabled={selectedItems.length === 0}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Valider la Liste
            </button>
            <button
              onClick={handleExportList}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter (PDF)
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-300"
              disabled={shoppingList.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedItems.length === shoppingList.length}
            onChange={handleSelectAll}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Tout sélectionner</span>
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-12 gap-4 font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="col-span-1"></div>
            <div className="col-span-4">Produit</div>
            <div className="col-span-2">Quantité</div>
            <div className="col-span-2">Unité</div>
            <div className="col-span-2">Prix</div>
            <div className="col-span-1">Actions</div>
          </div>

          {shoppingList.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Votre liste de courses est vide
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {shoppingList.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 dark:text-gray-400">{item.quantity}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 dark:text-gray-400">{item.unit}</p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={prices[item.id]?.price || ''}
                        onChange={(e) => handlePriceChange(item.id, 'price', e.target.value)}
                        placeholder="Prix"
                        className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={prices[item.id]?.unitReference || ''}
                        onChange={(e) => handlePriceChange(item.id, 'unitReference', e.target.value)}
                        placeholder="Unité"
                        className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleDeleteIngredient(item.id, item.name)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear List Confirmation Modal */}
      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Confirmer la réinitialisation">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-gray-700 dark:text-gray-300">
              Êtes-vous sûr de vouloir réinitialiser la liste de courses ? Tous les éléments seront supprimés sans être ajoutés au stock.
            </p>
          </div>
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setShowClearModal(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              onClick={handleClearList}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShoppingList;