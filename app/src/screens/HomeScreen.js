import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../services/api';
import { CATEGORIAS, CONFIG } from '../utils/constants';
import Header from '../components/Header';
import FilmeCard from '../components/FilmeCard';
import useFavoritos from '../hooks/useFavoritos';
import { slugDoFilme } from '../utils/helpers';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(520, Math.max(365, width * 1.06));
const CARD_WIDTH = Math.max(116, Math.min(144, width * 0.325));

export default function HomeScreen() {
  const navigation = useNavigation();
  const [filmes, setFilmes] = useState([]);
  const [novosOnline, setNovosOnline] = useState([]);
  const [tituloSecao, setTituloSecao] = useState('Assistir Novos Online');
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');
  const [slideAtual, setSlideAtual] = useState(0);

  const { favoritosSlugs, recarregar, toggle } = useFavoritos();

  const carregarDados = useCallback(async ({ silencioso = false } = {}) => {
    if (silencioso) setAtualizando(true);
    else setLoading(true);
    setErro('');

    try {
      const [ultimosResposta, novosResposta] = await Promise.all([
        apiFetch(`${CONFIG.STREAM_API}/ultimos-filmes`),
        apiFetch(`${CONFIG.STREAM_API}/home/novos-online`),
      ]);

      if (!ultimosResposta.ok || !novosResposta.ok) {
        throw new Error('A API não respondeu como esperado.');
      }

      const [ultimosDados, novosDados] = await Promise.all([
        ultimosResposta.json(),
        novosResposta.json(),
      ]);

      const destaques = Array.isArray(ultimosDados)
        ? ultimosDados
        : ultimosDados?.filmes || [];
      const novos = novosDados?.resultados || [];

      setFilmes(Array.isArray(destaques) ? destaques : []);
      setNovosOnline(Array.isArray(novos) ? novos : []);
      setTituloSecao(novosDados?.titulo_secao || 'Assistir Novos Online');
      setSlideAtual(0);
    } catch (causa) {
      console.error('Erro ao carregar a home:', causa);
      setErro('Não foi possível carregar o catálogo agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
    recarregar();
  }, [carregarDados, recarregar]);

  useEffect(() => {
    if (filmes.length < 2) return undefined;

    const intervalo = setInterval(() => {
      setSlideAtual((indice) => (indice + 1) % filmes.length);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [filmes.length]);

  const colunasNovos = useMemo(() => {
    const resultado = [];
    for (let indice = 0; indice < novosOnline.length; indice += 2) {
      resultado.push(novosOnline.slice(indice, indice + 2));
    }
    return resultado;
  }, [novosOnline]);

  const abrirDetalhe = (filme) => navigation.navigate('Detalhes', { filme });
  const destaque = filmes[slideAtual] || filmes[0];

  const tentarNovamente = () => {
    recarregar();
    carregarDados();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Header ativo="inicio" />

      {loading ? (
        <View style={styles.estadoTela}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.estadoTexto}>Preparando seu catálogo...</Text>
        </View>
      ) : erro && !destaque && !novosOnline.length ? (
        <View style={styles.estadoTela}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={40} color="#8C8C8C" />
          <Text style={styles.estadoTexto}>{erro}</Text>
          <TouchableOpacity style={styles.botaoTentar} onPress={tentarNovamente} activeOpacity={0.8}>
            <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conteudo}
          refreshControl={(
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => {
                recarregar();
                carregarDados({ silencioso: true });
              }}
              tintColor="#E50914"
              colors={['#E50914']}
              progressBackgroundColor="#141414"
            />
          )}
        >
          {destaque ? (
            <TouchableOpacity
              style={styles.hero}
              onPress={() => abrirDetalhe(destaque)}
              activeOpacity={0.93}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${destaque.titulo || 'destaque'}`}
            >
              <Image source={{ uri: destaque.imagem }} style={styles.heroImagem} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(0,0,0,0.94)', 'rgba(0,0,0,0.46)', 'rgba(0,0,0,0)']}
                locations={[0, 0.47, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.heroGradienteLateral}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.48)', '#000000']}
                locations={[0, 0.46, 1]}
                style={styles.heroGradienteInferior}
              />
              <View style={styles.heroConteudo}>
                <Text style={styles.heroTipo}>{destaque.tipo || 'Filme'}</Text>
                <Text style={styles.heroTitulo} numberOfLines={2}>{destaque.titulo || 'Destaque'}</Text>
                <Text style={styles.heroDescricao} numberOfLines={3}>
                  {destaque.descricao || 'Assista aos títulos disponíveis no catálogo TEDFLIX.'}
                </Text>
                <View style={styles.heroBotao}>
                  <MaterialCommunityIcons name="play" size={18} color="#000000" />
                  <Text style={styles.heroBotaoTexto}>Assistir</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.secaoCategorias}>
            <Text style={styles.secaoTitulo}>Categorias</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriasLista}
            >
              {CATEGORIAS.map((categoria) => (
                <TouchableOpacity
                  key={categoria.slug}
                  style={styles.categoriaItem}
                  onPress={() => navigation.navigate('CategoriaGenero', {
                    slug: categoria.slug,
                    titulo: categoria.titulo,
                    ativo: null,
                  })}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir categoria ${categoria.titulo}`}
                >
                  <Text style={styles.categoriaTexto}>{categoria.titulo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.secaoCatalogo}>
            <Text style={styles.secaoTitulo}>{tituloSecao}</Text>
            {colunasNovos.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trilhaFilmes}
              >
                {colunasNovos.map((coluna, indice) => (
                  <View key={`coluna-${indice}`} style={styles.colunaFilmes}>
                    {coluna.map((filme, indiceFilme) => (
                      <View key={`${slugDoFilme(filme) || filme.titulo || 'novo'}-${indiceFilme}`} style={styles.itemColuna}>
                        <FilmeCard
                          filme={filme}
                          favorito={favoritosSlugs.has(slugDoFilme(filme))}
                          onPress={abrirDetalhe}
                          onToggleFavorito={toggle}
                          width={CARD_WIDTH}
                          compact
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.catalogoVazio}>Novos títulos serão exibidos aqui em breve.</Text>
            )}
          </View>

          <View style={styles.footer}>
            <Image source={require('../../assets/logo.png')} style={styles.footerLogo} resizeMode="contain" />
            <Text style={styles.footerTexto}>© {new Date().getFullYear()} TEDFLIX. Todos os direitos reservados.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  conteudo: {
    paddingBottom: 28,
  },
  estadoTela: {
    flex: 1,
    paddingHorizontal: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoTexto: {
    color: '#B6B6B6',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  botaoTentar: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  botaoTentarTexto: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
  },
  hero: {
    height: HERO_HEIGHT,
    marginTop: 12,
    marginHorizontal: 12,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#101010',
  },
  heroImagem: {
    width: '100%',
    height: '100%',
  },
  heroGradienteLateral: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradienteInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '68%',
  },
  heroConteudo: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 27,
    maxWidth: '83%',
  },
  heroTipo: {
    color: '#D9D9D9',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroTitulo: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 4,
  },
  heroDescricao: {
    color: '#D4D4D4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
  },
  heroBotao: {
    alignSelf: 'flex-start',
    minHeight: 45,
    marginTop: 17,
    paddingHorizontal: 20,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroBotaoTexto: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  secaoCategorias: {
    marginTop: 25,
  },
  secaoCatalogo: {
    marginTop: 18,
  },
  secaoTitulo: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    paddingHorizontal: 18,
    marginBottom: 13,
  },
  categoriasLista: {
    paddingHorizontal: 18,
    paddingVertical: 2,
    gap: 10,
  },
  categoriaItem: {
    minWidth: 132,
    height: 62,
    borderRadius: 17,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#242424',
  },
  categoriaTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  trilhaFilmes: {
    paddingHorizontal: 18,
    paddingTop: 3,
    paddingBottom: 15,
    gap: 12,
  },
  colunaFilmes: {
    gap: 12,
  },
  itemColuna: {
    minHeight: 0,
  },
  catalogoVazio: {
    color: '#7D7D7D',
    fontSize: 13,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  footer: {
    marginTop: 24,
    minHeight: 150,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  footerLogo: {
    width: 89,
    height: 28,
    opacity: 0.8,
    marginBottom: 12,
  },
  footerTexto: {
    color: '#666666',
    fontSize: 11,
    textAlign: 'center',
  },
});
