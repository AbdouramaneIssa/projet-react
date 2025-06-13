import React, { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight, Chrome, Store, User, Calendar, Phone, FileText, Image } from 'lucide-react';

const VendorRegister = ({ setPage, showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { auth, db, appId, currentUser } = useAuth();

  const productCategories = [
    'Fruits et Légumes',
    'Viandes et Poissons',
    'Produits Laitiers',
    'Épicerie',
    'Boulangerie',
    'Produits Bio',
    'Boissons',
    'Surgelés'
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicFile(reader.result);
        setProfilePicUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryChange = (category) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showNotification('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (password.length < 6) {
      showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }

    if (!fullName || !birthDate || !phoneNumber || categories.length === 0) {
      showNotification('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, `artifacts/${appId}/vendors/${user.uid}/profiles`, user.uid), {
        fullName,
        birthDate,
        email,
        phoneNumber,
        categories,
        description,
        profilePic: profilePicFile || profilePicUrl || 'https://placehold.co/200x200/cccccc/000000?text=V',
        role: 'vendor',
        createdAt: new Date().toISOString()
      });

      showNotification('Inscription vendeur réussie ! Bienvenue ✨', 'success');
      setPage('vendor-dashboard');
    } catch (error) {
      showNotification(`Erreur d'inscription: ${error.message}`, 'error');
      console.error("Erreur d'inscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      setPage('vendor-profile-setup');
    } catch (error) {
      showNotification(`Erreur d'inscription Google: ${error.message}`, 'error');
      console.error("Erreur d'inscription Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-400 via-primary-500 to-accent-400 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-4 animate-bounce-gentle">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Rejoignez MealBloom Vendeur</h1>
          <p className="text-white/80 text-lg">Créez votre compte vendeur</p>
        </div>

        <div className="card-gradient p-8 animate-scale-in">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
            Inscription Vendeur
          </h2>
          
          <form onSubmit={handleEmailRegister} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="Votre nom complet"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="birthDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Date de naissance
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  id="birthDate"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

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
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="votre.email@exemple.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="+33 123 456 789"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Catégories de produits
              </label>
              <div className="grid grid-cols-2 gap-2">
                {productCategories.map((category) => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Description (facultatif)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="Décrivez votre entreprise..."
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="profilePicUrl" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                URL de la photo de profil (facultatif)
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="url"
                  id="profilePicUrl"
                  value={profilePicUrl}
                  onChange={(e) => {
                    setProfilePicUrl(e.target.value);
                    setProfilePicFile(null);
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="profilePicFile" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ou téléchargez une photo de profil
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="file"
                  id="profilePicFile"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
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
                  className="w-full pl-12 pr-12 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
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

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Créer mon compte vendeur</span>
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
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-md transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Chrome className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-semibold">Google</span>
            </button>
          </div>

          <div className="mt-8 flex justify-between">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Déjà un compte ?{' '}
              <button 
                onClick={() => setPage('vendor-login')} 
                className="font-semibold text-secondary-600 hover:text-secondary-500 transition-colors"
              >
                Se connecter
              </button>
            </p>
            <p className="text-center text-gray-600 dark:text-gray-400">
              Client ?{' '}
              <button 
                onClick={() => setPage('register')} 
                className="font-semibold text-secondary-600 hover:text-secondary-500 transition-colors"
              >
                Inscription Client
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;