export const CONFIG = {
  API_URL: 'https://admin-tedflix.onrender.com',
  STREAM_API: 'https://ted.cryptitys.site/api',
  CACHE_KEY: 'cryptitys_cache',
  CODE_LENGTH: 9,
  MAX_ATTEMPTS: 5,
  BLOCK_TIME: 15 * 60 * 1000,
};

// Mesmos gêneros/endpoints dedicados usados no site (frontend web),
// nessa ordem fixa de exibição no menu de categorias.
export const GENEROS_DEDICADOS = {
  acao: { url: `${CONFIG.STREAM_API}/genero/acao/stream`, titulo: 'Ação' },
  aventura: { url: `${CONFIG.STREAM_API}/genero/aventura/stream`, titulo: 'Aventura' },
  comedia: { url: `${CONFIG.STREAM_API}/genero/comedia/stream`, titulo: 'Comédia' },
  drama: { url: `${CONFIG.STREAM_API}/genero/drama/stream`, titulo: 'Drama' },
  'ficcao-cientifica': { url: `${CONFIG.STREAM_API}/genero/ficcao-cientifica/stream`, titulo: 'Ficção Científica' },
  romance: { url: `${CONFIG.STREAM_API}/genero/romance/stream`, titulo: 'Romance' },
  suspense: { url: `${CONFIG.STREAM_API}/genero/suspense/stream`, titulo: 'Suspense' },
  terror: { url: `${CONFIG.STREAM_API}/genero/terror/stream`, titulo: 'Terror' },
  animacao: { url: `${CONFIG.STREAM_API}/animacoes/stream`, titulo: 'Animação' },
};

export const CATEGORIAS = Object.keys(GENEROS_DEDICADOS).map((slug) => ({
  slug,
  titulo: GENEROS_DEDICADOS[slug].titulo,
}));

// Itens do menu de navegação (igual ao header do site)
export const NAV_ITEMS = [
  { key: 'inicio', titulo: 'Início' },
  { key: 'filmes', titulo: 'Filmes', url: `${CONFIG.STREAM_API}/filmes/stream` },
  { key: 'series', titulo: 'Séries', url: `${CONFIG.STREAM_API}/series/stream` },
  { key: 'animes', titulo: 'Animes', url: `${CONFIG.STREAM_API}/animacoes/stream` },
  { key: 'favoritos', titulo: 'Favoritos' },
];

export const COLORS = {
  primary: '#E50914',
  background: '#000000',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  cardBackground: '#0a0a0a',
  border: 'rgba(255,255,255,0.12)',
  success: '#00ff88',
  error: '#E50914',
};
