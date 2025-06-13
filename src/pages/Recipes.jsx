// src/pages/Recipes.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { useNotifications } from '../hooks/useNotifications';
import Notification from '../components/Notification';
import { Plus, Edit, Trash2, Eye, Heart, MessageSquare, Save, Upload, Download, X, Search, Filter, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Import useAuth for appId

const Recipes = () => {
  const { currentUser, db, appId } = useAuth(); // Use AuthContext for db and appId
  const { notify } = useNotifications();
  const storage = getStorage();
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'public'
  const [recipes, setRecipes] = useState([]);
  const [publicRecipes, setPublicRecipes] = useState([]);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [formType, setFormType] = useState('add'); // 'add' or 'edit'
  const [currentCommentText, setCurrentCommentText] = useState('');
  const [notifications, setNotifications] = useState([]); // State for notifications

  // Form states
  const [recipeName, setRecipeName] = useState('');
  const [recipeAltNames, setRecipeAltNames] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [ingredients, setIngredients] = useState([]); // { name, quantity, unit, price }
  const [currentIngredientName, setCurrentIngredientName] = useState('');
  const [currentIngredientQuantity, setCurrentIngredientQuantity] = useState('');
  const [currentIngredientUnit, setCurrentIngredientUnit] = useState('');
  const [currentIngredientPrice, setCurrentIngredientPrice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isHalal, setIsHalal] = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [imageType, setImageType] = useState('url'); // 'url' or 'file'
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [isComposite, setIsComposite] = useState(false);
  const [selectedCompositeDishes, setSelectedCompositeDishes] = useState([]); // IDs of dishes

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByCategory, setSortByCategory] = useState('');

  // Multi-select for export
  const [selectedRecipesForExport, setSelectedRecipesForExport] = useState([]);

  // Import animation
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef(null); // Ref for file input clearing

  // New state for generating steps
  const [showGenerateStepsModal, setShowGenerateStepsModal] = useState(false);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [generatedSteps, setGeneratedSteps] = useState('');
  const [selectedRecipeForGeneration, setSelectedRecipeForGeneration] = useState(null);

  // Function to show notifications
  const showNotification = (message, type = 'info') => {
    const id = Date.now(); // Unique ID for each notification
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  // Function to close a specific notification
  const handleCloseNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  useEffect(() => {
    if (currentUser && db && appId) {
      fetchPersonalRecipes();
      fetchPublicRecipes();
    }
  }, [currentUser, db, appId]);

  // Utility to upload file to Firebase Storage and get URL
  const uploadImage = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `recipes/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const fetchPersonalRecipes = async () => {
    if (!currentUser || !db || !appId) return;
    try {
      // Fetch from 'recipes' collection
      const q1 = query(collection(db, 'recipes'), where('userId', '==', currentUser.uid));
      const querySnapshot1 = await getDocs(q1);
      const recipesFromMain = querySnapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch from user-specific collection
      const q2 = query(collection(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`));
      const querySnapshot2 = await getDocs(q2);
      const recipesFromUser = querySnapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Combine and deduplicate recipes (by id or originalPublicRecipeId)
      const allRecipes = [...recipesFromMain, ...recipesFromUser];
      const uniqueRecipes = Array.from(
        new Map(allRecipes.map(r => [r.id || r.originalPublicRecipeId, r])).values()
      );
      setRecipes(uniqueRecipes);
    } catch (error) {
      console.error("Error fetching personal recipes:", error);
      showNotification('Échec du chargement des recettes personnelles.', 'error');
    }
  };

  const fetchPublicRecipes = async () => {
    try {
      const q = query(collection(db, 'recipes'), where('isPublic', '==', true));
      const querySnapshot = await getDocs(q);
      const publicRecipesData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const recipeData = { id: doc.id, ...doc.data() };
          // Fetch comments from sub-collection
          const commentsQuery = query(collection(db, `recipes/${doc.id}/comments`));
          const commentsSnapshot = await getDocs(commentsQuery);
          const comments = commentsSnapshot.docs.map(commentDoc => ({
            id: commentDoc.id,
            ...commentDoc.data(),
          }));
          return { ...recipeData, comments };
        })
      );
      setPublicRecipes(publicRecipesData);
    } catch (error) {
      console.error("Error fetching public recipes:", error);
      showNotification('Échec du chargement des recettes publiques.', 'error');
    }
  };

  const resetForm = () => {
    setRecipeName('');
    setRecipeAltNames('');
    setRecipeDescription('');
    setIngredients([]);
    setCurrentIngredientName('');
    setCurrentIngredientQuantity('');
    setCurrentIngredientUnit('');
    setCurrentIngredientPrice('');
    setInstructions('');
    setIsHalal(false);
    setIsVegetarian(false);
    setIsVegan(false);
    setImageType('url');
    setImageUrl('');
    setImageFile(null);
    setCategory('');
    setOtherCategory('');
    setIsComposite(false);
    setSelectedCompositeDishes([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear file input
    }
  };

  const handleAddEditClick = (recipe = null) => {
    resetForm();
    if (recipe) {
      setFormType('edit');
      setCurrentRecipe(recipe);
      setRecipeName(recipe.name || '');
      setRecipeAltNames(recipe.altNames ? recipe.altNames.join(', ') : '');
      setRecipeDescription(recipe.description || '');
      setIngredients(recipe.ingredients || []);
      setInstructions(recipe.instructions ? recipe.instructions.join('\n') : '');
      setIsHalal(recipe.isHalal || false);
      setIsVegetarian(recipe.isVegetarian || false);
      setIsVegan(recipe.isVegan || false);
      if (recipe.image?.startsWith('http')) {
        setImageType('url');
        setImageUrl(recipe.image);
      } else {
        setImageType('file');
        setImageUrl(recipe.image || '');
        setImageFile(null);
      }
      setCategory(recipe.category || '');
      if (recipe.category === 'Autres' && recipe.otherCategory) {
        setOtherCategory(recipe.otherCategory);
      }
      setIsComposite(recipe.isComposite || false);
      setSelectedCompositeDishes(recipe.compositeDishes || []);
    } else {
      setFormType('add');
      setCurrentRecipe(null);
    }
    setShowAddEditModal(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file)); // For preview
    }
  };

  const handleAddIngredient = () => {
    if (currentIngredientName.trim()) {
      setIngredients([
        ...ingredients,
        {
          name: currentIngredientName.trim(),
          quantity: parseFloat(currentIngredientQuantity) || 0,
          unit: currentIngredientUnit,
          price: parseFloat(currentIngredientPrice) || null,
        },
      ]);
      setCurrentIngredientName('');
      setCurrentIngredientQuantity('');
      setCurrentIngredientUnit('');
      setCurrentIngredientPrice('');
    }
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const handleSubmitRecipe = async (e) => {
    e.preventDefault();

    if (!currentUser || !db || !appId) {
      showNotification('Vous devez être connecté pour ajouter/modifier des recettes.', 'error');
      return;
    }

    try {
      let finalImageUrl = imageUrl;
      if (imageType === 'file' && imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const recipeData = {
        name: recipeName,
        altNames: recipeAltNames.split(',').map(name => name.trim()).filter(Boolean),
        description: recipeDescription,
        ingredients: ingredients,
        instructions: instructions.split('\n').filter(Boolean),
        isHalal,
        isVegetarian,
        isVegan,
        image: finalImageUrl,
        category: category,
        otherCategory: category === 'Autres' ? otherCategory : '',
        userId: currentUser.uid,
        updatedAt: new Date(),
      };

      if (formType === 'add') {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`), recipeData);
        notify(
          'Nouvelle recette ajoutée',
          `La recette "${recipeName}" a été ajoutée avec succès`,
          'success'
        );
      } else if (formType === 'edit' && currentRecipe) {
        await updateDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`, currentRecipe.id), recipeData);
        notify(
          'Recette mise à jour',
          `La recette "${recipeName}" a été mise à jour avec succès`,
          'success'
        );
      }

      setShowAddEditModal(false);
      resetForm();
      fetchPersonalRecipes();
    } catch (error) {
      console.error("Error submitting recipe:", error);
      showNotification('Erreur lors de la sauvegarde de la recette.', 'error');
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) return;

    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`, recipeId));
      notify(
        'Recette supprimée',
        'La recette a été supprimée avec succès',
        'warning'
      );
      fetchPersonalRecipes();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      showNotification('Erreur lors de la suppression de la recette.', 'error');
    }
  };

  const handleMakePublic = async (recipeId, isCurrentlyPublic) => {
    try {
      const recipeRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`, recipeId);
      await updateDoc(recipeRef, {
        isPublic: !isCurrentlyPublic
      });
      notify(
        'Statut de la recette modifié',
        `La recette est maintenant ${!isCurrentlyPublic ? 'publique' : 'privée'}`,
        'info'
      );
      fetchPersonalRecipes();
      fetchPublicRecipes();
    } catch (error) {
      console.error("Error updating recipe visibility:", error);
      showNotification('Erreur lors de la modification de la visibilité de la recette.', 'error');
    }
  };

  const handleViewDetails = (recipe) => {
    setCurrentRecipe(recipe);
    setShowDetailModal(true);
  };

  const handleLikeRecipe = async (recipeId, currentLikes) => {
    if (!currentUser) {
      showNotification('Vous devez être connecté pour aimer une recette.', 'error');
      return;
    }

    try {
      const recipeRef = doc(db, `artifacts/${appId}/recipes`, recipeId);
      const hasLiked = currentLikes?.includes(currentUser.uid);

      await updateDoc(recipeRef, {
        likes: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });

      notify(
        'Recette aimée',
        hasLiked ? 'Vous n\'aimez plus cette recette' : 'Vous aimez maintenant cette recette',
        'info'
      );
      fetchPublicRecipes();
    } catch (error) {
      console.error("Error updating recipe likes:", error);
      showNotification('Erreur lors de la mise à jour des likes.', 'error');
    }
  };

  const handleAddComment = async (recipeId, commentText) => {
    if (!currentUser || !commentText.trim()) {
      showNotification('Vous devez être connecté et écrire un commentaire.', 'error');
      return;
    }

    try {
      const commentData = {
        userId: currentUser.uid,
        text: commentText.trim(),
        createdAt: new Date(),
        userDisplayName: currentUser.displayName || 'Utilisateur anonyme'
      };

      await addDoc(collection(db, `artifacts/${appId}/recipes/${recipeId}/comments`), commentData);
      notify(
        'Commentaire ajouté',
        'Votre commentaire a été ajouté avec succès',
        'success'
      );
      setCurrentCommentText('');
      fetchPublicRecipes();
    } catch (error) {
      console.error("Error adding comment:", error);
      showNotification('Erreur lors de l\'ajout du commentaire.', 'error');
    }
  };

  const handleSaveRecipe = async (recipe) => {
    if (!currentUser) {
      showNotification('Vous devez être connecté pour sauvegarder une recette.', 'error');
      return;
    }

    try {
      const savedRecipe = {
        ...recipe,
        originalPublicRecipeId: recipe.id,
        savedAt: new Date(),
      };
      delete savedRecipe.id;

      await addDoc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`), savedRecipe);
      notify(
        'Recette sauvegardée',
        `La recette "${recipe.name}" a été sauvegardée dans vos recettes`,
        'success'
      );
      fetchPersonalRecipes();
    } catch (error) {
      console.error("Error saving recipe:", error);
      showNotification('Erreur lors de la sauvegarde de la recette.', 'error');
    }
  };

  const filteredPersonalRecipes = recipes
    .filter(recipe => {
      if (!recipe) return false;
      const searchLower = searchQuery.toLowerCase();
      return (
        recipe.name?.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        (recipe.altNames && recipe.altNames.some(name => name.toLowerCase().includes(searchLower))) ||
        (recipe.instructions && recipe.instructions.some(inst => inst.toLowerCase().includes(searchLower))) ||
        (recipe.category && recipe.category.toLowerCase().includes(searchLower))
      );
    })
    .filter(recipe => sortByCategory === '' || recipe.category === sortByCategory);

  const filteredPublicRecipes = publicRecipes
    .filter(recipe => {
      if (!recipe) return false;
      const searchLower = searchQuery.toLowerCase();
      return (
        recipe.name?.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        (recipe.altNames && recipe.altNames.some(name => name.toLowerCase().includes(searchLower))) ||
        (recipe.instructions && recipe.instructions.some(inst => inst.toLowerCase().includes(searchLower))) ||
        (recipe.category && recipe.category.toLowerCase().includes(searchLower))
      );
    })
    .filter(recipe => sortByCategory === '' || recipe.category === sortByCategory);

  const handleExportRecipes = () => {
    if (selectedRecipesForExport.length === 0) {
      showNotification('Veuillez sélectionner au moins une recette à exporter.', 'warning');
      return;
    }
    const recipesToExport = recipes
      .filter(recipe => selectedRecipesForExport.includes(recipe.id))
      .map(({ id, userId, isPublic, likes, comments, createdAt, isNewImported, mainRecipeId, ...rest }) => ({
        ...rest,
        isPublic: false,
        isNewImported: true,
      }));

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipesToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "recipes.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setSelectedRecipesForExport([]);
    showNotification('Recettes exportées avec succès !', 'success');
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setImporting(true);
          const importedRecipes = JSON.parse(e.target.result);
          if (!Array.isArray(importedRecipes)) {
            throw new Error("Format JSON invalide. Un tableau de recettes est attendu.");
          }

          for (const recipe of importedRecipes) {
            const recipeToSave = {
              ...recipe,
              userId: currentUser.uid,
              isPublic: false,
              isNewImported: true,
              createdAt: new Date().toISOString(),
            };
            // Save to 'recipes' collection
            const mainDocRef = await addDoc(collection(db, 'recipes'), recipeToSave);
            // Save to user-specific collection
            await addDoc(collection(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`), {
              ...recipeToSave,
              mainRecipeId: mainDocRef.id,
            });
          }
          showNotification('Recettes importées avec succès !', 'success');
          fetchPersonalRecipes();
          setShowImportModal(false);
        } catch (error) {
          console.error("Erreur lors de l'importation des recettes :", error);
          showNotification(`Échec de l'importation des recettes : ${error.message}`, 'error');
        } finally {
          setImporting(false);
          event.target.value = '';
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSelectRecipeForExport = (recipeId) => {
    setSelectedRecipesForExport(prev =>
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  const handleSelectAllForExport = () => {
    if (selectedRecipesForExport.length === recipes.length) {
      setSelectedRecipesForExport([]);
    } else {
      setSelectedRecipesForExport(recipes.map(r => r.id));
    }
  };

  const handleViewRecipeClick = async (recipeId) => {
    try {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && recipe.isNewImported) {
        // Update in 'recipes' collection
        await updateDoc(doc(db, 'recipes', recipeId), { isNewImported: false });
        // Update in user-specific collection
        const userRecipesQuery = query(
          collection(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`),
          where('mainRecipeId', '==', recipeId)
        );
        const userRecipesSnapshot = await getDocs(userRecipesQuery);
        userRecipesSnapshot.forEach(async (userDoc) => {
          await updateDoc(doc(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`, userDoc.id), {
            isNewImported: false,
          });
        });
        setRecipes(prevRecipes =>
          prevRecipes.map(r => (r.id === recipeId ? { ...r, isNewImported: false } : r))
        );
        setCurrentRecipe(prev => (prev && prev.id === recipeId ? { ...prev, isNewImported: false } : prev));
      }
      handleViewDetails(recipe);
    } catch (error) {
      console.error("Erreur lors du marquage de la recette comme vue :", error);
      showNotification('Échec du marquage de la recette comme vue.', 'error');
    }
  };

  const handleCompositeDishSelection = (dishId) => {
    setSelectedCompositeDishes(prev =>
      prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId]
    );
  };

  const handleGenerateStepsForRecipe = async (recipe) => {
    setSelectedRecipeForGeneration(recipe);
    setShowGenerateStepsModal(true);
    setIsGeneratingSteps(true);
    setGeneratedSteps('');

    try {
      const response = await fetch('https://backend-react-1-67hk.onrender.com/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            name: recipe.name,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate steps');
      }

      const data = await response.json();
      setGeneratedSteps(data.steps);
    } catch (error) {
      console.error('Error generating steps:', error);
      showNotification('Erreur lors de la génération des étapes', 'error');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const handleUseGeneratedSteps = async () => {
    if (!selectedRecipeForGeneration) return;

    try {
      const recipeRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/recipes`, selectedRecipeForGeneration.id);
      await updateDoc(recipeRef, {
        instructions: generatedSteps.split('\n')
      });

      // Mettre à jour l'état local
      setRecipes(recipes.map(recipe =>
        recipe.id === selectedRecipeForGeneration.id
          ? { ...recipe, instructions: generatedSteps.split('\n') }
          : recipe
      ));

      showNotification('Étapes de préparation mises à jour avec succès !', 'success');
      setShowGenerateStepsModal(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des étapes:', error);
      showNotification('Erreur lors de la mise à jour des étapes.', 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 dark:bg-gray-900 dark:text-white min-h-screen">
      {/* Notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => handleCloseNotification(notification.id)}
        />
      ))}

      <h1 className="text-4xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200 animate-pulse">
        Gérer Mes Plats
      </h1>

      {/* Tabs */}
      <div className="flex justify-center mb-8 space-x-4">
        <button
          className={`flex items-center px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${activeTab === 'personal'
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          onClick={() => setActiveTab('personal')}
        >
          <Eye className="w-5 h-5 mr-2" />
          Mes Plats Personnels
        </button>
        <button
          className={`flex items-center px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${activeTab === 'public'
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          onClick={() => setActiveTab('public')}
        >
          <Heart className="w-5 h-5 mr-2" />
          Plats Publics
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl flex flex-col md:flex-row gap-4 items-center transform transition-all duration-300 hover:shadow-2xl">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un plat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
          />
        </div>
        <div className="relative w-full md:w-auto">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={sortByCategory}
            onChange={(e) => setSortByCategory(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
          >
            <option value="">Trier par catégorie</option>
            <option value="Petit Déjeuner">Petit Déjeuner</option>
            <option value="Déjeuner">Déjeuner</option>
            <option value="Dîner">Dîner</option>
            <option value="Dessert">Dessert</option>
            <option value="Boisson">Boisson</option>
            <option value="Snack">Snack</option>
            {activeTab === 'personal' &&
              recipes.map(
                (r, i) =>
                  r.category &&
                    r.category !== 'Autres' &&
                    !['Petit Déjeuner', 'Déjeuner', 'Dîner', 'Dessert', 'Boisson', 'Snack'].includes(r.category) ? (
                    <option key={i} value={r.category}>
                      {r.category}
                    </option>
                  ) : null
              )}
            {activeTab === 'public' &&
              publicRecipes.map(
                (r, i) =>
                  r.category &&
                    r.category !== 'Autres' &&
                    !['Petit Déjeuner', 'Déjeuner', 'Dîner', 'Dessert', 'Boisson', 'Snack'].includes(r.category) ? (
                    <option key={i} value={r.category}>
                      {r.category}
                    </option>
                  ) : null
              )}
          </select>
        </div>
      </div>

      {activeTab === 'personal' && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-0">Mes Recettes Privées</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleAddEditClick()}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-md hover:from-blue-700 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter un Plat
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg shadow-md hover:from-green-700 hover:to-green-600 transition-all duration-300 transform hover:scale-105"
              >
                <Upload className="w-5 h-5 mr-2" />
                Importer
              </button>
              <button
                onClick={handleExportRecipes}
                disabled={selectedRecipesForExport.length === 0}
                className={`flex items-center px-6 py-3 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 ${selectedRecipesForExport.length === 0
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600'
                  }`}
              >
                <Download className="w-5 h-5 mr-2" />
                Exporter ({selectedRecipesForExport.length})
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                checked={selectedRecipesForExport.length === recipes.length && recipes.length > 0}
                onChange={handleSelectAllForExport}
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300 font-medium">Sélectionner tout</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="relative group">
                  <img
                    src={recipe.image || 'https://via.placeholder.com/300x200?text=Recette'}
                    alt={recipe.name}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => handleGenerateStepsForRecipe(recipe)}
                    className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-purple-600 dark:text-purple-400 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 shadow-lg opacity-0 group-hover:opacity-100"
                    title="Générer les étapes via l'IA"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{recipe.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{recipe.description}</p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => handleViewRecipeClick(recipe.id)}
                      className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-all duration-300"
                      title="Voir la recette"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir
                    </button>
                    <button
                      onClick={() => handleAddEditClick(recipe)}
                      className="flex items-center px-3 py-2 bg-green-500 text-white rounded-full text-sm hover:bg-green-600 transition-all duration-300"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="flex items-center px-3 py-2 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 transition-all duration-300"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'public' && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Plats Publics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="relative group">
                  <img
                    src={recipe.image || 'https://via.placeholder.com/300x200?text=Recette'}
                    alt={recipe.name}
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => handleGenerateStepsForRecipe(recipe)}
                    className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-purple-600 dark:text-purple-400 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 shadow-lg opacity-0 group-hover:opacity-100"
                    title="Générer les étapes via l'IA"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{recipe.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{recipe.description}</p>
                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLikeRecipe(recipe.id, recipe.likes || [])}
                        className={`flex items-center px-3 py-2 rounded-full text-sm transition-all duration-300 ${recipe.likes && recipe.likes.includes(currentUser?.uid)
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        title={recipe.likes && recipe.likes.includes(currentUser?.uid) ? 'Unlike' : 'Like'}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        {recipe.likes ? recipe.likes.length : 0}
                      </button>
                      <button
                        onClick={() => {
                          setCurrentRecipe(recipe);
                          setShowCommentsModal(true);
                        }}
                        className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-all duration-300"
                        title="Commentaires"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {recipe.comments ? recipe.comments.length : 0}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSaveRecipe(recipe)}
                      className="flex items-center px-3 py-2 bg-purple-500 text-white rounded-full text-sm hover:bg-purple-600 transition-all duration-300"
                      title="Sauvegarder"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Sauvegarder
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh] transform transition-all duration-300 scale-100">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
              {formType === 'add' ? 'Ajouter un Nouveau Plat' : 'Modifier le Plat'}
            </h2>
            <form onSubmit={handleSubmitRecipe} className="space-y-6">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Nom du Plat *</label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={e => setRecipeName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                  Noms Alternatifs (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={recipeAltNames}
                  onChange={e => setRecipeAltNames(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Ex: Watapufu, Ndolé"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={recipeDescription}
                  onChange={e => setRecipeDescription(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Décrivez votre plat..."
                ></textarea>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <span role="img" aria-label="ingredients" className="text-2xl">🥗</span>
                  Ingrédients
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <span role="img" aria-label="ingredient" className="text-xl">✨</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-purple-600 dark:text-purple-400">{ingredient.quantity}</span> {ingredient.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <span role="img" aria-label="instructions" className="text-2xl">📝</span>
                  Instructions
                </h3>
                <div className="space-y-3">
                  {instructions.split('\n').map((instruction, index) => (
                    <div key={index} className="flex gap-3 items-start bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 dark:text-purple-300 font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="font-medium text-purple-600 dark:text-purple-400">Étape {index + 1} :</span> {instruction}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Instructions de préparation..."
                  className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  rows="6"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Informations Supplémentaires</h3>
                <div className="flex flex-wrap gap-6">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHalal}
                      onChange={e => setIsHalal(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Halal</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVegetarian}
                      onChange={e => setIsVegetarian(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Végétarien</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVegan}
                      onChange={e => setIsVegan(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Vegan</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Image du Plat</h3>
                <div className="flex gap-6 mb-3">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="url"
                      checked={imageType === 'url'}
                      onChange={() => setImageType('url')}
                      className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">URL de l'image</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="file"
                      checked={imageType === 'file'}
                      onChange={() => setImageType('file')}
                      className="form-radio h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Télécharger un fichier</span>
                  </label>
                </div>
                {imageType === 'url' ? (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    placeholder="URL de l'image du plat"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    ref={fileInputRef}
                    className="w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-800 dark:file:text-white dark:hover:file:bg-blue-700"
                  />
                )}
                {imageUrl && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={imageUrl}
                      alt="Prévisualisation du plat"
                      className="w-40 h-40 rounded-lg object-cover border-2 border-blue-500 shadow-md"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                  Catégorie du Plat *
                </label>
                <select
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    setOtherCategory('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  <option value="Petit Déjeuner">Petit Déjeuner</option>
                  <option value="Déjeuner">Déjeuner</option>
                  <option value="Dîner">Dîner</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Boisson">Boisson</option>
                  <option value="Snack">Snack</option>
                  <option value="Autres">Autres</option>
                </select>
                {category === 'Autres' && (
                  <input
                    type="text"
                    value={otherCategory}
                    onChange={e => setOtherCategory(e.target.value)}
                    className="mt-3 w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    placeholder="Entrez une autre catégorie"
                    required
                  />
                )}
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <label className="inline-flex items-center mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isComposite}
                    onChange={e => setIsComposite(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300 text-lg font-semibold">Plat Composé</span>
                </label>

                {isComposite && (
                  <div className="mt-4">
                    <p className="text-gray-700 dark:text-gray-300 mb-3 font-medium">Sélectionnez les plats existants :</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto p-2 rounded-lg bg-white dark:bg-gray-800">
                      {recipes
                        .filter(r => r.id !== currentRecipe?.id)
                        .map(dish => (
                          <label
                            key={dish.id}
                            className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCompositeDishes.includes(dish.id)}
                              onChange={() => handleCompositeDishSelection(dish.id)}
                              className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <img
                              src={dish.image || 'https://via.placeholder.com/50'}
                              alt={dish.name}
                              className="w-12 h-12 object-cover rounded-full ml-3 mr-4 border-2 border-blue-500"
                            />
                            <div>
                              <span className="font-semibold text-gray-800 dark:text-gray-100">{dish.name}</span>
                              <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {dish.ingredients &&
                                  dish.ingredients.slice(0, 2).map((ing, i) => (
                                    <li key={i}>
                                      {ing.name} ({ing.quantity} {ing.unit})
                                    </li>
                                  ))}
                                {dish.ingredients && dish.ingredients.length > 2 && <li>...</li>}
                              </ul>
                            </div>
                          </label>
                        ))}
                      {recipes.filter(r => r.id !== currentRecipe?.id).length === 0 && (
                        <p className="text-center text-gray-600 dark:text-gray-400 col-span-full">
                          Aucun autre plat disponible.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-3">
                  <span role="img" aria-label="time" className="text-2xl">⏱️</span>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Temps de préparation</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{recipe.prepTime} min</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-3">
                  <span role="img" aria-label="cooking" className="text-2xl">🔥</span>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Temps de cuisson</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{recipe.cookTime} min</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-3">
                  <span role="img" aria-label="servings" className="text-2xl">👥</span>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Portions</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{recipe.servings}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-400 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-500 transition-all duration-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-md hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {formType === 'add' ? 'Ajouter' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && currentRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div id="showDetailModal" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh] relative transform transition-all duration-300 scale-100">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-bold transition-all duration-300"
            >
              <X />
            </button>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">{currentRecipe.name}</h2>
            {currentRecipe.altNames && currentRecipe.altNames.length > 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                (Noms Alternatifs: {currentRecipe.altNames.join(', ')})
              </p>
            )}
            <div className="flex justify-center mb-6">
              <img
                src={currentRecipe.image || 'https://via.placeholder.com/300'}
                alt={currentRecipe.name}
                className="w-64 h-64 object-cover rounded-lg shadow-md border-2 border-blue-500"
              />
            </div>

            <p className="text-gray-700 dark:text-gray-300 text-lg mb-6 text-center">{currentRecipe.description}</p>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Ingrédients :</h3>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-base space-y-1">
                {currentRecipe.ingredients &&
                  currentRecipe.ingredients.map((ing, index) => (
                    <li key={index}>
                      {ing.name} - {ing.quantity} {ing.unit} {ing.price && `(${ing.price} CFA)`}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <span role="img" aria-label="instructions" className="text-2xl">📝</span>
                Instructions
              </h3>
              <div className="space-y-3">
                {currentRecipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-3 items-start bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        <span className="font-medium text-purple-600 dark:text-purple-400">Étape {index + 1} :</span> {instruction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Informations :</h3>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 text-base space-y-1">
                {currentRecipe.isHalal && <li>Halal</li>}
                {currentRecipe.isVegetarian && <li>Végétarien</li>}
                {currentRecipe.isVegan && <li>Vegan</li>}
                {currentRecipe.category && <li>Catégorie: {currentRecipe.category}</li>}
                {currentRecipe.isComposite && <li>Plat Composé: Oui</li>}
              </ul>
            </div>

            {currentRecipe.isComposite && currentRecipe.compositeDishes && currentRecipe.compositeDishes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Composé de :</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentRecipe.compositeDishes.map(dishId => {
                    const dish = recipes.find(r => r.id === dishId) || publicRecipes.find(r => r.id === dishId);
                    if (dish) {
                      return (
                        <div
                          key={dish.id}
                          className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm"
                        >
                          <img
                            src={dish.image || 'https://via.placeholder.com/50'}
                            alt={dish.name}
                            className="w-12 h-12 object-cover rounded-full mr-4 border-2 border-blue-500"
                          />
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{dish.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {dish.description}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-400 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-500 transition-all duration-300"
              >
                <X className="w-4 h-4 mr-2" />
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative transform transition-all duration-300 scale-100">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-bold transition-all duration-300"
            >
              <X />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Importer des Plats (JSON)</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
              Sélectionnez un fichier JSON contenant les recettes à importer. Les plats seront ajoutés à votre collection privée.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-800 dark:file:text-white dark:hover:file:bg-green-700"
              disabled={importing}
            />
            {importing && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
                <p className="ml-3 text-blue-600 dark:text-blue-400">Importation en cours...</p>
              </div>
            )}
            <button
              onClick={() => setShowImportModal(false)}
              className="mt-6 flex items-center mx-auto px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-400 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-500 transition-all duration-300"
            >
              <X className="w-4 h-4 mr-2" />
              Fermer
            </button>
          </div>
        </div>
      )}

      {showLikesModal && currentRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative transform transition-all duration-300 scale-100">
            <button
              onClick={() => setShowLikesModal(false)}
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-bold transition-all duration-300"
            >
              <X />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Personnes qui aiment "{currentRecipe.name}"
            </h2>
            {currentRecipe.likes && currentRecipe.likes.length > 0 ? (
              <ul className="space-y-4 max-h-60 overflow-y-auto">
                {currentRecipe.likes.map((likerUid, index) => (
                  <li
                    key={index}
                    className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm"
                  >
                    <img
                      src={`https://i.pravatar.cc/50?img=${index}`}
                      alt="User Avatar"
                      className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-blue-500"
                    />
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      User ID: {likerUid.substring(0, 8)}...
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">Personne n'a encore aimé ce plat.</p>
            )}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowLikesModal(false)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-400 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-500 transition-all duration-300"
              >
                <X className="w-4 h-4 mr-2" />
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommentsModal && currentRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full p-8 relative transform transition-all duration-300 scale-100">
            <button
              onClick={() => setShowCommentsModal(false)}
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-bold transition-all duration-300"
            >
              <X />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              Commentaires sur "{currentRecipe.name}"
            </h2>

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
              <p className="text-red-500 text-sm mb-3 font-semibold">
                Avertissement: Respectez les règles de bienséance dans vos commentaires.
              </p>
              <textarea
                placeholder="Ajouter un commentaire..."
                rows="4"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 mb-3"
                value={currentCommentText}
                onChange={e => setCurrentCommentText(e.target.value)}
              ></textarea>
              <button
                onClick={() => {
                  handleAddComment(currentRecipe.id, currentCommentText);
                  setCurrentCommentText('');
                }}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!currentCommentText.trim()}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Envoyer
              </button>
            </div>

            {currentRecipe.comments && currentRecipe.comments.length > 0 ? (
              <ul className="space-y-4 max-h-60 overflow-y-auto">
                {currentRecipe.comments
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((comment, index) => (
                    <li
                      key={comment.id}
                      className="flex items-start p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm"
                    >
                      <img
                        src={comment.userPic || `https://i.pravatar.cc/50?img=${index + 10}`}
                        alt="User Avatar"
                        className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{comment.userName}</p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{comment.comment}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(comment.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">Aucun commentaire pour ce plat.</p>
            )}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowCommentsModal(false)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-400 text-white rounded-lg shadow-md hover:from-gray-600 hover:to-gray-500 transition-all duration-300"
              >
                <X className="w-4 h-4 mr-2" />
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour la génération d'étapes */}
      {showGenerateStepsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Génération des étapes de préparation
                {selectedRecipeForGeneration && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    pour {selectedRecipeForGeneration.name}
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowGenerateStepsModal(false);
                  setSelectedRecipeForGeneration(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {isGeneratingSteps ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  Génération des étapes en cours...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {generatedSteps}
                  </pre>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowGenerateStepsModal(false);
                      setSelectedRecipeForGeneration(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUseGeneratedSteps}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Utiliser ces étapes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recipes;