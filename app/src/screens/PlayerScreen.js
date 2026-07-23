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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getAuthHeaders } from '../services/api';
import { CONFIG } from '../utils/constants';
import { formatTime } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen({ route }) {
  const navigation = useNavigation();
  const { categoria, slug, tipo = 'filme', titulo = 'TEDFLIX' } = route.params || {};

  const [pausado, setPausado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [duracao, setDuracao] = useState(0);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [mostrarControles, setMostrarControles] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);

  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);

  // 🔥 CONSTRÓI A URL DO M3U8 (É UMA URL HTTP!)
  const endpoint = tipo === 'episodio'
    ? `${CONFIG.STREAM_API}/episodio/${categoria}/${slug}`
    : `${CONFIG.STREAM_API}/filme-player/${categoria}/${slug}`;

  useEffect(() => {
    async function carregarVideo() {
      try {
        setLoading(true);
        setErro('');

        // 🔥 SÓ VERIFICA SE O ENDPOINT RESPONDE (OPCIONAL)
        const authHeaders = await getAuthHeaders();
        const response = await fetch(endpoint, { headers: authHeaders });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const m3u8Texto = await response.text();
        const tsUrls = m3u8Texto.match(/https?:\/\/[^\s]+\.ts/g) || [];

        if (tsUrls.length === 0) {
          throw new Error('Nenhum segmento .ts encontrado');
        }

        console.log(`📹 ${tsUrls.length} segmentos encontrados.`);

        // 🔥 PASSA A URL DO ENDPOINT DIRETO PARA O PLAYER
        // O react-native-video VAI BAIXAR O .M3U8 VIA HTTP
        setVideoUrl(endpoint);
        setLoading(false);

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

    return () => clearTimeout(hideTimerRef.current);
  }, [categoria, slug, endpoint]);

  // 🔥 OCULTAR CONTROLES
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

  const tentarNovamente = () => {
    setErro('');
    setLoading(true);
    setVideoUrl(null);
    setTimeout(() => setVideoUrl(endpoint), 100);
  };

  const porcentagemProgresso = duracao > 0 ? (tempoAtual / duracao) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {videoUrl && (
        <Video
          ref={videoRef}
          source={{
            uri: videoUrl,
            type: 'm3u8',
            headers: {
              'Referer': `https://novelasflix.video/${categoria}/${slug}/`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Origin': 'https://novelasflix.video',
              'Accept': '*/*',
            },
          }}
          style={styles.video}
          paused={pausado}
          resizeMode="contain"
          controls={false}
          onLoadStart={() => console.log('🔄 Video: onLoadStart')}
          onLoad={(data) => {
            console.log('✅ Video: onLoad - Duração:', data.duration);
            setLoading(false);
            setErro('');
            setDuracao(data.duration || 0);
          }}
          onProgress={(data) => setTempoAtual(data.currentTime || 0)}
          onError={(e) => {
            console.error('❌ Video: onError -', JSON.stringify(e));
            setLoading(false);
            setErro('Não foi possível reproduzir este vídeo agora.');
          }}
          onBuffer={({ isBuffering }) => console.log('📦 Buffer:', isBuffering)}
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
      {!erro && !loading && mostrarControles && videoUrl && (
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
  loadingText: { color: '#fff', marginTop: 10, fontSize: 14 },
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
