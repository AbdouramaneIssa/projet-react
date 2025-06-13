import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, Chrome, Store } from 'lucide-react';

const VendorLogin = ({ setPage, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { auth } = useAuth();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification('Connexion vendeur réussie ! Bienvenue sur MealBloom ✨', 'success');
      setPage('vendor-dashboard');
    } catch (error) {
      showNotification(`Erreur de connexion: ${error.message}`, 'error');
      console.error("Erreur de connexion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
      await signInWithPopup(auth, provider);
      showNotification('Connexion Google vendeur réussie ! Bienvenue ✨', 'success');
      setPage('vendor-profile-setup');
    } catch (error) {
      showNotification(`Erreur de connexion Google: ${error.message}`, 'error');
      console.error("Erreur de connexion Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-400 via-secondary-500 to-accent-400 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-4 animate-bounce-gentle">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">MealBloom Vendeur</h1>
          <p className="text-white/80 text-lg">Connectez-vous à votre espace vendeur</p>
        </div>

        <div className="card-gradient p-8 animate-scale-in">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
            Connexion Vendeur
          </h2>
          
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="votre.email@exemple.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Ou continuer avec</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-md transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Chrome className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-semibold">Google</span>
            </button>
          </div>

          <div className="mt-8 flex justify-between">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Pas encore de compte ?{' '}
              <button 
                onClick={() => setPage('vendor-register')} 
                className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
              >
                S'inscrire
              </button>
            </p>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Client ?{' '}
              <button 
                onClick={() => setPage('login')} 
                className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
              >
                Connexion Client
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLogin;