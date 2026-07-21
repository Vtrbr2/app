import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { alternarFavorito, carregarFavoritos } from '../services/favoritos';
import { parseCategoriaSlug, slugDoFilme } from '../utils/helpers';

const FavoritosContext = createContext(null);

function itemFavorito(filme, slug) {
  const linkAssistir = filme?.link_assistir || filme?.link || '';
  const origem = parseCategoriaSlug(linkAssistir);

  return {
    slug,
    categoria: filme?.categoria || origem.categoria || '',
    link_assistir: linkAssistir,
    titulo: filme?.titulo || '',
    imagem: filme?.imagem || '',
    ano: filme?.ano || '',
    tipo: filme?.tipo || '',
    nota: filme?.nota || '',
  };
}

function atualizarItens(itens, filme, slug, deveFavoritar) {
  const semDuplicado = itens.filter((item) => item.slug !== slug);
  return deveFavoritar ? [...semDuplicado, itemFavorito(filme, slug)] : semDuplicado;
}

export function FavoritosProvider({ children }) {
  const [favoritosItens, setFavoritosItens] = useState([]);
  const [carregandoFavoritos, setCarregandoFavoritos] = useState(true);

  const favoritosSlugs = useMemo(
    () => new Set(favoritosItens.map((item) => item.slug).filter(Boolean)),
    [favoritosItens]
  );

  const recarregar = useCallback(async () => {
    setCarregandoFavoritos(true);
    const itens = await carregarFavoritos();
    setFavoritosItens(Array.isArray(itens) ? itens : []);
    setCarregandoFavoritos(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const toggle = useCallback(
    async (filme) => {
      const slug = slugDoFilme(filme);
      if (!slug) return { success: false, isFavorito: false };

      const eraFavorito = favoritosSlugs.has(slug);
      const proximoEstado = !eraFavorito;

      setFavoritosItens((atuais) => atualizarItens(atuais, filme, slug, proximoEstado));

      const resposta = await alternarFavorito(filme);
      const confirmouEstado = resposta?.success && typeof resposta.isFavorito === 'boolean'
        ? resposta.isFavorito
        : eraFavorito;

      if (!resposta?.success || confirmouEstado !== proximoEstado) {
        setFavoritosItens((atuais) => atualizarItens(atuais, filme, slug, confirmouEstado));
      }

      return resposta || { success: false, isFavorito: eraFavorito };
    },
    [favoritosSlugs]
  );

  const value = useMemo(
    () => ({
      favoritosItens,
      favoritosSlugs,
      carregandoFavoritos,
      recarregar,
      toggle,
    }),
    [carregandoFavoritos, favoritosItens, favoritosSlugs, recarregar, toggle]
  );

  return <FavoritosContext.Provider value={value}>{children}</FavoritosContext.Provider>;
}

export default function useFavoritos() {
  const contexto = useContext(FavoritosContext);

  if (!contexto) {
    throw new Error('useFavoritos deve ser usado dentro de FavoritosProvider.');
  }

  return contexto;
}
