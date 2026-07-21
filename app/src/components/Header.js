
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NAV_ITEMS } from '../utils/constants';

export default function Header({ ativo = 'inicio' }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const irPara = (item) => {
    if (item.key === ativo) return;

    if (item.key === 'inicio') {
      navigation.navigate('Home');
    } else if (item.key === 'favoritos') {
      navigation.navigate('Favoritos');
    } else {
      navigation.navigate('Categoria', { url: item.url, titulo: item.titulo, ativo: item.key });
    }
  };

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.topo}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityLabel="TEDFLIX"
        />

        <TouchableOpacity
          style={styles.search}
          onPress={() => navigation.navigate('Busca')}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Abrir busca"
        >
          <MaterialCommunityIcons name="magnify" size={25} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.nav}
        contentContainerStyle={styles.navContent}
      >
        {NAV_ITEMS.map((item) => {
          const selecionado = ativo === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => irPara(item)}
              activeOpacity={0.72}
              style={styles.navTouch}
              accessibilityRole="tab"
              accessibilityState={{ selected: selecionado }}
            >
              <Text style={[styles.navItem, selecionado && styles.navItemAtivo]}>
                {item.titulo}
              </Text>
              {selecionado ? <View style={styles.indicador} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#000000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.055)',
    zIndex: 20,
    elevation: 8,
  },
  topo: {
    minHeight: 42,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 94,
    height: 30,
  },
  search: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    marginTop: 4,
  },
  navContent: {
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  navTouch: {
    minHeight: 38,
    marginHorizontal: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItem: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  navItemAtivo: {
    color: '#FFFFFF',
  },
  indicador: {
    position: 'absolute',
    bottom: 0,
    width: 17,
    height: 2,
    borderRadius: 99,
    backgroundColor: '#E50914',
  },
});
