import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import * as FileSystem from 'expo-file-system';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getAuthHeaders } from '../services/api';
import { CONFIG } from '../utils/constants';
import { formatTime } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

// (react-native-fs foi trocado por expo-file-system, já presente no projeto Expo)
// Headers usados SOMENTE nas requisições que o player faz direto pro CDN
// (segmentos .ts). NÃO servem e NÃO devem ser usados pra chamar seu próprio
// STREAM_API — pra isso usamos getAuthHeaders().
const HEADERS_CDN = {
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'pt-BR,pt;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Origin': 'https://novelasflix.video',
  'Referer': 'https://novelasflix.video/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  'Sec-Ch-Ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Brave";v="150"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

export default function PlayerScreen({ route }) {
  const navigation = useNavigation();
  const { categoria, slug, tipo = 'filme', titulo = 'TEDFLIX' } = route.params || {};

  const [pausado, setPausado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [duracao, setDuracao] = useState(0);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [mostrarControles, setMostrarControles] = useState(true);
  const [m3u8Url, setM3u8Url] = useState(null); // agora é um file:// local, não a URL da API

  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const tempFilePathRef = useRef(null);

  function getEndpoint() {
    return tipo === 'episodio'
      ? `${CONFIG.STREAM_API}/episodio/${categoria}/${slug}`
      : `${CONFIG.STREAM_API}/filme-player/${categoria}/${slug}`;
  }

  // 🔥 ÚNICA requisição feita ao seu backend — e é autenticada.
  // O conteúdo retornado (com as URLs .ts já assinadas/reescritas pelo
  // servidor) é salvo localmente e é ISSO que o player vai consumir —
  // sem precisar refazer nenhuma chamada sem auth.
  async function baixarESalvarPlaylist() {
    const authHeaders = await getAuthHeaders();
    const endpoint = getEndpoint();

    console.log('📡 Buscando M3U8 para:', categoria, slug);

    const response = await fetch(endpoint, { headers: authHeaders });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const m3u8Texto = await response.text();
    console.log('📄 M3U8 recebido, tamanho:', m3u8Texto.length);

    const tsUrls = m3u8Texto.match(/https?:\/\/[^\s]+\.ts[^\s]*/g) || [];
    if (tsUrls.length === 0) {
      throw new Error('Nenhum segmento .ts encontrado');
    }
    console.log('📹 Segmentos .ts:', tsUrls.length);
    console.log('🔗 Primeiro segmento:', tsUrls[0]);

    const path = `${FileSystem.cacheDirectory}playlist-${categoria}-${slug}-${Date.now()}.m3u8`;
    await FileSystem.writeAsStringAsync(path, m3u8Texto, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // limpa o arquivo temporário anterior, se existir
    if (tempFilePathRef.current) {
      FileSystem.deleteAsync(tempFilePathRef.current, { idempotent: true }).catch(() => {});
    }
    tempFilePathRef.current = path;

    // FileSystem.cacheDirectory já vem no formato file://...
    return path;
  }

  useEffect(() => {
    async function carregarVideo() {
      try {
        setLoading(true);
        setErro('');
        const localUri = await baixarESalvarPlaylist();
        setM3u8Url(localUri);
      } catch (error) {
        console.error('❌ Erro:', error.message);
        setErro('Não foi possível carregar este vídeo.');
        setLoading(false);
      }
    }

    if (categoria && slug) {
      carregarVideo();
    } else {
      setErro('Dados do vídeo incompletos.');
      setLoading(false);
    }

    return () => {
      clearTimeout(hideTimerRef.current);
      if (tempFilePathRef.current) {
        FileSystem.deleteAsync(tempFilePathRef.current, { idempotent: true }).catch(() => {});
      }
    };
  }, [categoria, slug, tipo]);

  useEffect(() => {
    clearTimeout(hideTimerRef.current);
    if (!pausado && !erro && !loading) {
      hideTimerRef.current = setTimeout(() => setMostrarControles(false), 4000);
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [pausado, erro, loading]);

  const alternarPausa = () => {
    setPausado(!pausado);
    setMostrarControles(true);
  };

  const tentarNovamente = async () => {
    setErro('');
    setLoading(true);
    setM3u8Url(null);
    try {
      const localUri = await baixarESalvarPlaylist();
      setM3u8Url(localUri);
    } catch (error) {
      console.error('❌ Erro ao tentar novamente:', error.message);
      setErro('Não foi possível carregar este vídeo.');
      setLoading(false);
    }
  };

  const porcentagemProgresso = duracao > 0 ? (tempoAtual / duracao) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* 🔥 A source agora é o arquivo m3u8 LOCAL (com URLs .ts já válidas/assinadas).
          O player só precisa de headers pra buscar os segmentos direto no CDN —
          não pra "revalidar" nada com o seu backend. */}
      {m3u8Url && (
        <Video
          ref={videoRef}
          source={{
            uri: m3u8Url,
            type: 'm3u8',
            headers: {
              ...HEADERS_CDN,
              'Referer': `https://novelasflix.video/${categoria}/${slug}/`,
            },
          }}
          style={styles.video}
          paused={pausado}
          resizeMode="contain"
          controls={false}
          onLoadStart={() => {
            console.log('🔄 Video: onLoadStart - URL:', m3u8Url);
          }}
          onLoad={(data) => {
            console.log('✅ Video: onLoad - Duração:', data.duration);
            setLoading(false);
            setErro('');
            setDuracao(data.duration || 0);
          }}
          onProgress={(data) => {
            setTempoAtual(data.currentTime || 0);
          }}
          onError={(e) => {
            console.error('❌ Video: onError -', JSON.stringify(e));
            setLoading(false);
            setErro('Não foi possível reproduzir este vídeo agora.');
          }}
          onBuffer={({ isBuffering }) => {
            console.log('📦 Buffer:', isBuffering);
          }}
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
          }}
        />
      )}

      {/* LOADING */}
      {loading && !erro && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Preparando vídeo...</Text>
        </View>
      )}

      {/* ERRO */}
      {erro && (
        <View style={styles.erroOverlay}>
          <MaterialCommunityIcons name="play-circle-outline" size={50} color="#E50914" />
          <Text style={styles.erroTitulo}>Não foi possível reproduzir</Text>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.botaoTentar} onPress={tentarNovamente}>
            <MaterialCommunityIcons name="reload" size={18} color="#000" />
            <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkVoltar}>
            <Text style={styles.linkVoltarTexto}>Voltar ao título</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTROLES */}
      {!erro && !loading && mostrarControles && m3u8Url && (
        <View style={styles.controles}>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPlay} onPress={alternarPausa}>
            <MaterialCommunityIcons name={pausado ? 'play' : 'pause'} size={30} color="#fff" />
          </TouchableOpacity>

          <View style={styles.barraInferior}>
            <View style={styles.progresso}>
              <View style={styles.trilha}>
                <View style={[styles.preenchido, { width: `${porcentagemProgresso}%` }]} />
              </View>
            </View>
            <Text style={styles.tempo}>
              {formatTime(tempoAtual)} / {formatTime(duracao)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  loadingText: { color: '#fff', marginTop: 10 },
  erroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)', padding: 20 },
  erroTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  erroTexto: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 8 },
  botaoTentar: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20, flexDirection: 'row', alignItems: 'center' },
  botaoTentarTexto: { color: '#000', fontWeight: 'bold', marginLeft: 8 },
  linkVoltar: { marginTop: 12 },
  linkVoltarTexto: { color: '#aaa', fontSize: 14 },
  controles: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  btnVoltar: { position: 'absolute', top: 40, left: 16, zIndex: 10 },
  btnPlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -25 }, { translateY: -25 }], zIndex: 10 },
  barraInferior: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  progresso: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  trilha: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  preenchido: { height: 4, backgroundColor: '#E50914', borderRadius: 2 },
  tempo: { color: '#fff', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
