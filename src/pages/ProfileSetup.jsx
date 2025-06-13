// src/pages/ProfileSetup.jsx
import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { User, Calendar, Users, Heart, Camera, Upload, Check } from 'lucide-react';

const ProfileSetup = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [otherMedicalHistory, setOtherMedicalHistory] = useState('');
  const [role, setRole] = useState([]);
  const [otherRole, setOtherRole] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [profilePicType, setProfilePicType] = useState('url');
  const [isLoading, setIsLoading] = useState(false);

  const medicalConditions = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergies alimentaires', 
    'Intolérance au lactose', 'Végétarien', 'Végétalien'
  ];
  const familyRoles = ['Père', 'Mère', 'Enfant', 'Grand-parent', 'Autre membre de la famille'];

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const fetchProfile = async () => {
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.fullName || '');
          setAge(data.age || '');
          setGender(data.gender || '');
          setMedicalHistory(data.medicalHistory || []);
          setOtherMedicalHistory(data.otherMedicalHistory || '');
          setRole(data.role || []);
          setOtherRole(data.otherRole || '');
          setProfilePic(data.profilePic || '');
          setProfilePicType(data.profilePicType || 'url');
        }
      };
      fetchProfile();
    }
  }, [currentUser, userId, db, appId]);

  const handleMedicalHistoryChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setMedicalHistory([...medicalHistory, value]);
    } else {
      setMedicalHistory(medicalHistory.filter((item) => item !== value));
    }
  };

  const handleRoleChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setRole([...role, value]);
    } else {
      setRole(role.filter((item) => item !== value));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        setProfilePicType('b64');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !userId || !db || !appId) {
      showNotification("Vous n'êtes pas connecté ou Firebase n'est pas initialisé.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const profileData = {
        fullName,
        age: parseInt(age),
        gender,
        medicalHistory: medicalHistory.includes('Autre') ? [...medicalHistory.filter(m => m !== 'Autre'), otherMedicalHistory] : medicalHistory,
        role: role.includes('Autre') ? [...role.filter(r => r !== 'Autre'), otherRole] : role,
        email: currentUser.email,
        profilePic,
        profilePicType,
        isMainUser: true,
      };
      await setDoc(doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid), profileData);
      showNotification('Profil configuré avec succès ! 🎉', 'success');
      setPage('add-family-member');
    } catch (error) {
      showNotification(`Erreur lors de la configuration du profil: ${error.message}`, 'error');
      console.error("Erreur lors de la configuration du profil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-400 via-primary-500 to-secondary-400 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-4 animate-bounce-gentle">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Configurez votre profil</h1>
          <p className="text-white/80 text-lg">Personnalisez votre expérience MealBloom</p>
        </div>

        {/* Form */}
        <div className="card-gradient p-8 animate-scale-in">
          <form onSubmit={handleProfileSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <User className="inline w-4 h-4 mr-2" />
                  Nom complet
                </label>
                <input 
                  type="text" 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="age" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Âge
                </label>
                <input 
                  type="number" 
                  id="age" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  required 
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Users className="inline w-4 h-4 mr-2" />
                  Sexe
                </label>
                <select 
                  id="gender" 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Sélectionner</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input 
                  type="email" 
                  value={currentUser?.email || ''} 
                  disabled
                  className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Medical History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                Antécédents médicaux liés à l'alimentation
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {medicalConditions.map((condition) => (
                  <label key={condition} className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      value={condition}
                      checked={medicalHistory.includes(condition)} 
                      onChange={handleMedicalHistoryChange}
                      className="w-4 h-4 text-accent-600 bg-white border-gray-300 rounded focus:ring-accent-500 focus:ring-2"
                    />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{condition}</span>
                  </label>
                ))}
                <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    value="Autre"
                    checked={medicalHistory.includes('Autre')} 
                    onChange={handleMedicalHistoryChange}
                    className="w-4 h-4 text-accent-600 bg-white border-gray-300 rounded focus:ring-accent-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Autre</span>
                </label>
              </div>
              {medicalHistory.includes('Autre') && (
                <input 
                  type="text" 
                  value={otherMedicalHistory} 
                  onChange={(e) => setOtherMedicalHistory(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  placeholder="Spécifiez d'autres antécédents médicaux"
                />
              )}
            </div>

            {/* Family Role */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Rôle au sein de la famille
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {familyRoles.map((roleOption) => (
                  <label key={roleOption} className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      value={roleOption}
                      checked={role.includes(roleOption)} 
                      onChange={handleRoleChange}
                      className="w-4 h-4 text-accent-600 bg-white border-gray-300 rounded focus:ring-accent-500 focus:ring-2"
                    />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{roleOption}</span>
                  </label>
                ))}
                <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    value="Autre"
                    checked={role.includes('Autre')} 
                    onChange={handleRoleChange}
                    className="w-4 h-4 text-accent-600 bg-white border-gray-300 rounded focus:ring-accent-500 focus:ring-2"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Autre</span>
                </label>
              </div>
              {role.includes('Autre') && (
                <input 
                  type="text" 
                  value={otherRole} 
                  onChange={(e) => setOtherRole(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  placeholder="Spécifiez un autre rôle"
                />
              )}
            </div>

            {/* Profile Picture */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <Camera className="w-5 h-5 mr-2 text-purple-500" />
                Photo de profil
              </h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="profilePicType" 
                    value="url" 
                    checked={profilePicType === 'url'} 
                    onChange={() => setProfilePicType('url')}
                    className="w-4 h-4 text-accent-600"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">URL de l'image</span>
                </label>
                <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="profilePicType" 
                    value="b64" 
                    checked={profilePicType === 'b64'} 
                    onChange={() => setProfilePicType('b64')}
                    className="w-4 h-4 text-accent-600"
                  />
                  <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Uploader une image</span>
                </label>
              </div>
              
              {profilePicType === 'url' ? (
                <input 
                  type="url" 
                  value={profilePic} 
                  onChange={(e) => setProfilePic(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                  placeholder="URL de votre photo de profil"
                />
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Cliquez pour uploader</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG ou JPEG</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              )}
              
              {profilePic && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img 
                      src={profilePic || "/placeholder.svg"} 
                      alt="Aperçu du profil" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-accent-500 shadow-lg"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-accent flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sauvegarder le profil</span>
                  <Check className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;