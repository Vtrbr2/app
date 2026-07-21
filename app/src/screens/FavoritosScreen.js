import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import FilmeCard from '../components/FilmeCard';
import useFavoritos from '../hooks/useFavoritos';

const { width } = Dimensions.get('window');
const LARGURA_CARD = (width - 54) / 2;

export default function FavoritosScreen() {
  const navigation = useNavigation();
  const {
    favoritosItens,
    favoritosSlugs,
    carregandoFavoritos,
    recarregar,
    toggle,
  } = useFavoritos();

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  const abrirDetalhe = (item) => {
    const filme = {
      ...item,
      link_assistir: item.link_assistir || (item.categoria ? `/${item.categoria}/${item.slug}` : ''),
    };
    navigation.navigate('Detalhes', { filme });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Header ativo="favoritos" />

      <View style={styles.tituloBarra}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.botaoVoltar}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialCommunityIcons name="chevron-left" size={27} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Favoritos</Text>
      </View>

      {carregandoFavoritos && !favoritosItens.length ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.estadoTexto}>Carregando seus favoritos...</Text>
        </View>
      ) : !favoritosItens.length ? (
        <View style={styles.estado}>
          <View style={styles.iconeVazio}>
            <MaterialCommunityIcons name="heart-outline" size={34} color="#E50914" />
          </View>
          <Text style={styles.tituloVazio}>Sua lista está vazia</Text>
          <Text style={styles.estadoTexto}>Toque no coração de um título para encontrá-lo aqui depois.</Text>
          <TouchableOpacity
            style={styles.botaoExplorar}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.botaoExplorarTexto}>Explorar catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favoritosItens}
          renderItem={({ item }) => (
            <FilmeCard
              filme={item}
              favorito={favoritosSlugs.has(item.slug)}
              onPress={abrirDetalhe}
              onToggleFavorito={toggle}
              width={LARGURA_CARD}
            />
          )}
          keyExtractor={(item, index) => `favorito-${item.slug || index}`}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridLinha}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={carregandoFavoritos}
              onRefresh={recarregar}
              tintColor="#E50914"
              colors={['#E50914']}
              progressBackgroundColor="#141414"
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tituloBarra: {
    minHeight: 61,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1B1B1B',
  },
  botaoVoltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 3,
  },
  estado: {
    flex: 1,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeVazio: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,9,20,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.25)',
  },
  tituloVazio: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 17,
  },
  estadoTexto: {
    maxWidth: 290,
    color: '#9B9B9B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 11,
  },
  botaoExplorar: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  botaoExplorarTexto: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    paddingHorizontal: 18,
    paddingTop: 19,
    paddingBottom: 34,
  },
  gridLinha: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
