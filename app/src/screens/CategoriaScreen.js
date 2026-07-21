import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../services/api';
import { GENEROS_DEDICADOS } from '../utils/constants';
import { parseObjetosStream, slugDoFilme } from '../utils/helpers';
import Header from '../components/Header';
import FilmeCard from '../components/FilmeCard';
import useFavoritos from '../hooks/useFavoritos';

const { width } = Dimensions.get('window');
const LARGURA_CARD = (width - 54) / 2;

export default function CategoriaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { slug, url: urlParam, titulo = 'Catálogo', ativo = null } = route.params || {};

  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');
  const abortRef = useRef(null);

  const { favoritosSlugs, toggle } = useFavoritos();

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    const url = urlParam || (slug && GENEROS_DEDICADOS[slug]?.url);

    if (silencioso) setAtualizando(true);
    else setLoading(true);
    setErro('');

    if (!url) {
      setItens([]);
      setErro('Esta categoria não está disponível.');
      setLoading(false);
      setAtualizando(false);
      return;
    }

    abortRef.current?.abort();
    const controlador = new AbortController();
    abortRef.current = controlador;

    try {
      const resposta = await apiFetch(url, { signal: controlador.signal });
      if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);
      const texto = await resposta.text();
      const lista = parseObjetosStream(texto);
      setItens(lista);
    } catch (causa) {
      if (causa?.name !== 'AbortError') {
        console.error('Erro ao carregar categoria:', causa);
        setErro('Não foi possível carregar esta categoria agora.');
      }
    } finally {
      if (!controlador.signal.aborted) {
        setLoading(false);
        setAtualizando(false);
      }
    }
  }, [slug, urlParam]);

  useEffect(() => {
    carregar();
    return () => abortRef.current?.abort();
  }, [carregar]);

  const abrirDetalhe = (filme) => navigation.navigate('Detalhes', { filme });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Header ativo={ativo} />

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
        <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
      </View>

      {loading ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.estadoTexto}>Carregando mais títulos...</Text>
        </View>
      ) : erro ? (
        <View style={styles.estado}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={38} color="#8C8C8C" />
          <Text style={styles.estadoTexto}>{erro}</Text>
          <TouchableOpacity style={styles.botaoTentar} onPress={carregar} activeOpacity={0.8}>
            <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : itens.length === 0 ? (
        <View style={styles.estado}>
          <MaterialCommunityIcons name="movie-open-outline" size={38} color="#5C5C5C" />
          <Text style={styles.estadoTexto}>Nenhum título foi encontrado nesta categoria.</Text>
        </View>
      ) : (
        <FlatList
          data={itens}
          renderItem={({ item }) => (
            <FilmeCard
              filme={item}
              favorito={favoritosSlugs.has(slugDoFilme(item))}
              onPress={abrirDetalhe}
              onToggleFavorito={toggle}
              width={LARGURA_CARD}
            />
          )}
          keyExtractor={(item, index) => `categoria-${slugDoFilme(item) || index}`}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridLinha}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => carregar({ silencioso: true })}
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
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 3,
  },
  estado: {
    flex: 1,
    paddingHorizontal: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoTexto: {
    color: '#9B9B9B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 13,
  },
  botaoTentar: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  botaoTentarTexto: {
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
