import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { FavoritosProvider } from './src/hooks/useFavoritos';

export default function App() {
  return (
    <FavoritosProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <AppNavigator />
    </FavoritosProvider>
  );
}
