import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import NavbarVendor from '../components/NavbarVendor';

const VendorPropositions = ({ setPage, showNotification }) => {
  const { currentUser, db, appId, userId } = useAuth();
  const [propositions, setPropositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposition, setSelectedProposition] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPropositions = async () => {
      try {
        const propositionsRef = collection(db, `artifacts/${appId}/propositions`);
        const q = query(propositionsRef, where('status', '==', 'EN ATTENTE'));
        const querySnapshot = await getDocs(q);

        const propositionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPropositions(propositionsData);
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

  const handleAcceptProposition = async (propositionId) => {
    try {
      const propositionRef = doc(db, `artifacts/${appId}/propositions/${propositionId}`);
      await updateDoc(propositionRef, {
        status: 'EN COURS DE LIVRAISON',
        vendorId: currentUser.uid,
        acceptedAt: new Date().toISOString()
      });

      // Mettre à jour l'état local
      setPropositions(propositions.filter(p => p.id !== propositionId));
      showNotification("Proposition acceptée avec succès !", "success");
    } catch (error) {
      console.error("Erreur lors de l'acceptation de la proposition:", error);
      showNotification("Erreur lors de l'acceptation de la proposition", "error");
    }
  };

  const handleMessage = async (propositionId) => {
    if (!message.trim()) return;

    try {
      const propositionRef = doc(db, `artifacts/${appId}/propositions/${propositionId}`);
      const propositionDoc = await getDoc(propositionRef);
      const currentMessages = propositionDoc.data().messages || [];

      await updateDoc(propositionRef, {
        messages: [...currentMessages, {
          sender: currentUser.uid,
          text: message.trim(),
          timestamp: new Date().toISOString()
        }]
      });

      // Mettre à jour l'état local
      const updatedPropositions = propositions.map(p => {
        if (p.id === propositionId) {
          return {
            ...p,
            messages: [...(p.messages || []), {
              sender: currentUser.uid,
              text: message.trim(),
              timestamp: new Date().toISOString()
            }]
          };
        }
        return p;
      });
      setPropositions(updatedPropositions);
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Propositions d'Achats</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : propositions.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>Aucune proposition d'achat disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {propositions.map((proposition) => (
              <div key={proposition.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Proposition du {new Date(proposition.createdAt).toLocaleDateString()}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Client: {proposition.clientName}
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Liste d'achats:</h3>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                    {proposition.items.map((item, index) => (
                      <li key={index}>{item.name} - {item.quantity}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => handleAcceptProposition(proposition.id)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Accepter la proposition
                  </button>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Messages:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                      {proposition.messages?.map((msg, index) => (
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
                            handleMessage(proposition.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleMessage(proposition.id)}
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

export default VendorPropositions;