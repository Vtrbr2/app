import { apiFetch, getDeviceId } from './api';
import { CONFIG } from '../utils/constants';
import { parseCategoriaSlug } from '../utils/helpers';

export async function carregarFavoritos() {
  const deviceId = await getDeviceId();
  if (!deviceId) return [];

  try {
    const resp = await apiFetch(`${CONFIG.STREAM_API}/favoritos/${deviceId}`);
    const dados = await resp.json();
    return (dados && dados.filmes) || [];
  } catch (e) {
    console.error('Erro ao carregar favoritos:', e);
    return [];
  }
}

export async function alternarFavorito(filme) {
  const deviceId = await getDeviceId();
  if (!deviceId) return null;

  const linkOrigem = filme.link_assistir || filme.link || '';
  const { categoria: categoriaLink, slug: slugLink } = parseCategoriaSlug(linkOrigem);
  const slugFinal = filme.slug || slugLink;
  const categoriaFinal = filme.categoria || categoriaLink;

  if (!slugFinal) return null;

  try {
    const resp = await apiFetch(`${CONFIG.STREAM_API}/favoritos/toggle`, {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        slug: slugFinal,
        categoria: categoriaFinal,
        link_assistir: linkOrigem,
        titulo: filme.titulo,
        imagem: filme.imagem,
        ano: filme.ano,
        tipo: filme.tipo,
        nota: filme.nota,
      }),
    });
    const dados = await resp.json();
    return { ...dados, slug: slugFinal };
  } catch (e) {
    console.error('Erro ao favoritar:', e);
    return null;
  }
}
