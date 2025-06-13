import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import NavbarVendor from '../components/NavbarVendor';

const VendorOrders = ({ setPage, showNotification }) => {
  const { currentUser, db, appId, userId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const propositionsRef = collection(db, `artifacts/${appId}/propositions`);
        const q = query(propositionsRef,
          where('vendorId', '==', currentUser.uid),
          where('status', '==', 'EN COURS DE LIVRAISON')
        );
        const querySnapshot = await getDocs(q);

        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setOrders(ordersData);
      } catch (error) {
        console.error("Erreur lors de la récupération des commandes:", error);
        showNotification("Erreur lors du chargement des commandes", "error");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && db && appId) {
      fetchOrders();
    }
  }, [currentUser, db, appId]);

  const handleDeliveryComplete = async (orderId) => {
    try {
      const orderRef = doc(db, `artifacts/${appId}/propositions/${orderId}`);
      await updateDoc(orderRef, {
        status: 'LIVRÉ',
        deliveredAt: new Date().toISOString()
      });

      // Mettre à jour l'état local
      setOrders(orders.filter(o => o.id !== orderId));
      showNotification("Livraison marquée comme terminée !", "success");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      showNotification("Erreur lors de la mise à jour du statut", "error");
    }
  };

  const handleMessage = async (orderId) => {
    if (!message.trim()) return;

    try {
      const orderRef = doc(db, `artifacts/${appId}/propositions/${orderId}`);
      const orderDoc = await getDoc(orderRef);
      const currentMessages = orderDoc.data().messages || [];

      await updateDoc(orderRef, {
        messages: [...currentMessages, {
          sender: currentUser.uid,
          text: message.trim(),
          timestamp: new Date().toISOString()
        }]
      });

      // Mettre à jour l'état local
      const updatedOrders = orders.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            messages: [...(o.messages || []), {
              sender: currentUser.uid,
              text: message.trim(),
              timestamp: new Date().toISOString()
            }]
          };
        }
        return o;
      });
      setOrders(updatedOrders);
      setMessage('');
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      showNotification("Erreur lors de l'envoi du message", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <NavbarVendor setPage={setPage} showNotification={showNotification} />
      <div className="flex-1 p-8 mt-16">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Mes Commandes en Cours</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>Aucune commande en cours</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Commande du {new Date(order.createdAt).toLocaleDateString()}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Client: {order.clientName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Acceptée le: {new Date(order.acceptedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Liste d'achats:</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                    {order.items.map((item, index) => (
                      <li key={index}>{item.name} - {item.quantity}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => handleDeliveryComplete(order.id)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Marquer comme livré
                  </button>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Messages:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                      {order.messages?.map((msg, index) => (
                        <div key={index} className={`p-2 rounded ${msg.sender === currentUser.uid
                          ? 'bg-blue-100 ml-auto'
                          : 'bg-gray-100'
                          } max-w-[80%]`}>
                          <p className="text-sm">{msg.text}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Votre message..."
                        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleMessage(order.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleMessage(order.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorOrders;