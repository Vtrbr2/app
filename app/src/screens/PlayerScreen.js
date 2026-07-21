import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import * as FileSystem from 'expo-file-system';
import { getAuthHeaders } from '../services/api';
import { CONFIG } from '../utils/constants';
import { formatTime } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

// Estes cabeçalhos pertencem apenas ao player nativo e às requisições ao CDN de mídia.
const HEADERS_CDN = {
  Origin: 'https://novelasflix.video',
  Referer: 'https://novelasflix.video/',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
  Accept: '*/*',
};

function nomeSeguro(valor) {
  return String(valor || 'video').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
}

function urlAbsoluta(uri, base) {
  if (!uri || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(uri)) return uri;

  try {
    return new URL(uri, base).toString();
  } catch (causa) {
    const origem = String(base || '').replace(/[?#].*$/, '');
    const raiz = origem.replace(/\/[^/]*$/, '/');
    if (uri.startsWith('/')) {
      const correspondencia = origem.match(/^(https?:\/\/[^/]+)/i);
      return `${correspondencia?.[1] || ''}${uri}`;
    }
    return `${raiz}${uri}`;
  }
}

function reescreverManifestoHls(manifesto, base) {
  return String(manifesto)
    .split(/\r?\n/)
    .map((linha) => {
      const limpa = linha.trim();
      if (!limpa) return linha;

      if (!limpa.startsWith('#')) return urlAbsoluta(limpa, base);

      return linha.replace(/URI=(['"])(.*?)\1/g, (trecho, aspas, uri) => (
        `URI=${aspas}${urlAbsoluta(uri, base)}${aspas}`
      ));
    })
    .join('\n');
}

export default function PlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoria, slug, tipo = 'filme', titulo = 'TEDFLIX' } = route.params || {};

  const [manifestUri, setManifestUri] = useState(null);
  const [preparando, setPreparando] = useState(true);
  const [pronto, setPronto] = useState(false);
  const [bufferizando, setBufferizando] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [mostrarControles, setMostrarControles] = useState(true);
  const [duracao, setDuracao] = useState(0);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [larguraProgresso, setLarguraProgresso] = useState(0);
  const [larguraVolume, setLarguraVolume] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mudo, setMudo] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);

  const videoRef = useRef(null);
  const esconderControlesRef = useRef(null);
  const arquivoManifestoRef = useRef(null);
  const requisicaoRef = useRef(0);

  const endpoint = useMemo(() => (
    tipo === 'episodio'
      ? `${CONFIG.STREAM_API}/episodio/${categoria}/${slug}`
      : `${CONFIG.STREAM_API}/filme-player/${categoria}/${slug}`
  ), [categoria, slug, tipo]);

  const limparManifestoLocal = useCallback(async () => {
    const arquivo = arquivoManifestoRef.current;
    arquivoManifestoRef.current = null;
    if (!arquivo) return;

    try {
      await FileSystem.deleteAsync(arquivo, { idempotent: true });
    } catch (causa) {
      // A limpeza de cache não deve impedir a saída ou uma nova tentativa de reprodução.
      console.warn('Não foi possível limpar o manifesto temporário:', causa);
    }
  }, []);

  const prepararManifesto = useCallback(async () => {
    const identificador = requisicaoRef.current + 1;
    requisicaoRef.current = identificador;

    setPreparando(true);
    setPronto(false);
    setBufferizando(false);
    setErro('');
    setManifestUri(null);
    setDuracao(0);
    setTempoAtual(0);

    await limparManifestoLocal();

    if (!categoria || !slug) {
      setPreparando(false);
      setErro('Os dados deste vídeo estão incompletos. Volte e tente abrir o título novamente.');
      return;
    }

    try {
      // A chamada ao endpoint da API usa exclusivamente os cabeçalhos persistidos de autenticação.
      const authHeaders = await getAuthHeaders();
      const resposta = await fetch(endpoint, { headers: authHeaders });
      if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);

      const manifesto = await resposta.text();
      if (!manifesto.trim() || !manifesto.includes('#EXTM3U')) {
        throw new Error('O servidor não retornou um manifesto HLS válido.');
      }

      const diretorioCache = FileSystem.cacheDirectory;
      if (!diretorioCache) throw new Error('O diretório de cache do aplicativo não está disponível.');

      const caminhoLocal = `${diretorioCache}tedflix-${nomeSeguro(categoria)}-${nomeSeguro(slug)}-${Date.now()}.m3u8`;
      const manifestoReescrito = reescreverManifestoHls(manifesto, resposta.url || endpoint);
      await FileSystem.writeAsStringAsync(caminhoLocal, manifestoReescrito, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (identificador !== requisicaoRef.current) {
        await FileSystem.deleteAsync(caminhoLocal, { idempotent: true });
        return;
      }

      arquivoManifestoRef.current = caminhoLocal;
      setManifestUri(caminhoLocal);
    } catch (causa) {
      if (identificador !== requisicaoRef.current) return;
      console.error('Erro ao preparar manifesto HLS:', causa);
      setErro('Não foi possível preparar este vídeo. Verifique sua conexão e tente novamente.');
      setPreparando(false);
    }
  }, [categoria, endpoint, limparManifestoLocal, slug]);

  useEffect(() => {
    prepararManifesto();

    return () => {
      requisicaoRef.current += 1;
      clearTimeout(esconderControlesRef.current);
      limparManifestoLocal();
    };
  }, [prepararManifesto, limparManifestoLocal, tentativa]);

  useEffect(() => {
    clearTimeout(esconderControlesRef.current);

    if (pronto && !pausado && mostrarControles && !erro) {
      esconderControlesRef.current = setTimeout(() => setMostrarControles(false), 4300);
    }

    return () => clearTimeout(esconderControlesRef.current);
  }, [erro, pronto, pausado, mostrarControles]);

  const revelarControles = () => {
    setMostrarControles(true);
    clearTimeout(esconderControlesRef.current);
    if (pronto && !pausado && !erro) {
      esconderControlesRef.current = setTimeout(() => setMostrarControles(false), 4300);
    }
  };

  const alternarControles = () => {
    if (mostrarControles) {
      clearTimeout(esconderControlesRef.current);
      setMostrarControles(false);
    } else {
      revelarControles();
    }
  };

  const alternarPausa = () => {
    setPausado((atual) => !atual);
    revelarControles();
  };

  const avancar = (segundos) => {
    if (!duracao) return;
    const proximoTempo = Math.max(0, Math.min(duracao, tempoAtual + segundos));
    videoRef.current?.seek(proximoTempo);
    setTempoAtual(proximoTempo);
    revelarControles();
  };

  const buscarTempo = (posicaoX) => {
    if (!duracao || !larguraProgresso) return;
    const proporcao = Math.max(0, Math.min(1, posicaoX / larguraProgresso));
    const proximoTempo = proporcao * duracao;
    videoRef.current?.seek(proximoTempo);
    setTempoAtual(proximoTempo);
    revelarControles();
  };

  const ajustarVolume = (posicaoX) => {
    if (!larguraVolume) return;
    const proximoVolume = Math.max(0, Math.min(1, posicaoX / larguraVolume));
    setVolume(proximoVolume);
    setMudo(proximoVolume === 0);
    revelarControles();
  };

  const tentarNovamente = () => {
    setTentativa((atual) => atual + 1);
  };

  const voltar = () => {
    if (telaCheia) {
      setTelaCheia(false);
      return;
    }
    navigation.goBack();
  };

  const porcentagemProgresso = duracao > 0 ? Math.min(100, (tempoAtual / duracao) * 100) : 0;
  const porcentagemVolume = Math.min(100, Math.max(0, volume * 100));
  const iconeVolume = mudo || volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-medium' : 'volume-high';

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {manifestUri ? (
        <Video
          key={`${manifestUri}-${tentativa}`}
          ref={videoRef}
          source={{
            uri: manifestUri,
            type: 'm3u8',
            headers: HEADERS_CDN,
          }}
          style={styles.video}
          paused={pausado}
          muted={mudo}
          volume={volume}
          resizeMode="contain"
          fullscreen={telaCheia}
          controls={false}
          progressUpdateInterval={500}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={false}
          onLoadStart={() => {
            setPreparando(true);
            setBufferizando(true);
          }}
          onLoad={(dados) => {
            setDuracao(dados?.duration || 0);
            setPreparando(false);
            setBufferizando(false);
            setPronto(true);
            revelarControles();
          }}
          onProgress={(dados) => setTempoAtual(dados?.currentTime || 0)}
          onBuffer={({ isBuffering }) => setBufferizando(Boolean(isBuffering))}
          onEnd={() => {
            setPausado(true);
            setMostrarControles(true);
            setTempoAtual(duracao);
          }}
          onError={(dados) => {
            console.error('Erro no player HLS:', dados);
            setPreparando(false);
            setBufferizando(false);
            setPronto(false);
            setErro('Não foi possível reproduzir este vídeo agora.');
          }}
          onAudioBecomingNoisy={() => setPausado(true)}
          onFullscreenPlayerDidPresent={() => setTelaCheia(true)}
          onFullscreenPlayerDidDismiss={() => setTelaCheia(false)}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
            backBufferDurationMs: 30000,
          }}
        />
      ) : null}

      <Pressable style={StyleSheet.absoluteFill} onPress={alternarControles} />

      {mostrarControles && !erro ? (
        <View style={styles.controles} pointerEvents="box-none">
          <View style={styles.gradienteTopo} pointerEvents="none" />
          <View style={styles.gradienteInferior} pointerEvents="none" />

          <View style={styles.barraTopo}>
            <TouchableOpacity
              style={styles.botaoTopo}
              onPress={voltar}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
            <TouchableOpacity
              style={styles.botaoTopo}
              onPress={() => setTelaCheia((atual) => !atual)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={telaCheia ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
            >
              <MaterialCommunityIcons name={telaCheia ? 'fullscreen-exit' : 'fullscreen'} size={23} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {!preparando && !bufferizando && pronto ? (
            <View style={styles.controlesCentrais}>
              <TouchableOpacity style={styles.botaoPular} onPress={() => avancar(-10)} activeOpacity={0.72}>
                <MaterialCommunityIcons name="rewind-10" size={34} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoPlay} onPress={alternarPausa} activeOpacity={0.78}>
                <MaterialCommunityIcons name={pausado ? 'play' : 'pause'} size={37} color="#000000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoPular} onPress={() => avancar(10)} activeOpacity={0.72}>
                <MaterialCommunityIcons name="fast-forward-10" size={34} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}

          {!preparando && pronto ? (
            <View style={styles.barraInferior}>
              <View
                style={styles.areaProgresso}
                onLayout={(evento) => setLarguraProgresso(evento.nativeEvent.layout.width)}
              >
                <TouchableWithoutFeedback onPress={(evento) => buscarTempo(evento.nativeEvent.locationX)}>
                  <View style={styles.toqueProgresso}>
                    <View style={styles.trilhaProgresso}>
                      <View style={[styles.progressoPreenchido, { width: `${porcentagemProgresso}%` }]} />
                      <View style={[styles.marcadorProgresso, { left: `${porcentagemProgresso}%` }]} />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>

              <View style={styles.linhaFerramentas}>
                <TouchableOpacity style={styles.botaoFerramenta} onPress={alternarPausa} activeOpacity={0.72}>
                  <MaterialCommunityIcons name={pausado ? 'play' : 'pause'} size={21} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.tempo}>{formatTime(tempoAtual)} / {formatTime(duracao)}</Text>

                <View style={styles.volumeWrap}>
                  <TouchableOpacity
                    style={styles.botaoFerramenta}
                    onPress={() => setMudo((atual) => !atual)}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityLabel={mudo ? 'Ativar som' : 'Silenciar'}
                  >
                    <MaterialCommunityIcons name={iconeVolume} size={21} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View
                    style={styles.areaVolume}
                    onLayout={(evento) => setLarguraVolume(evento.nativeEvent.layout.width)}
                  >
                    <TouchableWithoutFeedback onPress={(evento) => ajustarVolume(evento.nativeEvent.locationX)}>
                      <View style={styles.toqueVolume}>
                        <View style={styles.trilhaVolume}>
                          <View style={[styles.volumePreenchido, { width: `${mudo ? 0 : porcentagemVolume}%` }]} />
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.botaoFerramenta}
                  onPress={() => setTelaCheia((atual) => !atual)}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel={telaCheia ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
                >
                  <MaterialCommunityIcons name={telaCheia ? 'fullscreen-exit' : 'fullscreen'} size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {preparando && !erro ? (
        <View style={styles.estadoOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.estadoOverlayTexto}>Preparando vídeo...</Text>
        </View>
      ) : null}

      {bufferizando && pronto && !pausado && !erro ? (
        <View style={styles.bufferOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      ) : null}

      {erro ? (
        <View style={styles.erroOverlay}>
          <View style={styles.cartaoErro}>
            <MaterialCommunityIcons name="play-circle-outline" size={43} color="#E50914" />
            <Text style={styles.erroTitulo}>Não foi possível reproduzir</Text>
            <Text style={styles.erroTexto}>{erro}</Text>
            <TouchableOpacity style={styles.botaoTentar} onPress={tentarNovamente} activeOpacity={0.8}>
              <MaterialCommunityIcons name="reload" size={18} color="#000000" />
              <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkVoltar} onPress={() => navigation.goBack()} activeOpacity={0.72}>
              <Text style={styles.linkVoltarTexto}>Voltar ao título</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width,
    height,
  },
  controles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  gradienteTopo: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 130,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  gradienteInferior: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 185,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  barraTopo: {
    position: 'absolute',
    top: 37,
    right: 16,
    left: 16,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoTopo: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  titulo: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 13,
    textAlign: 'center',
  },
  controlesCentrais: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  botaoPular: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPlay: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  barraInferior: {
    position: 'absolute',
    right: 17,
    bottom: 17,
    left: 17,
  },
  areaProgresso: {
    height: 24,
    justifyContent: 'center',
  },
  toqueProgresso: {
    height: 24,
    justifyContent: 'center',
  },
  trilhaProgresso: {
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  progressoPreenchido: {
    height: 4,
    borderRadius: 99,
    backgroundColor: '#E50914',
  },
  marcadorProgresso: {
    position: 'absolute',
    top: -3,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  linhaFerramentas: {
    minHeight: 36,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoFerramenta: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempo: {
    color: '#F2F2F2',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    marginLeft: 2,
  },
  volumeWrap: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaVolume: {
    width: 62,
    height: 28,
    justifyContent: 'center',
  },
  toqueVolume: {
    height: 28,
    justifyContent: 'center',
  },
  trilhaVolume: {
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  volumePreenchido: {
    height: 3,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  estadoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  estadoOverlayTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  bufferOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 7,
    marginLeft: -23,
    marginTop: -23,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  erroOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(0,0,0,0.84)',
  },
  cartaoErro: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 25,
    paddingVertical: 28,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2F2F2F',
  },
  erroTitulo: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 12,
  },
  erroTexto: {
    color: '#A8A8A8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  botaoTentar: {
    minHeight: 46,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  botaoTentarTexto: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  linkVoltar: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  linkVoltarTexto: {
    color: '#D8D8D8',
    fontSize: 13,
    fontWeight: '700',
  },
});
