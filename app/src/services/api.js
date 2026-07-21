import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../utils/constants';

export async function getAuthHeaders() {
  try {
    const cache = await AsyncStorage.getItem(CONFIG.CACHE_KEY);
    if (cache) {
      const data = JSON.parse(cache);
      if (data.deviceId && data.codigoHash) {
        return {
          'X-Device-ID': data.deviceId,
          'X-Code-Hash': data.codigoHash,
        };
      }
    }
  } catch (e) {
    console.error('Erro ao obter headers:', e);
  }
  return {};
}

// Igual ao getAuthHeaders, mas também devolve o deviceId separado —
// usado nas telas de Favoritos, que precisam do id cru além dos headers.
export async function getDeviceId() {
  try {
    const cache = await AsyncStorage.getItem(CONFIG.CACHE_KEY);
    if (cache) {
      const data = JSON.parse(cache);
      return data.deviceId || null;
    }
  } catch (e) {
    console.error('Erro ao obter deviceId:', e);
  }
  return null;
}

export async function apiFetch(url, options = {}) {
  const headers = await getAuthHeaders();
  const config = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
      'Content-Type': options.body ? 'application/json' : undefined,
    },
  };

  if (!options.body) {
    delete config.headers['Content-Type'];
  }

  return fetch(url, config);
}
