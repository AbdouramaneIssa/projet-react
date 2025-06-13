import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { User, Calendar, Mail, Phone, FileText, Image } from 'lucide-react';
import NavbarVendor from '../components/NavbarVendor';

const VendorProfile = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [vendorProfile, setVendorProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    email: '',
    phoneNumber: '',
    categories: [],
    description: '',
    profilePic: ''
  });
  const [profilePicFile, setProfilePicFile] = useState(null);

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

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const vendorDocRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, currentUser.uid);
      getDoc(vendorDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setVendorProfile(data);
          setFormData(data);
        } else {
          setPage('vendor-profile-setup');
        }
      }).catch((error) => {
        console.error("Erreur lors du chargement du profil vendeur:", error);
        showNotification("Erreur lors du chargement du profil vendeur.", "error");
      });
    }
  }, [currentUser, userId, db, appId, setPage, showNotification]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicFile(reader.result);
        setFormData({ ...formData, profilePic: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryChange = (category) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.categories.length === 0) {
      showNotification('Veuillez sélectionner au moins une catégorie', 'error');
      return;
    }

    try {
      const vendorDocRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, currentUser.uid);
      await updateDoc(vendorDocRef, formData);
      showNotification('Profil mis à jour avec succès !', 'success');
      setIsEditing(false);
      setVendorProfile(formData);
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour du profil: ${error.message}`, 'error');
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  if (!vendorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-2xl font-semibold text-gray-700 dark:text-gray-300">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <NavbarVendor setPage={setPage} showNotification={showNotification} />
      <div className="flex-1 p-8 mt-16">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Mon Profil Vendeur</h1>
        <div className="card p-6 max-w-2xl mx-auto">
          <div className="flex items-center space-x-6 mb-6">
            <img
              src={vendorProfile.profilePic}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-primary-500"
            />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{vendorProfile.fullName}</h2>
              <p className="text-gray-600 dark:text-gray-300">Vendeur</p>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
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
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
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
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
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
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
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
                        checked={formData.categories.includes(category)}
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
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="profilePicFile" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Photo de profil
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

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nom complet</p>
                <p className="text-gray-600 dark:text-gray-400">{vendorProfile.fullName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date de naissance</p>
                <p className="text-gray-600 dark:text-gray-400">{vendorProfile.birthDate}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</p>
                <p className="text-gray-600 dark:text-gray-400">{vendorProfile.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Téléphone</p>
                <p className="text-gray-600 dark:text-gray-400">{vendorProfile.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Catégories</p>
                <p className="text-gray-600 dark:text-gray-400">{vendorProfile.categories.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</p>
                <p className="text-gray-600 dark:text-gray-400">{vendorProfile.description || 'Aucune description'}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full btn-primary"
              >
                Modifier le profil
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;