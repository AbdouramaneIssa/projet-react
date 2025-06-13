// src/context/AuthContext.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { app } from '../firebase/firebase'; // Assure-toi que ce chemin est correct

// Variables globales fournies par l'environnement Canvas
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialisation de Firebase (récupérer les instances depuis firebase.js)
const auth = getAuth(app);
const db = getFirestore(app);

// Contexte d'authentification
const AuthContext = createContext();

// Fournisseur d'authentification
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setUserId(user.uid);
      } else {
        setCurrentUser(null);
        setUserId(null);
      }
      setLoading(false);
      setIsAuthReady(true); // L'état d'authentification est prêt
    });

    // Tentative de connexion avec le token personnalisé si disponible
    const signInWithCanvasToken = async () => {
      if (initialAuthToken) {
        try {
          await signInWithCustomToken(auth, initialAuthToken);
        } catch (error) {
          console.error("Erreur lors de la connexion avec le token personnalisé:", error);
          // Si le token échoue, tenter une connexion anonyme
          try {
            await signInAnonymously(auth);
          } catch (anonError) {
            console.error("Erreur lors de la connexion anonyme:", anonError);
          }
        }
      } else {
        // Si pas de token, tenter une connexion anonyme
        try {
          await signInAnonymously(auth);
        } catch (anonError) {
          console.error("Erreur lors de la connexion anonyme:", anonError);
        }
      }
    };

    if (!currentUser && !loading) { // S'assurer que nous n'avons pas déjà un utilisateur et que le chargement initial est terminé
      signInWithCanvasToken();
    }

    return () => unsubscribe();
  }, [currentUser, loading]);

  const value = {
    currentUser,
    userId,
    loading,
    isAuthReady,
    auth,
    db,
    appId // Exposer appId via le contexte si nécessaire pour les chemins Firestore
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && isAuthReady && children} {/* Rendre les enfants seulement quand l'authentification est prête */}
    </AuthContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  return useContext(AuthContext);
};
