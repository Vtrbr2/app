import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../utils/constants';

export async function salvarCache(data) {
  try {
    await AsyncStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Erro ao salvar cache:', e);
    return false;
  }
}

export async function carregarCache() {
  try {
    const data = await AsyncStorage.getItem(CONFIG.CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Erro ao carregar cache:', e);
    return null;
  }
}

export async function limparCache() {
  try {
    await AsyncStorage.removeItem(CONFIG.CACHE_KEY);
    return true;
  } catch (e) {
    console.error('Erro ao limpar cache:', e);
    return false;
  }
}

export function gerarDeviceId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 9; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function gerarHash(codigo, deviceId) {
  const codePart = codigo.substring(0, 4);
  const devicePart = deviceId.substring(0, 3);
  return `${codePart}-${devicePart}`;
}
