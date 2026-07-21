import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../services/api';
import { CONFIG } from '../utils/constants';
import { slugDoFilme } from '../utils/helpers';
import FilmeCard from '../components/FilmeCard';
import useFavoritos from '../hooks/useFavoritos';

const { width } = Dimensions.get('window');
const LARGURA_CARD = (width - 54) / 2;
const TECLAS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

export default function BuscaScreen() {
  const navigation = useNavigation();
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [buscando, setBuscando] = useState(false);
  const idBuscaRef = useRef(0);

  const { favoritosSlugs, toggle } = useFavoritos();

  useEffect(() => {
    const termo = texto.trim();
    idBuscaRef.current += 1;
    const idBusca = idBuscaRef.current;

    if (termo.length < 2) {
      setResultados([]);
      setMensagem('');
      setBuscando(false);
      return undefined;
    }

    setBuscando(true);
    setMensagem('Buscando títulos...');

    const temporizador = setTimeout(async () => {
      try {
        const resposta = await apiFetch(`${CONFIG.STREAM_API}/buscar/${encodeURIComponent(termo)}`);
        if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);
        const dados = await resposta.json();
        if (idBusca !== idBuscaRef.current) return;

        const encontrados = Array.isArray(dados?.resultados) ? dados.resultados : [];
        setResultados(encontrados);
        setMensagem(
          encontrados.length
            ? `${dados?.total ?? encontrados.length} resultado${(dados?.total ?? encontrados.length) === 1 ? '' : 's'} para “${termo}”`
            : dados?.mensagem || `Nenhum título encontrado para “${termo}”.`
        );
      } catch (causa) {
        if (idBusca !== idBuscaRef.current) return;
        console.error('Erro na busca:', causa);
        setResultados([]);
        setMensagem('Não foi possível concluir sua busca. Tente novamente.');
      } finally {
        if (idBusca === idBuscaRef.current) setBuscando(false);
      }
    }, 350);

    return () => clearTimeout(temporizador);
  }, [texto]);

  const adicionar = (tecla) => setTexto((valor) => `${valor}${tecla}`);
  const apagar = () => setTexto((valor) => valor.slice(0, -1));
  const abrirDetalhe = (filme) => navigation.navigate('Detalhes', { filme });

  const conteudoVazio = () => {
    if (buscando) {
      return (
        <View style={styles.estadoBusca}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.estadoTexto}>Buscando no catálogo...</Text>
        </View>
      );
    }

    if (texto.trim().length >= 2) {
      return (
        <View style={styles.estadoBusca}>
          <MaterialCommunityIcons name="movie-search-outline" size={41} color="#777777" />
          <Text style={styles.estadoTexto}>{mensagem}</Text>
        </View>
      );
    }

    return (
      <View style={styles.estadoBusca}>
        <MaterialCommunityIcons name="magnify" size={42} color="#777777" />
        <Text style={styles.estadoTexto}>Use o teclado abaixo para encontrar filmes, séries e animes.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.cabecalho}>
        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={() => navigation.goBack()}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Fechar busca"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Buscar</Text>
      </View>

      <View style={styles.campoBusca}>
        <MaterialCommunityIcons name="magnify" size={21} color="#9B9B9B" />
        <Text style={[styles.valorBusca, !texto && styles.valorPlaceholder]} numberOfLines={1}>
          {texto || 'Digite o que deseja assistir'}
          {texto ? <Text style={styles.cursor}>|</Text> : null}
        </Text>
        {buscando ? <ActivityIndicator size="small" color="#E50914" /> : null}
        {!!texto && !buscando ? (
          <TouchableOpacity onPress={() => setTexto('')} style={styles.botaoLimpar} accessibilityLabel="Limpar busca">
            <MaterialCommunityIcons name="close-circle" size={20} color="#8A8A8A" />
          </TouchableOpacity>
        ) : null}
      </View>

      {mensagem && resultados.length ? <Text style={styles.status}>{mensagem}</Text> : null}

      <FlatList
        data={resultados}
        renderItem={({ item }) => (
          <FilmeCard
            filme={item}
            favorito={favoritosSlugs.has(slugDoFilme(item))}
            onPress={abrirDetalhe}
            onToggleFavorito={toggle}
            width={LARGURA_CARD}
          />
        )}
        keyExtractor={(item, indice) => `busca-${slugDoFilme(item) || indice}`}
        numColumns={2}
        contentContainerStyle={[styles.grid, !resultados.length && styles.gridVazia]}
        columnWrapperStyle={resultados.length ? styles.gridLinha : undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={conteudoVazio}
      />

      <View style={styles.teclado}>
        <View style={styles.teclas}>
          {TECLAS.map((tecla) => (
            <TouchableOpacity
              key={tecla}
              style={styles.tecla}
              onPress={() => adicionar(tecla)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${tecla}`}
            >
              <Text style={styles.teclaTexto}>{tecla.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.teclaEspecial, styles.teclaEspaco]}
            onPress={() => adicionar(' ')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Adicionar espaço"
          >
            <MaterialCommunityIcons name="keyboard-space" size={23} color="#FFFFFF" />
            <Text style={styles.teclaEspecialTexto}>ESPAÇO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teclaEspecial, styles.teclaApagar]}
            onPress={apagar}
            activeOpacity={0.7}
            disabled={!texto}
            accessibilityRole="button"
            accessibilityLabel="Apagar último caractere"
          >
            <MaterialCommunityIcons name="backspace-outline" size={22} color={texto ? '#FFFFFF' : '#666666'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cabecalho: {
    paddingTop: 46,
    minHeight: 92,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoVoltar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginLeft: 3,
  },
  campoBusca: {
    minHeight: 54,
    marginHorizontal: 18,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111111',
    borderWidth: 1.5,
    borderColor: '#323232',
  },
  valorBusca: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  valorPlaceholder: {
    color: '#777777',
    fontWeight: '400',
  },
  cursor: {
    color: '#E50914',
    fontWeight: '400',
  },
  botaoLimpar: {
    padding: 3,
  },
  status: {
    color: '#999999',
    fontSize: 12,
    marginTop: 11,
    marginHorizontal: 19,
  },
  grid: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  gridVazia: {
    flexGrow: 1,
  },
  gridLinha: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  estadoBusca: {
    flex: 1,
    minHeight: 205,
    paddingHorizontal: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoTexto: {
    maxWidth: 290,
    color: '#8E8E8E',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13,
  },
  teclado: {
    backgroundColor: '#080808',
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 14,
  },
  teclas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 7,
  },
  tecla: {
    width: '15.15%',
    height: 38,
    borderRadius: 8,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teclaTexto: {
    color: '#F5F5F5',
    fontSize: 13,
    fontWeight: '700',
  },
  teclaEspecial: {
    height: 41,
    borderRadius: 9,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#3B3B3B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  teclaEspaco: {
    width: '67.5%',
  },
  teclaApagar: {
    width: '30.5%',
  },
  teclaEspecialTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
