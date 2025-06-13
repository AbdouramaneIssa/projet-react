import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TopBar from '../components/TopBar';
import { Package, MessageSquare, Clock, CheckCircle } from 'lucide-react';

const ClientPropositions = ({ setPage, showNotification }) => {
  const { currentUser, db, appId, userId } = useAuth();
  const [propositions, setPropositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorProfiles, setVendorProfiles] = useState({});

  useEffect(() => {
    const fetchPropositions = async () => {
      try {
        const propositionsRef = collection(db, `artifacts/${appId}/propositions`);
        const q = query(propositionsRef, where('clientId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        const propositionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPropositions(propositionsData);

        // Récupérer les profils des vendeurs
        const vendorIds = propositionsData
          .filter(p => p.vendorId)
          .map(p => p.vendorId);

        const uniqueVendorIds = [...new Set(vendorIds)];
        const profiles = {};

        for (const vendorId of uniqueVendorIds) {
          const vendorProfileRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, vendorId);
          const vendorProfileSnap = await getDoc(vendorProfileRef);
          if (vendorProfileSnap.exists()) {
            profiles[vendorId] = vendorProfileSnap.data();
          }
        }

        setVendorProfiles(profiles);
      } catch (error) {
        console.error("Erreur lors de la récupération des propositions:", error);
        showNotification("Erreur lors du chargement des propositions", "error");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && db && appId) {
      fetchPropositions();
    }
  }, [currentUser, db, appId]);

  const handleMessage = async (propositionId, message) => {
    try {
      const propositionRef = doc(db, `artifacts/${appId}/propositions/${propositionId}`);
      await updateDoc(propositionRef, {
        messages: [...propositions.find(p => p.id === propositionId).messages, {
          sender: currentUser.uid,
          text: message,
          timestamp: new Date().toISOString()
        }]
      });

      const updatedPropositions = propositions.map(p =>
        p.id === propositionId
          ? { ...p, messages: [...p.messages, { sender: currentUser.uid, text: message, timestamp: new Date().toISOString() }] }
          : p
      );
      setPropositions(updatedPropositions);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      showNotification("Erreur lors de l'envoi du message", "error");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'EN ATTENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EN COURS DE LIVRAISON':
        return 'bg-blue-100 text-blue-800';
      case 'LIVRÉ':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar setPage={setPage} currentPage="client-propositions" showNotification={showNotification} />
      <TopBar setPage={setPage} showNotification={showNotification} />
      <div className="flex-1 p-8 ml-64 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Mes Propositions d'Achats</h1>
          <p className="text-gray-600 dark:text-gray-400">Suivez l'état de vos commandes et communiquez avec les vendeurs</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : propositions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400">Aucune proposition d'achat en cours</p>
          </div>
        ) : (
          <div className="space-y-6">
            {propositions.map((proposition) => (
              <div key={proposition.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                          Proposition du {new Date(proposition.createdAt).toLocaleDateString()}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposition.status)}`}>
                          {proposition.status}
                        </span>
                      </div>
                      {proposition.vendorId && vendorProfiles[proposition.vendorId] && (
                        <div className="flex items-center space-x-3 mt-2">
                          <img
                            src={vendorProfiles[proposition.vendorId].profilePic || `https://placehold.co/40x40/cccccc/000000?text=${vendorProfiles[proposition.vendorId].fullName.charAt(0)}`}
                            alt="Vendeur"
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Vendeur: {vendorProfiles[proposition.vendorId].fullName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Acceptée le {new Date(proposition.acceptedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(proposition.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Liste d'achats
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {proposition.items.map((item, index) => (
                          <li key={index} className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{item.name} - {item.quantity} {item.unit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {proposition.status === "EN COURS DE LIVRAISON" && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Messages
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto mb-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        {proposition.messages?.map((message, index) => (
                          <div key={index} className={`p-2 rounded ${message.sender === currentUser.uid
                              ? 'bg-blue-100 ml-auto'
                              : 'bg-gray-100'
                            } max-w-[80%]`}>
                            <p className="text-sm">{message.text}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Votre message..."
                          className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleMessage(proposition.id, e.target.value.trim());
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPropositions; 