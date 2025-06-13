import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Store, User, Package, Phone, LogOut, MapPin, Navigation } from 'lucide-react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import NavbarVendor from '../components/NavbarVendor';

const VendorDashboard = ({ setPage, showNotification }) => {
  const { currentUser, userId, db, appId } = useAuth();
  const [vendorProfile, setVendorProfile] = useState(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [map, setMap] = useState(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  const mapContainerStyle = {
    width: '100%',
    height: '400px'
  };

  const defaultCenter = {
    lat: 48.8566,
    lng: 2.3522
  };

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      const vendorDocRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, currentUser.uid);
      const unsubscribe = onSnapshot(vendorDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setVendorProfile(docSnap.data());
        } else {
          setPage('vendor-profile-setup');
        }
      }, (error) => {
        console.error("Erreur lors du chargement du profil vendeur:", error);
        showNotification("Erreur lors du chargement du profil vendeur.", "error");
      });
      return () => unsubscribe();
    }
  }, [currentUser, userId, db, appId, setPage, showNotification]);

  const handleMapClick = async (event) => {
    if (!isEditingLocation) return;

    const newLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    try {
      const vendorDocRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, currentUser.uid);
      await updateDoc(vendorDocRef, {
        location: newLocation,
        lastLocationUpdate: new Date().toISOString()
      });

      setVendorProfile(prev => ({
        ...prev,
        location: newLocation
      }));

      showNotification("Position mise à jour avec succès !", "success");
      setIsEditingLocation(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la position:", error);
      showNotification("Erreur lors de la mise à jour de la position", "error");
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          try {
            const vendorDocRef = doc(db, `artifacts/${appId}/vendors/${userId}/profiles`, currentUser.uid);
            await updateDoc(vendorDocRef, {
              location: newLocation,
              lastLocationUpdate: new Date().toISOString()
            });

            setVendorProfile(prev => ({
              ...prev,
              location: newLocation
            }));

            showNotification("Position mise à jour avec succès !", "success");
          } catch (error) {
            console.error("Erreur lors de la mise à jour de la position:", error);
            showNotification("Erreur lors de la mise à jour de la position", "error");
          }
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          showNotification("Impossible d'accéder à votre position", "error");
        }
      );
    }
  };

  const onLoad = (map) => {
    setMap(map);
    setIsGoogleMapsLoaded(true);
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Tableau de bord Vendeur</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Nom de l'entreprise</h3>
                <p className="text-gray-600 dark:text-gray-300">{vendorProfile.fullName}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Catégories</h3>
                <p className="text-gray-600 dark:text-gray-300">{vendorProfile.categories.join(', ')}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Contact</h3>
                <p className="text-gray-600 dark:text-gray-300">{vendorProfile.phoneNumber}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-300">{vendorProfile.description || 'Aucune description'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section de la carte */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Localisation du magasin</h2>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleGetCurrentLocation}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <Navigation className="w-4 h-4" />
                <span>Utiliser ma position</span>
              </button>
              <button
                onClick={() => setIsEditingLocation(!isEditingLocation)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${isEditingLocation
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
              >
                <MapPin className="w-4 h-4" />
                <span>{isEditingLocation ? 'Annuler' : 'Modifier la position'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="rounded-xl overflow-hidden shadow-lg relative">
                {isEditingLocation && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white p-2 text-center z-10">
                    Cliquez sur la carte pour définir la position de votre magasin
                  </div>
                )}
                <LoadScript googleMapsApiKey="AIzaSyDqJtH6hpF1i1ct9qHzKsqHh4wzMwZTzfw" onLoad={() => setIsGoogleMapsLoaded(true)}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={vendorProfile.location || defaultCenter}
                    zoom={13}
                    onClick={handleMapClick}
                    onLoad={onLoad}
                    options={{
                      draggableCursor: isEditingLocation ? 'crosshair' : 'default',
                      styles: [
                        {
                          featureType: 'poi',
                          elementType: 'labels',
                          stylers: [{ visibility: 'off' }]
                        }
                      ]
                    }}
                  >
                    {vendorProfile.location && isGoogleMapsLoaded && (
                      <Marker
                        position={vendorProfile.location}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: new window.google.maps.Size(40, 40),
                          labelOrigin: new window.google.maps.Point(20, -10)
                        }}
                        label={{
                          text: vendorProfile.storeName || 'Mon magasin',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Coordonnées actuelles</h3>
                {vendorProfile.location ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Latitude: {vendorProfile.location.lat.toFixed(6)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Longitude: {vendorProfile.location.lng.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Aucune position définie
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;