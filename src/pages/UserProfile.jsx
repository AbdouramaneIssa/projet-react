// src/pages/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext'; // Assure-toi que ce chemin est correct

const UserProfile = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth(); // Récupérer appId du contexte
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const medicalConditions = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergies alimentaires', 'Intolérance au lactose', 'Végétarien', 'Végétalien'
  ];
  const familyRoles = ['Père', 'Mère', 'Enfant', 'Grand-parent', 'Autre membre de la famille'];

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Assurez-vous que les champs sont des tableaux pour les checkboxes
          setProfileData({
            ...data,
            medicalHistory: Array.isArray(data.medicalHistory) ? data.medicalHistory : [],
            role: Array.isArray(data.role) ? data.role : [],
          });
        } else {
          setProfileData(null);
          showNotification("Profil non trouvé. Veuillez le configurer.", "error");
          setPage('profile-setup');
        }
        setLoading(false);
      }, (error) => {
        console.error("Erreur lors du chargement du profil utilisateur:", error);
        showNotification("Erreur lors du chargement du profil.", "error");
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId, setPage, showNotification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleMedicalHistoryChange = (e) => {
    const { value, checked } = e.target;
    setProfileData(prev => {
      const currentHistory = Array.isArray(prev.medicalHistory) ? prev.medicalHistory : [];
      if (checked) {
        return { ...prev, medicalHistory: [...currentHistory, value] };
      } else {
        return { ...prev, medicalHistory: currentHistory.filter((item) => item !== value) };
      }
    });
  };

  const handleRoleChange = (e) => {
    const { value, checked } = e.target;
    setProfileData(prev => {
      const currentRoles = Array.isArray(prev.role) ? prev.role : [];
      if (checked) {
        return { ...prev, role: [...currentRoles, value] };
      } else {
        return { ...prev, role: currentRoles.filter((item) => item !== value) };
      }
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, profilePic: reader.result, profilePicType: 'b64' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !userId || !db || !appId || !profileData) return;

    try {
      const updatedData = {
        fullName: profileData.fullName,
        age: parseInt(profileData.age),
        gender: profileData.gender,
        medicalHistory: profileData.medicalHistory.includes('Autre') ? [...profileData.medicalHistory.filter(m => m !== 'Autre'), profileData.otherMedicalHistory] : profileData.medicalHistory,
        role: profileData.role.includes('Autre') ? [...profileData.role.filter(r => r !== 'Autre'), profileData.otherRole] : profileData.role,
        profilePic: profileData.profilePic,
        profilePicType: profileData.profilePicType,
        email: currentUser.email, // L'email ne doit pas être modifiable ici
        isMainUser: true,
      };
      await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid), updatedData);
      showNotification('Profil mis à jour avec succès !', 'success');
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour du profil: ${error.message}`, 'error');
      console.error("Erreur de mise à jour du profil:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-gray-700 dark:text-gray-300">Chargement du profil...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Aucun profil trouvé. Veuillez vous connecter ou le configurer.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">Mon Profil</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom complet</label>
              <input type="text" id="fullName" name="fullName" value={profileData.fullName || ''} onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" required />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Âge</label>
              <input type="number" id="age" name="age" value={profileData.age || ''} onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" required />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexe</label>
              <select id="gender" name="gender" value={profileData.gender || ''} onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" required>
                <option value="">Sélectionner</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={currentUser?.email || ''} disabled
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed" />
            </div>
          </div>

          <div className="border border-dashed border-gray-300 dark:border-gray-700 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Antécédents médicaux liés à l'alimentation</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {medicalConditions.map((condition) => (
                <div key={condition} className="flex items-center">
                  <input type="checkbox" id={`med-${condition}`} value={condition}
                    checked={profileData.medicalHistory.includes(condition)} onChange={handleMedicalHistoryChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor={`med-${condition}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{condition}</label>
                </div>
              ))}
              <div className="flex items-center">
                <input type="checkbox" id="med-other" value="Autre"
                  checked={profileData.medicalHistory.includes('Autre')} onChange={handleMedicalHistoryChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="med-other" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Autre</label>
              </div>
            </div>
            {profileData.medicalHistory.includes('Autre') && (
              <input type="text" name="otherMedicalHistory" value={profileData.otherMedicalHistory || ''} onChange={handleChange}
                className="mt-2 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Spécifiez d'autres antécédents médicaux" />
            )}
          </div>

          <div className="border border-dashed border-gray-300 dark:border-gray-700 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rôle au sein de la famille</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {familyRoles.map((roleOption) => (
                <div key={roleOption} className="flex items-center">
                  <input type="checkbox" id={`role-${roleOption}`} value={roleOption}
                    checked={profileData.role.includes(roleOption)} onChange={handleRoleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor={`role-${roleOption}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{roleOption}</label>
                </div>
              ))}
              <div className="flex items-center">
                <input type="checkbox" id="role-other" value="Autre"
                  checked={profileData.role.includes('Autre')} onChange={handleRoleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="role-other" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Autre</label>
              </div>
            </div>
            {profileData.role.includes('Autre') && (
              <input type="text" name="otherRole" value={profileData.otherRole || ''} onChange={handleChange}
                className="mt-2 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Spécifiez un autre rôle" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo de profil</label>
            <div className="flex items-center space-x-4 mb-2">
              <label className="inline-flex items-center">
                <input type="radio" name="profilePicType" value="url" checked={profileData.profilePicType === 'url'} onChange={() => setProfileData(prev => ({ ...prev, profilePicType: 'url' }))}
                  className="form-radio text-blue-600" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">URL de l'image</span>
              </label>
              <label className="inline-flex items-center">
                <input type="radio" name="profilePicType" value="b64" checked={profileData.profilePicType === 'b64'} onChange={() => setProfileData(prev => ({ ...prev, profilePicType: 'b64' }))}
                  className="form-radio text-blue-600" />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Uploader une image</span>
              </label>
            </div>
            {profileData.profilePicType === 'url' ? (
              <input type="url" name="profilePic" value={profileData.profilePic || ''} onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="URL de votre photo de profil" />
            ) : (
              <input type="file" accept="image/*" onChange={handleImageUpload}
                className="mt-1 block w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            )}
            {profileData.profilePic && (
              <div className="mt-4 flex justify-center">
                <img src={profileData.profilePic} alt="Aperçu du profil" className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 shadow-md" />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-1"
          >
            Mettre à jour le profil
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
