import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import DetalhesScreen from '../screens/DetalhesScreen';
import PlayerScreen from '../screens/PlayerScreen';
import CategoriaScreen from '../screens/CategoriaScreen';
import BuscaScreen from '../screens/BuscaScreen';
import FavoritosScreen from '../screens/FavoritosScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detalhes" component={DetalhesScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ animation: 'fade' }} />

        {/* Listagem por gênero (a partir dos cards de Categoria da home) */}
        <Stack.Screen name="CategoriaGenero" component={CategoriaScreen} />
        {/* Listagem por URL direta (Filmes / Séries / Animes / vindos do menu do header) */}
        <Stack.Screen name="Categoria" component={CategoriaScreen} />

        <Stack.Screen name="Busca" component={BuscaScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Favoritos" component={FavoritosScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
