import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from './screens/MapScreen';
import ChatScreen from './screens/ChatScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SEVALINK OPS' }} />
        <Stack.Screen name="Map" component={MapScreen} options={{ title: 'TACTICAL MAP' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'SECURE COMMS' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
