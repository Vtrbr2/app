import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { CONFIG } from '../utils/constants';
import { gerarDeviceId, gerarHash, salvarCache, carregarCache, limparCache } from '../services/auth';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [autoValidando, setAutoValidando] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    verificarCache();
  }, []);

  const verificarCache = async () => {
    try {
      const cache = await carregarCache();
      if (cache && cache.deviceId && cache.codigoHash) {
        setSucesso('🔄 Validando acesso...');
        await autoValidar(cache);
        return;
      }
      setAutoValidando(false);
      inputRef.current?.focus();
    } catch (e) {
      console.error('Erro ao verificar cache:', e);
      setAutoValidando(false);
    }
  };

  const autoValidar = async (cache) => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/auto-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': cache.deviceId,
          'X-Code-Hash': cache.codigoHash,
        },
      });
      const data = await response.json();

      if (response.ok && data.valid) {
        setSucesso('✅ Acesso liberado!');
        setTimeout(() => {
          navigation.replace('Home', {
            deviceId: cache.deviceId,
            codeHash: cache.codigoHash,
          });
        }, 1000);
        return;
      }

      await limparCache();
      setAutoValidando(false);
      setSucesso('');
      inputRef.current?.focus();
    } catch (e) {
      console.error('Erro na auto-validação:', e);
      setAutoValidando(false);
    }
  };

  const fazerLogin = async () => {
    const codigoLimpo = codigo.trim().toUpperCase();

    if (!codigoLimpo || codigoLimpo.length === 0) {
      setError('📝 Digite o código de acesso');
      return;
    }
    if (codigoLimpo.length !== CONFIG.CODE_LENGTH) {
      setError(`📏 O código deve ter ${CONFIG.CODE_LENGTH} caracteres`);
      return;
    }
    const regex = /^[A-Z0-9]{9}$/;
    if (!regex.test(codigoLimpo)) {
      setError('🔤 Use apenas letras maiúsculas e números');
      return;
    }

    setError('');
    setSucesso('');
    setLoading(true);

    try {
      const deviceId = gerarDeviceId();
      const response = await fetch(`${CONFIG.API_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoLimpo, deviceId }),
      });
      const data = await response.json();

      if (response.ok) {
        const codigoHash = gerarHash(codigoLimpo, deviceId);
        await salvarCache({
          deviceId,
          codigoHash,
          codigo: codigoLimpo,
          expiresAt: data.expiresAt || null,
          loginAt: new Date().toISOString(),
        });

        setSucesso('✅ Acesso liberado!');
        setTimeout(() => {
          navigation.replace('Home', { deviceId, codeHash: codigoHash });
        }, 1500);
      } else {
        setError(data.message || '❌ Código inválido');
        setCodigo('');
        inputRef.current?.focus();
      }
    } catch (e) {
      setError('🔌 Erro de conexão com o servidor');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (autoValidando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Validando acesso...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ImageBackground
        source={{ uri: 'https://frontend-stream-tedflix.vercel.app/banner/banner.png' }}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        />

        <Image
          source={{ uri: 'https://frontend-stream-tedflix.vercel.app/logo/logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.content}>
          <Text style={styles.introTitle}>Filmes, séries e muito mais</Text>
          <Text style={styles.introSubtitle}>
            Digite o código exibido na sua tela para ativar o acesso.
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeBoxTitle}>CÓDIGO DE ACESSO</Text>
            <TextInput
              ref={inputRef}
              style={styles.codeInput}
              placeholder="123456789"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={codigo}
              onChangeText={(text) => {
                const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setCodigo(upper);
                setError('');
                setSucesso('');
              }}
              maxLength={CONFIG.CODE_LENGTH}
              autoCapitalize="characters"
              returnKeyType="go"
              onSubmitEditing={fazerLogin}
              editable={!loading}
            />
          </View>

          {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
          {sucesso ? <Text style={styles.successMessage}>{sucesso}</Text> : null}

          <TouchableOpacity
            style={[styles.enterButton, loading && styles.enterButtonDisabled]}
            onPress={fazerLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.enterButtonText}>ENTRAR</Text>
            )}
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  logo: { position: 'absolute', top: 32, left: 48, width: 120, height: 40, zIndex: 2 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 1 },
  introTitle: { fontSize: Math.min(42, width * 0.065), fontWeight: '700', color: '#fff', textAlign: 'center', maxWidth: 700, marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  introSubtitle: { fontSize: Math.min(17, width * 0.032), fontWeight: '400', color: 'rgba(255,255,255,0.75)', textAlign: 'center', maxWidth: 520, marginBottom: 46 },
  codeBox: { width: '100%', maxWidth: 420, paddingVertical: 38, paddingHorizontal: 24, borderRadius: 16, backgroundColor: 'rgba(15,15,15,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  codeBoxTitle: { fontSize: Math.min(16, width * 0.03), fontWeight: '700', letterSpacing: 4, color: 'rgba(255,255,255,0.6)', marginBottom: 22, textAlign: 'center' },
  codeInput: { width: '100%', height: 68, backgroundColor: '#0a0a0a', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 30, textAlign: 'center', letterSpacing: 10, paddingHorizontal: 10 },
  errorMessage: { color: '#E50914', textAlign: 'center', marginTop: 16, fontSize: 14, fontWeight: 'bold', backgroundColor: 'rgba(229,9,20,0.1)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)', maxWidth: 420, width: '100%' },
  successMessage: { color: '#00ff88', textAlign: 'center', marginTop: 16, fontSize: 14, fontWeight: 'bold', backgroundColor: 'rgba(0,255,136,0.1)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,255,136,0.3)', maxWidth: 420, width: '100%' },
  enterButton: { marginTop: 30, width: '100%', maxWidth: 420, height: 60, borderRadius: 10, backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center', shadowColor: '#E50914', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 8 },
  enterButtonDisabled: { opacity: 0.7 },
  enterButtonText: { color: '#fff', fontSize: 19, fontWeight: '700', letterSpacing: 1 },
});
