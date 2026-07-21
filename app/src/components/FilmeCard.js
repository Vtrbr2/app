import React, { useState } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function FilmeCard({
  filme,
  favorito = false,
  onPress,
  onToggleFavorito,
  width = 132,
  height,
  compact = false,
}) {
  const [carregando, setCarregando] = useState(false);
  const [imagemIndisponivel, setImagemIndisponivel] = useState(false);

  const favoritar = async () => {
    if (!onToggleFavorito || carregando) return;
    setCarregando(true);
    try {
      await onToggleFavorito(filme);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width }, compact && styles.cardCompacta]}
      onPress={() => onPress?.(filme)}
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${filme?.titulo || 'título'}`}
    >
      <View style={[styles.posterWrap, height ? { height } : styles.posterProporcional]}>
        {!imagemIndisponivel && filme?.imagem ? (
          <Image
            source={{ uri: filme.imagem }}
            style={styles.imagem}
            resizeMode="cover"
            onError={() => setImagemIndisponivel(true)}
          />
        ) : (
          <View style={styles.posterIndisponivel}>
            <MaterialCommunityIcons name="movie-open-outline" size={28} color="#5A5A5A" />
          </View>
        )}

        {onToggleFavorito ? (
          <TouchableOpacity
            style={[styles.favBtn, favorito && styles.favBtnAtivo, carregando && styles.favBtnCarregando]}
            onPress={(evento) => {
              evento.stopPropagation?.();
              favoritar();
            }}
            disabled={carregando}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <MaterialCommunityIcons
              name={favorito ? 'heart' : 'heart-outline'}
              size={17}
              color={favorito ? '#E50914' : '#FFFFFF'}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.info}>
        {filme?.ano ? <Text style={styles.ano}>{filme.ano}</Text> : <View style={styles.anoVazio} />}
        <Text style={styles.titulo} numberOfLines={1}>{filme?.titulo || 'Sem título'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.065)',
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  cardCompacta: {
    borderRadius: 8,
  },
  posterWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0D0D0D',
  },
  posterProporcional: {
    aspectRatio: 2 / 3,
  },
  imagem: {
    width: '100%',
    height: '100%',
  },
  posterIndisponivel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  info: {
    minHeight: 49,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  ano: {
    color: '#46D369',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
  },
  anoVazio: {
    height: 13,
  },
  titulo: {
    color: '#EAEAEA',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
    fontWeight: '500',
  },
  favBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnAtivo: {
    borderColor: 'rgba(229,9,20,0.9)',
  },
  favBtnCarregando: {
    opacity: 0.48,
  },
});
