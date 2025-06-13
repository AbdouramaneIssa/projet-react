import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { UserPlusIcon, InformationCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';

const MyFamily = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMemberData, setEditMemberData] = useState(null);

  const medicalConditions = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergies alimentaires', 'Intolérance au lactose', 'Végétarien', 'Végétalien'
  ];
  const familyRoles = ['Père', 'Mère', 'Enfant', 'Grand-parent', 'Autre membre de la famille'];

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const q = collection(db, `artifacts/${appId}/users/${userId}/profiles`);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFamilyMembers(members);
      }, (error) => {
        console.error("Erreur lors du chargement des membres de la famille:", error);
        showNotification("Erreur lors du chargement des membres de la famille.", "error");
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleEditMember = (member) => {
    setEditMemberData({ ...member });
    setIsEditModalOpen(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!currentUser || !userId || !db || !appId || !editMemberData) return;

    try {
      const updatedData = {
        fullName: editMemberData.fullName,
        dob: editMemberData.dob,
        age: parseInt(editMemberData.age),
        gender: editMemberData.gender,
        role: Array.isArray(editMemberData.role) ? editMemberData.role.filter(r => r !== 'Autre') : [],
        otherRole: editMemberData.role.includes('Autre') ? editMemberData.otherRole : '',
        email: editMemberData.age < 5 ? '' : editMemberData.email,
        profilePic: editMemberData.profilePic,
        profilePicType: editMemberData.profilePicType,
        medicalHistory: Array.isArray(editMemberData.medicalHistory) ? editMemberData.medicalHistory.filter(m => m !== 'Autre') : [],
        otherMedicalHistory: editMemberData.medicalHistory.includes('Autre') ? editMemberData.otherMedicalHistory : '',
        isMainUser: editMemberData.id === currentUser.uid
      };
      if (editMemberData.role.includes('Autre') && editMemberData.otherRole) {
        updatedData.role.push(editMemberData.otherRole);
      }
      if (editMemberData.medicalHistory.includes('Autre') && editMemberData.otherMedicalHistory) {
        updatedData.medicalHistory.push(editMemberData.otherMedicalHistory);
      }

      const memberDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, editMemberData.id);
      await updateDoc(memberDocRef, updatedData);
      showNotification('Membre mis à jour avec succès !', 'success');
      setIsEditModalOpen(false);
      setSelectedMember(null);
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour: ${error.message}`, 'error');
      console.error("Erreur de mise à jour:", error);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!currentUser || !userId || !db || !appId) return;
    if (memberId === currentUser.uid) {
      showNotification("Impossible de supprimer le profil de l'administrateur.", "error");
      return;
    }
    const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer ce membre ?");
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/profiles`, memberId));
        showNotification('Membre supprimé avec succès !', 'success');
        setIsModalOpen(false);
      } catch (error) {
        showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
        console.error("Erreur de suppression:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-10 text-center tracking-tight">
          Ma Famille
        </h1>

        {familyMembers.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-10 rounded-2xl shadow-xl text-center max-w-lg mx-auto">
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-6 font-medium">
              Aucun membre de la famille n'a été ajouté pour le moment.
            </p>
            <button
              onClick={() => setPage('add-family-member')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              title="Ajouter un membre"
            >
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Ajouter un membre
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden flex flex-col items-center p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-blue-200 dark:border-blue-600 mb-4 flex-shrink-0 ring-2 ring-offset-2 ring-blue-100 dark:ring-blue-500">
                  <img
                    src={member.profilePic || `https://placehold.co/128x128/cccccc/000000?text=${member.fullName.charAt(0)}`}
                    alt={member.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 text-center">
                  {member.fullName}
                </h3>
                {member.id === currentUser.uid && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white mb-2">
                    ADMINISTRATEUR
                  </span>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                  {member.age} ans • {member.gender}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
                  {Array.isArray(member.role) ? member.role.join(', ') : member.role}
                </p>
                <div className="flex justify-center space-x-4 mt-auto w-full">
                  <button
                    onClick={() => handleViewDetails(member)}
                    className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200"
                    title="Voir les détails"
                  >
                    <InformationCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleEditMember(member)}
                    className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-all duration-200"
                    title="Éditer le profil"
                  >
                    <PencilIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="p-2 bg-red-100 dark:bg-red-900 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={member.id === currentUser.uid}
                    title="Supprimer le membre"
                  >
                    <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Détails de ${selectedMember?.fullName}`}
          className="backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl max-w-lg mx-auto"
        >
          {selectedMember && (
            <div className="space-y-5 p-6 text-gray-700 dark:text-gray-200">
              <div className="flex justify-center mb-4">
                <img
                  src={selectedMember.profilePic || `https://placehold.co/150x150/cccccc/000000?text=${selectedMember.fullName.charAt(0)}`}
                  alt={selectedMember.fullName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 dark:border-blue-400"
                />
              </div>
              <p>
                <span className="font-semibold text-gray-900 dark:text-white">Nom complet :</span> {selectedMember.fullName}
              </p>
              <p>
                <span className="font-semibold text-gray-900 dark:text-white">Âge :</span> {selectedMember.age} ans
              </p>
              <p>
                <span className="font-semibold text-gray-900 dark:text-white">Sexe :</span> {selectedMember.gender}
              </p>
              <p>
                <span className="font-semibold text-gray-900 dark:text-white">Rôle :</span>{' '}
                {Array.isArray(selectedMember.role) ? selectedMember.role.join(', ') : selectedMember.role}
              </p>
              <p>
                <span className="font-semibold text-gray-900 dark:text-white">Email :</span> {selectedMember.email || 'N/A'}
              </p>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Antécédents médicaux :</span>
                <ul className="list-disc list-inside mt-2 text-sm">
                  {Array.isArray(selectedMember.medicalHistory) && selectedMember.medicalHistory.length > 0 ? (
                    selectedMember.medicalHistory.map((history, index) => (
                      <li key={index} className="text-gray-600 dark:text-gray-300">
                        {history}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-600 dark:text-gray-300">Aucun</li>
                  )}
                </ul>
              </div>
              {selectedMember.id === currentUser.uid && (
                <p>
                  <span className="font-semibold text-gray-900 dark:text-white">Statut :</span> ADMINISTRATEUR
                </p>
              )}
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Éditer ${editMemberData?.fullName}`}
          className="backdrop-blur-lg bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl max-w-2xl mx-auto"
        >
          {editMemberData && (
            <form onSubmit={handleUpdateMember} className="space-y-6 p-6">
              <div>
                <label htmlFor="editFullName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  id="editFullName"
                  name="fullName"
                  value={editMemberData.fullName}
                  onChange={(e) => setEditMemberData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="editDob" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  id="editDob"
                  name="dob"
                  value={editMemberData.dob}
                  onChange={(e) => {
                    const dob = e.target.value;
                    const birthDate = new Date(dob);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                      age--;
                    }
                    setEditMemberData(prev => ({ ...prev, dob, age }));
                  }}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="editGender" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Sexe
                </label>
                <select
                  id="editGender"
                  name="gender"
                  value={editMemberData.gender}
                  onChange={(e) => setEditMemberData(prev => ({ ...prev, gender: e.target.value }))}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                  required
                >
                  <option value="">Sélectionner</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="editEmail"
                  name="email"
                  value={editMemberData.email}
                  onChange={(e) => setEditMemberData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={editMemberData.age < 5 || editMemberData.id === currentUser.uid}
                  className={`mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm ${
                    editMemberData.age < 5 || editMemberData.id === currentUser.uid
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white'
                  } transition-all duration-200`}
                  placeholder="email@exemple.com"
                />
              </div>

              <div className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Rôle au sein de la famille
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['Père', 'Mère', 'Enfant', 'Grand-parent', 'Autre membre de la famille', 'Autre'].map((roleOption) => (
                    <div key={roleOption} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`edit-role-${roleOption}`}
                        value={roleOption}
                        checked={Array.isArray(editMemberData.role) && editMemberData.role.includes(roleOption)}
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setEditMemberData(prev => {
                            const currentRoles = Array.isArray(prev.role) ? prev.role : [];
                            if (checked) {
                              return { ...prev, role: [...currentRoles, value] };
                            } else {
                              return { ...prev, role: currentRoles.filter((item) => item !== value) };
                            }
                          });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`edit-role-${roleOption}`}
                        className="ml-2 text-sm text-gray-700 dark:text-gray-200"
                      >
                        {roleOption}
                      </label>
                    </div>
                  ))}
                </div>
                {Array.isArray(editMemberData.role) && editMemberData.role.includes('Autre') && (
                  <input
                    type="text"
                    name="otherRole"
                    value={editMemberData.otherRole || ''}
                    onChange={(e) => setEditMemberData(prev => ({ ...prev, otherRole: e.target.value }))}
                    className="mt-3 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Spécifiez un autre rôle"
                  />
                )}
              </div>

              <div className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Antécédents médicaux
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergies alimentaires', 'Intolérance au lactose', 'Végétarien', 'Végétalien', 'Autre'].map((condition) => (
                    <div key={condition} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`edit-med-${condition}`}
                        value={condition}
                        checked={Array.isArray(editMemberData.medicalHistory) && editMemberData.medicalHistory.includes(condition)}
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setEditMemberData(prev => {
                            const currentHistory = Array.isArray(prev.medicalHistory) ? prev.medicalHistory : [];
                            if (checked) {
                              return { ...prev, medicalHistory: [...currentHistory, value] };
                            } else {
                              return { ...prev, medicalHistory: currentHistory.filter((item) => item !== value) };
                            }
                          });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`edit-med-${condition}`}
                        className="ml-2 text-sm text-gray-700 dark:text-gray-200"
                      >
                        {condition}
                      </label>
                    </div>
                  ))}
                </div>
                {Array.isArray(editMemberData.medicalHistory) && editMemberData.medicalHistory.includes('Autre') && (
                  <input
                    type="text"
                    name="otherMedicalHistory"
                    value={editMemberData.otherMedicalHistory || ''}
                    onChange={(e) => setEditMemberData(prev => ({ ...prev, otherMedicalHistory: e.target.value }))}
                    className="mt-3 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Spécifiez d'autres antécédents médicaux"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Photo de profil
                </label>
                <div className="flex items-center space-x-6 mb-3">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="editProfilePicType"
                      value="url"
                      checked={editMemberData.profilePicType === 'url'}
                      onChange={() => setEditMemberData(prev => ({ ...prev, profilePicType: 'url' }))}
                      className="form-radio h-4 w-4 text-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-200">URL de l'image</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="editProfilePicType"
                      value="b64"
                      checked={editMemberData.profilePicType === 'b64'}
                      onChange={() => setEditMemberData(prev => ({ ...prev, profilePicType: 'b64' }))}
                      className="form-radio h-4 w-4 text-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900 dark:text-gray-200">Uploader une image</span>
                  </label>
                </div>
                {editMemberData.profilePicType === 'url' ? (
                  <input
                    type="url"
                    name="profilePic"
                    value={editMemberData.profilePic}
                    onChange={(e) => setEditMemberData(prev => ({ ...editMemberData, profilePic: e.target.value }))}
                    className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="URL de l'image"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setEditMemberData(prev => ({ ...prev, profilePic: reader.result, profilePicType: 'b64' }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="mt-1 block w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file-bg-blue-100 dark:hover:file-bg-blue-800"
                  />
                )}
                {editMemberData.profilePic && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={editMemberData.profilePic}
                      alt="Aperçu du profil"
                      className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sauvegarder les modifications
              </button>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default MyFamily;