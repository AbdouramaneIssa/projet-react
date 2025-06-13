import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { collection, query, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { MapPin, Home, Store, Navigation, Send } from 'lucide-react';

const VendorMap = ({ setPage, showNotification }) => {
  const { currentUser, db, appId, userId } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [directions, setDirections] = useState(null);
  const [map, setMap] = useState(null);
  const [nearestVendor, setNearestVendor] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '600px'
  };

  const defaultCenter = {
    lat: 48.8566,
    lng: 2.3522
  };

  useEffect(() => {
    if (currentUser && userId && db && appId) {
      // Récupérer la position de l'utilisateur
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);

          // Mettre à jour la position dans Firestore
          try {
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
            await updateDoc(userDocRef, {
              location,
              lastLocationUpdate: new Date().toISOString()
            });
          } catch (error) {
            console.error("Erreur lors de la mise à jour de la position:", error);
          }
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          showNotification("Impossible d'accéder à votre position", "error");
        }
      );

      // Charger les vendeurs
      const vendorsRef = collection(db, `artifacts/${appId}/vendors/${userId}/profiles`);
      getDocs(vendorsRef).then((querySnapshot) => {
        const vendorsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVendors(vendorsData);
      });
    }
  }, [currentUser, userId, db, appId, showNotification]);

  const handleMapClick = async (event) => {
    if (!isEditingLocation) return;

    const newLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    try {
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
      await updateDoc(userDocRef, {
        location: newLocation,
        lastLocationUpdate: new Date().toISOString()
      });

      setUserLocation(newLocation);
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
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
            await updateDoc(userDocRef, {
              location: newLocation,
              lastLocationUpdate: new Date().toISOString()
            });

            setUserLocation(newLocation);
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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const findNearestVendor = () => {
    if (!userLocation || vendors.length === 0) return;

    let nearest = vendors[0];
    let minDistance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      vendors[0].location.lat,
      vendors[0].location.lng
    );

    vendors.forEach(vendor => {
      if (vendor.location) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          vendor.location.lat,
          vendor.location.lng
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = vendor;
        }
      }
    });

    setNearestVendor(nearest);
    calculateRoute(nearest);
    showNotification(`Vendeur le plus proche trouvé : ${nearest.storeName}`, "success");
  };

  const calculateRoute = (vendor) => {
    if (!userLocation || !vendor.location) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: vendor.location,
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error("Erreur lors du calcul de l'itinéraire:", status);
          showNotification("Impossible de calculer l'itinéraire", "error");
        }
      }
    );
  };

  const handleSendShoppingList = async (vendorId) => {
    try {
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles`, currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();

      if (!userData.shoppingList || userData.shoppingList.length === 0) {
        showNotification("Votre liste d'achats est vide", "error");
        return;
      }

      const propositionRef = collection(db, `artifacts/${appId}/propositions`);
      await addDoc(propositionRef, {
        clientId: currentUser.uid,
        clientName: userData.fullName,
        vendorId: vendorId,
        items: userData.shoppingList,
        status: 'EN ATTENTE',
        createdAt: new Date().toISOString()
      });

      showNotification("Liste d'achats envoyée avec succès !", "success");
    } catch (error) {
      console.error("Erreur lors de l'envoi de la liste d'achats:", error);
      showNotification("Erreur lors de l'envoi de la liste d'achats", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 p-8 mt-16">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Carte des Vendeurs</h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Votre position et les vendeurs à proximité</h2>
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
                <span>{isEditingLocation ? 'Annuler' : 'Modifier ma position'}</span>
              </button>
              <button
                onClick={findNearestVendor}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-2"
              >
                <Store className="w-4 h-4" />
                <span>Trouver le plus proche</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="rounded-xl overflow-hidden shadow-lg relative">
                {isEditingLocation && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white p-2 text-center z-10">
                    Cliquez sur la carte pour définir votre position
                  </div>
                )}
                <LoadScript googleMapsApiKey="AIzaSyDqJtH6hpF1i1ct9qHzKsqHh4wzMwZTzfw">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={userLocation || defaultCenter}
                    zoom={13}
                    onClick={handleMapClick}
                    onLoad={setMap}
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
                    {userLocation && (
                      <Marker
                        position={userLocation}
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                          scaledSize: new google.maps.Size(40, 40),
                          labelOrigin: new google.maps.Point(20, -10)
                        }}
                        label={{
                          text: 'Ma position',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      />
                    )}

                    {vendors.map((vendor) => (
                      vendor.location && (
                        <Marker
                          key={vendor.id}
                          position={vendor.location}
                          icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                            scaledSize: new google.maps.Size(40, 40),
                            labelOrigin: new google.maps.Point(20, -10)
                          }}
                          label={{
                            text: vendor.storeName || 'Magasin',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                          onClick={() => setSelectedVendor(vendor)}
                        />
                      )
                    ))}

                    {directions && <DirectionsRenderer directions={directions} />}
                  </GoogleMap>
                </LoadScript>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Votre position</h3>
                {userLocation ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Latitude: {userLocation.lat.toFixed(6)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Longitude: {userLocation.lng.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aucune position définie
                  </p>
                )}
              </div>

              {nearestVendor && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Vendeur le plus proche</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {nearestVendor.storeName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {nearestVendor.categories.join(', ')}
                    </p>
                    <button
                      onClick={() => handleSendShoppingList(nearestVendor.id)}
                      className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Envoyer ma liste d'achats</span>
                    </button>
                  </div>
                </div>
              )}

              {isEditingLocation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Le curseur est maintenant en mode sélection. Cliquez sur la carte pour définir votre nouvelle position.
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Légende</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <img
                      src="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                      alt="Marqueur utilisateur"
                      className="w-6 h-6"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Votre position</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <img
                      src="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                      alt="Marqueur vendeur"
                      className="w-6 h-6"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Position des vendeurs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorMap; 