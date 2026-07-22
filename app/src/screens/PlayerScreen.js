import React, { useState, useRef, useEffect } from 'react';
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

const HEADERS_CDN = {
  Origin: 'https://novelasflix.video',
  Referer: 'https://novelasflix.video/',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36',
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
  const [authHeaders, setAuthHeaders] = useState({});

  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);

  // 🔥 CONSTRÓI A URL DO ENDPOINT
  const endpoint = tipo === 'episodio'
    ? `${CONFIG.STREAM_API}/episodio/${categoria}/${slug}`
    : `${CONFIG.STREAM_API}/filme-player/${categoria}/${slug}`;

  // 🔥 PEGA OS HEADERS DE AUTENTICAÇÃO
  useEffect(() => {
    getAuthHeaders().then(headers => setAuthHeaders(headers));
  }, []);

  // 🔥 CONTROLES DE OCULTAÇÃO
  useEffect(() => {
    clearTimeout(hideTimerRef.current);
    if (!pausado && !erro) {
      hideTimerRef.current = setTimeout(() => setMostrarControles(false), 4000);
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [pausado, erro]);

  const alternarPausa = () => {
    setPausado(!pausado);
    setMostrarControles(true);
  };

  const tentarNovamente = () => {
    setErro('');
    setLoading(true);
  };

  const porcentagemProgresso = duracao > 0 ? (tempoAtual / duracao) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* 🔥 PLAYER COM URL DIRETA, SEM ARQUIVO LOCAL */}
      <Video
        ref={videoRef}
        source={{
          uri: endpoint,
          type: 'm3u8',
          headers: {
            ...HEADERS_CDN,
            ...authHeaders,
          },
        }}
        style={styles.video}
        paused={pausado}
        resizeMode="contain"
        controls={false}
        onLoadStart={() => setLoading(true)}
        onLoad={(data) => {
          setLoading(false);
          setErro('');
          setDuracao(data.duration || 0);
        }}
        onProgress={(data) => setTempoAtual(data.currentTime || 0)}
        onError={(e) => {
          console.error('Erro no player:', e);
          setLoading(false);
          setErro('Não foi possível reproduzir este vídeo agora.');
        }}
        bufferConfig={{
          minBufferMs: 15000,
          maxBufferMs: 50000,
          bufferForPlaybackMs: 2500,
        }}
      />

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
            <Text style={styles.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkVoltar}>Voltar ao título</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTROLES */}
      {!erro && mostrarControles && (
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
  botaoTentar: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  botaoTentarTexto: { color: '#000', fontWeight: 'bold' },
  linkVoltar: { color: '#aaa', marginTop: 12 },
  controles: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  btnVoltar: { position: 'absolute', top: 40, left: 16 },
  btnPlay: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -25 }, { translateY: -25 }] },
  barraInferior: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  progresso: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  trilha: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  preenchido: { height: 4, backgroundColor: '#E50914', borderRadius: 2 },
  tempo: { color: '#fff', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
