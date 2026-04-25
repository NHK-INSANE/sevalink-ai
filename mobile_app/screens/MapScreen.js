import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import axios from 'axios';

const API_BASE = "https://sevalink-backend-bmre.onrender.com";

export default function MapScreen() {
  const [ngos, setNgos] = useState([]);

  useEffect(() => {
    fetchNGOs();
  }, []);

  const fetchNGOs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/users`);
      const filtered = res.data.filter(u => u.role === 'ngo' || u.role === 'NGO');
      setNgos(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View className="flex-1">
      <MapView
        className="flex-1"
        initialRegion={{
          latitude: 26.7271,
          longitude: 88.3953,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
      >
        {ngos.map((ngo) => (
          <Marker
            key={ngo._id}
            coordinate={{
              latitude: ngo.location?.lat || 26.7,
              longitude: ngo.location?.lng || 88.4,
            }}
            pinColor="#6366f1"
            title={ngo.name}
            description={ngo.address}
          />
        ))}
      </MapView>
    </View>
  );
}

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  // ... rest of the dark theme map JSON
];
