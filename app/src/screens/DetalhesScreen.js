import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../services/api';
import { CONFIG } from '../utils/constants';
import {
  ehSerie,
  paraLista,
  parseCategoriaSlug,
  slugDoFilme,
} from '../utils/helpers';
import FilmeCard from '../components/FilmeCard';
import useFavoritos from '../hooks/useFavoritos';

const { width, height } = Dimensions.get('window');
const POSTER_RECOMENDADO = Math.max(114, Math.min(138, width * 0.32));

function resolverOrigem(filme) {
  const origem = parseCategoriaSlug(
    filme?.link_assistir || filme?.link || `/${filme?.categoria || ''}/${filme?.slug || ''}`
  );

  return {
    categoria: filme?.categoria || origem.categoria || '',
    slug: filme?.slug || origem.slug || '',
  };
}

export default function DetalhesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const filme = route.params?.filme || {};
  const origemInicial = useMemo(() => resolverOrigem(filme), [filme]);

  const [detalhes, setDetalhes] = useState(filme);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [temporadaIndex, setTemporadaIndex] = useState(0);
  const [temporadas, setTemporadas] = useState([]);
  const [carregandoEpisodios, setCarregandoEpisodios] = useState(false);

  const { favoritosSlugs, toggle } = useFavoritos();

  const categoria = detalhes?.categoria || origemInicial.categoria;
  const slug = detalhes?.slug || origemInicial.slug;
  const serie = ehSerie(detalhes?.tipo || filme?.tipo);
  const generos = paraLista(detalhes?.generos);
  const diretores = paraLista(detalhes?.diretores);
  const atores = paraLista(detalhes?.atores);
  const recomendados = Array.isArray(detalhes?.recomendados) ? detalhes.recomendados : [];
  const temporadaSelecionada = temporadas[temporadaIndex];
  const primeiroEpisodio = temporadas[0]?.episodios?.[0];
  const slugFavorito = slug || slugDoFilme(detalhes) || slugDoFilme(filme);
  const jaFavorito = favoritosSlugs.has(slugFavorito);

  const selecionarTemporada = useCallback(async (index, lista, categoriaSerie, slugSerie) => {
    const temporada = lista[index];
    if (!temporada) return;

    setTemporadaIndex(index);
    if (Array.isArray(temporada.episodios) && temporada.episodios.length) return;
    if (!categoriaSerie || !slugSerie) return;

    setCarregandoEpisodios(true);
    try {
      const resposta = await apiFetch(
        `${CONFIG.STREAM_API}/serie/${categoriaSerie}/${slugSerie}/temporada/${temporada.numero}`
      );
      if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);
      const dados = await resposta.json();
      const episodios = Array.isArray(dados?.episodios) ? dados.episodios : [];

      setTemporadas((atuais) => atuais.map((item, indice) => (
        indice === index ? { ...item, episodios } : item
      )));
    } catch (causa) {
      console.error('Erro ao carregar episódios:', causa);
    } finally {
      setCarregandoEpisodios(false);
    }
  }, []);

  const carregarDetalhes = useCallback(async () => {
    const { categoria: categoriaBase, slug: slugBase } = origemInicial;
    if (!categoriaBase || !slugBase) {
      setErro('Os dados deste título não estão completos para abrir os detalhes.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro('');
    try {
      const tipoEndpoint = ehSerie(filme?.tipo) ? 'serie' : 'filme';
      const resposta = await apiFetch(`${CONFIG.STREAM_API}/${tipoEndpoint}/${categoriaBase}/${slugBase}`);
      if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);

      const dados = await resposta.json();
      const completo = { ...filme, ...dados };
      setDetalhes(completo);

      if (ehSerie(completo.tipo) && Array.isArray(completo.temporadas) && completo.temporadas.length) {
        const lista = completo.temporadas;
        const categoriaSerie = completo.categoria || categoriaBase;
        const slugSerie = completo.slug || slugBase;
        setTemporadas(lista);
        setTemporadaIndex(0);
        selecionarTemporada(0, lista, categoriaSerie, slugSerie);
      }
    } catch (causa) {
      console.error('Erro ao carregar detalhes:', causa);
      setErro('Não foi possível atualizar todos os detalhes deste título.');
    } finally {
      setLoading(false);
    }
  }, [filme, origemInicial, selecionarTemporada]);

  useEffect(() => {
    carregarDetalhes();
  }, [carregarDetalhes]);

  const assistirFilme = () => {
    if (!categoria || !slug) return;
    navigation.navigate('Player', {
      categoria,
      slug,
      tipo: 'filme',
      titulo: detalhes?.titulo || filme?.titulo || 'TEDFLIX',
    });
  };

  const assistirEpisodio = (episodio) => {
    const origemEpisodio = resolverOrigem(episodio);
    const categoriaEpisodio = episodio?.categoria || origemEpisodio.categoria || categoria;
    const slugEpisodio = episodio?.slug || origemEpisodio.slug;
    if (!categoriaEpisodio || !slugEpisodio) return;

    navigation.navigate('Player', {
      categoria: categoriaEpisodio,
      slug: slugEpisodio,
      tipo: 'episodio',
      titulo: episodio?.titulo || detalhes?.titulo || filme?.titulo || 'Episódio',
    });
  };

  const favoritar = () => {
    if (!slugFavorito) return;
    toggle({
      ...filme,
      ...detalhes,
      slug: slugFavorito,
      categoria,
      link_assistir: detalhes?.link_assistir || filme?.link_assistir || filme?.link || `/${categoria}/${slugFavorito}`,
    });
  };

  const abrirRelacionado = (item) => navigation.push('Detalhes', { filme: item });

  if (loading && !detalhes?.titulo) {
    return (
      <View style={styles.estadoTela}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.estadoTexto}>Carregando detalhes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollConteudo}>
        <View style={styles.backdropContainer}>
          {detalhes?.imagem || filme?.imagem ? (
            <Image
              source={{ uri: detalhes?.imagem || filme?.imagem }}
              style={styles.backdrop}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.backdropIndisponivel}>
              <MaterialCommunityIcons name="movie-open-outline" size={52} color="#4D4D4D" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.16)', '#000000']}
            locations={[0, 0.47, 1]}
            style={styles.backdropGradiente}
          />
          <TouchableOpacity
            style={[styles.botaoVoltar, { top: Math.max(insets.top + 10, 26) }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <MaterialCommunityIcons name="chevron-left" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.conteudo}>
          {erro ? (
            <View style={styles.avisoErro}>
              <MaterialCommunityIcons name="information-outline" size={17} color="#F2C879" />
              <Text style={styles.avisoErroTexto}>{erro}</Text>
            </View>
          ) : null}

          <Text style={styles.tipo}>{detalhes?.tipo || filme?.tipo || 'Título'}</Text>
          <Text style={styles.titulo}>{detalhes?.titulo || filme?.titulo || 'Sem título'}</Text>

          <View style={styles.metadados}>
            {detalhes?.ano ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={14} color="#D2D2D2" />
                <Text style={styles.metaTexto}>{detalhes.ano}</Text>
              </View>
            ) : null}
            {detalhes?.duracao ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#D2D2D2" />
                <Text style={styles.metaTexto}>{detalhes.duracao}</Text>
              </View>
            ) : null}
            {serie && detalhes?.total_temporadas ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="playlist-play" size={14} color="#D2D2D2" />
                <Text style={styles.metaTexto}>
                  {detalhes.total_temporadas} temporada{Number(detalhes.total_temporadas) === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}
            {detalhes?.nota ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="star" size={14} color="#F7C948" />
                <Text style={styles.metaTexto}>{detalhes.nota}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.descricao}>
            {detalhes?.descricao || filme?.descricao || 'A sinopse deste título ainda não está disponível.'}
          </Text>

          {generos.length ? (
            <View style={styles.generos}>
              {generos.slice(0, 8).map((genero) => (
                <View key={genero} style={styles.generoPill}>
                  <Text style={styles.generoTexto}>{genero}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {diretores.length ? <Text style={styles.credito}><Text style={styles.creditoRotulo}>Direção: </Text>{diretores.join(', ')}</Text> : null}
          {atores.length ? <Text style={styles.credito}><Text style={styles.creditoRotulo}>Elenco: </Text>{atores.join(', ')}</Text> : null}

          {serie ? (
            <TouchableOpacity
              style={[styles.botaoAssistir, !primeiroEpisodio && styles.botaoDesativado]}
              onPress={() => primeiroEpisodio && assistirEpisodio(primeiroEpisodio)}
              activeOpacity={0.8}
              disabled={!primeiroEpisodio}
            >
              <MaterialCommunityIcons name="play" size={21} color="#000000" />
              <Text style={styles.botaoAssistirTexto}>
                {primeiroEpisodio ? `Assistir T${temporadas[0]?.numero || 1}: E${primeiroEpisodio.numero || 1}` : 'Carregando episódios...'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.botaoAssistir} onPress={assistirFilme} activeOpacity={0.8}>
              <MaterialCommunityIcons name="play" size={21} color="#000000" />
              <Text style={styles.botaoAssistirTexto}>Assistir agora</Text>
            </TouchableOpacity>
          )}

          {slugFavorito ? (
            <TouchableOpacity
              style={[styles.botaoFavoritar, jaFavorito && styles.botaoFavoritarAtivo]}
              onPress={favoritar}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={jaFavorito ? 'heart' : 'heart-outline'}
                size={20}
                color={jaFavorito ? '#E50914' : '#FFFFFF'}
              />
              <Text style={[styles.botaoFavoritarTexto, jaFavorito && styles.botaoFavoritarTextoAtivo]}>
                {jaFavorito ? 'Na sua lista' : 'Adicionar à minha lista'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {serie && temporadas.length ? (
          <View style={styles.blocoTemporadas}>
            <Text style={styles.secaoTitulo}>Temporadas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.temporadasTabs}>
              {temporadas.map((temporada, indice) => {
                const selecionada = indice === temporadaIndex;
                return (
                  <TouchableOpacity
                    key={`${temporada.numero || indice}-${temporada.titulo || ''}`}
                    style={[styles.temporadaTab, selecionada && styles.temporadaTabAtiva]}
                    onPress={() => selecionarTemporada(indice, temporadas, categoria, slug)}
                    activeOpacity={0.78}
                  >
                    <Text style={[styles.temporadaTabTexto, selecionada && styles.temporadaTabTextoAtiva]}>
                      {temporada.titulo || `Temporada ${temporada.numero || indice + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {carregandoEpisodios ? (
              <ActivityIndicator style={styles.loaderEpisodios} size="small" color="#E50914" />
            ) : (temporadaSelecionada?.episodios || []).length ? (
              (temporadaSelecionada?.episodios || []).map((episodio, indice) => (
                <TouchableOpacity
                  key={`${episodio.slug || episodio.link || indice}`}
                  style={styles.episodio}
                  onPress={() => assistirEpisodio(episodio)}
                  activeOpacity={0.8}
                >
                  <View style={styles.episodioThumb}>
                    {episodio?.imagem ? (
                      <Image source={{ uri: episodio.imagem }} style={styles.episodioImagem} resizeMode="cover" />
                    ) : (
                      <MaterialCommunityIcons name="play-circle-outline" size={30} color="#A0A0A0" />
                    )}
                    <View style={styles.episodioPlay}>
                      <MaterialCommunityIcons name="play" size={13} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.episodioInfo}>
                    <Text style={styles.episodioNumero}>EPISÓDIO {episodio?.numero || indice + 1}</Text>
                    <Text style={styles.episodioTitulo} numberOfLines={2}>{episodio?.titulo || 'Episódio sem título'}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#777777" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.semEpisodios}>Não há episódios disponíveis nesta temporada.</Text>
            )}
          </View>
        ) : null}

        {recomendados.length ? (
          <View style={styles.recomendados}>
            <Text style={styles.secaoTitulo}>Títulos recomendados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trilhaRecomendados}>
              {recomendados.map((item, indice) => (
                <FilmeCard
                  key={`${slugDoFilme(item) || item.titulo || 'recomendado'}-${indice}`}
                  filme={item}
                  favorito={favoritosSlugs.has(slugDoFilme(item))}
                  onPress={abrirRelacionado}
                  onToggleFavorito={toggle}
                  width={POSTER_RECOMENDADO}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollConteudo: {
    paddingBottom: 38,
  },
  estadoTela: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoTexto: {
    color: '#B2B2B2',
    fontSize: 14,
    marginTop: 12,
  },
  backdropContainer: {
    height: Math.max(300, height * 0.48),
    position: 'relative',
    backgroundColor: '#111111',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropIndisponivel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropGradiente: {
    ...StyleSheet.absoluteFillObject,
  },
  botaoVoltar: {
    position: 'absolute',
    left: 16,
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  conteudo: {
    paddingHorizontal: 18,
    marginTop: -49,
  },
  avisoErro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(242,200,121,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(242,200,121,0.24)',
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 15,
  },
  avisoErroTexto: {
    color: '#E7CB91',
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  tipo: {
    color: '#D4D4D4',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    marginTop: 4,
  },
  metadados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  metaItem: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaTexto: {
    color: '#E3E3E3',
    fontSize: 12,
    fontWeight: '600',
  },
  descricao: {
    color: '#C7C7C7',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 15,
  },
  generos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 15,
  },
  generoPill: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  generoTexto: {
    color: '#D0D0D0',
    fontSize: 12,
    fontWeight: '600',
  },
  credito: {
    color: '#9F9F9F',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  creditoRotulo: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  botaoAssistir: {
    minHeight: 53,
    marginTop: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  botaoDesativado: {
    opacity: 0.52,
  },
  botaoAssistirTexto: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  botaoFavoritar: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  botaoFavoritarAtivo: {
    borderColor: 'rgba(229,9,20,0.7)',
    backgroundColor: 'rgba(229,9,20,0.10)',
  },
  botaoFavoritarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  botaoFavoritarTextoAtivo: {
    color: '#F45A62',
  },
  blocoTemporadas: {
    marginTop: 32,
  },
  secaoTitulo: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    paddingHorizontal: 18,
    marginBottom: 13,
  },
  temporadasTabs: {
    paddingHorizontal: 18,
    gap: 9,
    paddingBottom: 16,
  },
  temporadaTab: {
    minHeight: 39,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  temporadaTabAtiva: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  temporadaTabTexto: {
    color: '#C5C5C5',
    fontSize: 13,
    fontWeight: '700',
  },
  temporadaTabTextoAtiva: {
    color: '#000000',
  },
  loaderEpisodios: {
    marginTop: 19,
  },
  episodio: {
    minHeight: 92,
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 7,
    borderRadius: 11,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#202020',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  episodioThumb: {
    width: 113,
    aspectRatio: 16 / 9,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#191919',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodioImagem: {
    width: '100%',
    height: '100%',
  },
  episodioPlay: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  episodioInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  episodioNumero: {
    color: '#A2A2A2',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  episodioTitulo: {
    color: '#F2F2F2',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 3,
  },
  semEpisodios: {
    color: '#888888',
    marginHorizontal: 18,
    marginTop: 4,
    fontSize: 13,
  },
  recomendados: {
    marginTop: 33,
  },
  trilhaRecomendados: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 12,
  },
});
