// src/pages/AddFamilyMember.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Calendar, Users, Heart, Camera, Upload, Check, Mail, Baby, Crown } from 'lucide-react';

const AddFamilyMember = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMember, setNewMember] = useState({
    fullName: '',
    dob: '',
    age: '',
    gender: '',
    role: [],
    otherRole: '',
    email: '',
    profilePic: '',
    profilePicType: 'url',
    medicalHistory: [],
    otherMedicalHistory: '',
  });

  const familyRoles = ['Père', 'Mère', 'Enfant', 'Grand-parent', 'Autre membre de la famille'];
  const medicalConditions = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergies alimentaires', 
    'Intolérance au lactose', 'Végétarien', 'Végétalien'
  ];

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const q = query(collection(db, `artifacts/${appId}/users/${userId}/profiles`), where("isMainUser", "!=", true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const familyMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(familyMembers);
      }, (error) => {
        console.error("Erreur lors du chargement des membres de la famille:", error);
        showNotification("Erreur lors du chargement des membres de la famille.", "error");
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const handleNewMemberChange = (e) => {
    const { name, value } = e.target;
    setNewMember(prev => ({ ...prev, [name]: value }));
  };

  const handleNewMemberDOBChange = (e) => {
    const dob = e.target.value;
    setNewMember(prev => ({ ...prev, dob }));
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setNewMember(prev => ({ ...prev, age }));
    } else {
      setNewMember(prev => ({ ...prev, age: '' }));
    }
  };

  const handleNewMemberRoleChange = (e) => {
    const { value, checked } = e.target;
    setNewMember(prev => {
      const currentRoles = prev.role || [];
      if (checked) {
        return { ...prev, role: [...currentRoles, value] };
      } else {
        return { ...prev, role: currentRoles.filter((item) => item !== value) };
      }
    });
  };

  const handleNewMemberMedicalHistoryChange = (e) => {
    const { value, checked } = e.target;
    setNewMember(prev => {
      const currentHistory = prev.medicalHistory || [];
      if (checked) {
        return { ...prev, medicalHistory: [...currentHistory, value] };
      } else {
        return { ...prev, medicalHistory: currentHistory.filter((item) => item !== value) };
      }
    });
  };

  const handleNewMemberImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMember(prev => ({ ...prev, profilePic: reader.result, profilePicType: 'b64' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!currentUser || !userId || !db || !appId) {
      showNotification("Vous n'êtes pas connecté ou Firebase n'est pas initialisé.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const memberData = {
        fullName: newMember.fullName,
        dob: newMember.dob,
        age: newMember.age,
        gender: newMember.gender,
        role: newMember.role.includes('Autre') ? [...newMember.role.filter(r => r !== 'Autre'), newMember.otherRole] : newMember.role,
        email: newMember.age < 5 ? '' : newMember.email,
        profilePic: newMember.profilePic,
        profilePicType: newMember.profilePicType,
        medicalHistory: newMember.medicalHistory.includes('Autre') ? [...newMember.medicalHistory.filter(m => m !== 'Autre'), newMember.otherMedicalHistory] : newMember.medicalHistory,
        isMainUser: false,
      };
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/profiles`), memberData);
      showNotification('Membre de la famille ajouté avec succès ! 🎉', 'success');
      
      // Réinitialiser le formulaire
      setNewMember({
        fullName: '', dob: '', age: '', gender: '', role: [], otherRole: '', email: '',
        profilePic: '', profilePicType: 'url', medicalHistory: [], otherMedicalHistory: '',
      });
    } catch (error) {
      showNotification(`Erreur lors de l'ajout du membre: ${error.message}`, 'error');
      console.error("Erreur lors de l'ajout du membre:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (roles) => {
    if (roles.includes('Père')) return <Crown className="w-4 h-4 text-blue-500" />;
    if (roles.includes('Mère')) return <Crown className="w-4 h-4 text-pink-500" />;
    if (roles.includes('Enfant')) return <Baby className="w-4 h-4 text-green-500" />;
    if (roles.includes('Grand-parent')) return <Crown className="w-4 h-4 text-purple-500" />;
    return <User className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-down">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Ajouter un membre de la famille
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Enrichissez votre famille MealBloom
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Form */}
          <div className="xl:col-span-2">
            <div className="card p-8 animate-scale-in">
              <form onSubmit={handleAddMember} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-500" />
                    Informations de base
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="memberFullName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Nom complet
                      </label>
                      <input 
                        type="text" 
                        id="memberFullName" 
                        name="fullName" 
                        value={newMember.fullName} 
                        onChange={handleNewMemberChange}
                        className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                        required 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="memberDob" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Date de naissance
                      </label>
                      <input 
                        type="date" 
                        id="memberDob" 
                        name="dob" 
                        value={newMember.dob} 
                        onChange={handleNewMemberDOBChange}
                        className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="memberAge" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Âge
                      </label>
                      <input 
                        type="number" 
                        id="memberAge" 
                        name="age" 
                        value={newMember.age} 
                        disabled
                        className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="memberGender" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Sexe
                      </label>
                      <select 
                        id="memberGender" 
                        name="gender" 
                        value={newMember.gender} 
                        onChange={handleNewMemberChange}
                        className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                        required
                      >
                        <option value="">Sélectionner</option>
                        <option value="Homme">Homme</option>
                        <option value="Femme">Femme</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="memberEmail" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Mail className="inline w-4 h-4 mr-1" />
                        Email {newMember.age < 5 && "(Optionnel pour les enfants de moins de 5 ans)"}
                      </label>
                      <input 
                        type="email" 
                        id="memberEmail" 
                        name="email" 
                        value={newMember.email} 
                        onChange={handleNewMemberChange}
                        disabled={newMember.age < 5}
                        className={`w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 ${
                          newMember.age < 5 
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                            : 'bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white'
                        }`}
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Family Role */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-500" />
                    Rôle au sein de la famille
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {familyRoles.map((roleOption) => (
                      <label key={roleOption} className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          value={roleOption}
                          checked={newMember.role.includes(roleOption)} 
                          onChange={handleNewMemberRoleChange}
                          className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{roleOption}</span>
                      </label>
                    ))}
                    <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        value="Autre"
                        checked={newMember.role.includes('Autre')} 
                        onChange={handleNewMemberRoleChange}
                        className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Autre</span>
                    </label>
                  </div>
                  {newMember.role.includes('Autre') && (
                    <input 
                      type="text" 
                      name="otherRole" 
                      value={newMember.otherRole} 
                      onChange={handleNewMemberChange}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                      placeholder="Spécifiez un autre rôle"
                    />
                  )}
                </div>

                {/* Medical History */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Heart className="w-5 h-5 mr-2 text-red-500" />
                    Antécédents médicaux
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {medicalConditions.map((condition) => (
                      <label key={condition} className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          value={condition}
                          checked={newMember.medicalHistory.includes(condition)} 
                          onChange={handleNewMemberMedicalHistoryChange}
                          className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{condition}</span>
                      </label>
                    ))}
                    <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        value="Autre"
                        checked={newMember.medicalHistory.includes('Autre')} 
                        onChange={handleNewMemberMedicalHistoryChange}
                        className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Autre</span>
                    </label>
                  </div>
                  {newMember.medicalHistory.includes('Autre') && (
                    <input 
                      type="text" 
                      name="otherMedicalHistory" 
                      value={newMember.otherMedicalHistory} 
                      onChange={handleNewMemberChange}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                      placeholder="Spécifiez d'autres antécédents médicaux"
                    />
                  )}
                </div>

                {/* Profile Picture */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-indigo-500" />
                    Photo de profil
                  </h3>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="memberProfilePicType" 
                        value="url" 
                        checked={newMember.profilePicType === 'url'} 
                        onChange={() => setNewMember(prev => ({ ...prev, profilePicType: 'url' }))}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">URL de l'image</span>
                    </label>
                    <label className="flex items-center p-3 bg-white/30 dark:bg-gray-800/30 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="memberProfilePicType" 
                        value="b64" 
                        checked={newMember.profilePicType === 'b64'} 
                        onChange={() => setNewMember(prev => ({ ...prev, profilePicType: 'b64' }))}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Uploader une image</span>
                    </label>
                  </div>
                  
                  {newMember.profilePicType === 'url' ? (
                    <input 
                      type="url" 
                      name="profilePic" 
                      value={newMember.profilePic} 
                      onChange={handleNewMemberChange}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white"
                      placeholder="URL de la photo de profil"
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
                        <input type="file" accept="image/*" onChange={handleNewMemberImageUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                  
                  {newMember.profilePic && (
                    <div className="flex justify-center">
                      <div className="relative">
                        <img 
                          src={newMember.profilePic || "/placeholder.svg"} 
                          alt="Aperçu du profil" 
                          className="w-24 h-24 rounded-full object-cover border-4 border-green-500 shadow-lg"
                        />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
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
                      <UserPlus className="w-5 h-5" />
                      <span>Ajouter ce membre</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Family Members List */}
          <div className="xl:col-span-1">
            <div className="card p-6 animate-slide-in-right">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                Membres ajoutés ({members.length})
              </h3>
              
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Aucun membre ajouté pour le moment</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300">
                      <div className="relative">
                        <img 
                          src={member.profilePic || `https://placehold.co/48x48/cccccc/000000?text=${member.fullName.charAt(0)}`}
                          alt={member.fullName} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-green-400"
                        />
                        <div className="absolute -bottom-1 -right-1">
                          {getRoleIcon(member.role)}
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{member.fullName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.age} ans • {Array.isArray(member.role) ? member.role.join(', ') : member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => setPage('dashboard')}
                className="w-full btn-primary"
              >
                Aller au tableau de bord
              </button>
              <button
                onClick={() => setPage('my-family')}
                className="w-full btn-secondary"
              >
                Voir ma famille
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFamilyMember;