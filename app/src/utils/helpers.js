export function parseCategoriaSlug(link) {
  if (!link) return { categoria: '', slug: '' };

  const caminho = String(link)
    .trim()
    .replace(/[?#].*$/, '')
    .replace(/^[a-z][a-z\d+.-]*:\/\/[^/]+/i, '');
  const partes = caminho.split('/').filter(Boolean);

  if (partes.length < 2) return { categoria: '', slug: '' };

  const indiceTipo = partes.findIndex((parte) => parte === 'filme' || parte === 'serie');
  if (indiceTipo >= 0 && partes.length >= indiceTipo + 3) {
    return {
      categoria: partes[indiceTipo + 1] || '',
      slug: partes[indiceTipo + 2] || '',
    };
  }

  return {
    categoria: partes[partes.length - 2] || '',
    slug: partes[partes.length - 1] || '',
  };
}

export function slugDoFilme(filme) {
  if (!filme) return '';
  if (filme.slug) return String(filme.slug);
  return parseCategoriaSlug(filme.link_assistir || filme.link || '').slug;
}

export function formatTime(valor) {
  const total = Math.max(0, Math.floor(Number(valor) || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const preencher = (numero) => String(numero).padStart(2, '0');

  return horas > 0
    ? `${horas}:${preencher(minutos)}:${preencher(segundos)}`
    : `${preencher(minutos)}:${preencher(segundos)}`;
}

export function ehSerie(tipo) {
  const valor = String(tipo || '').toLocaleLowerCase('pt-BR');
  return valor.includes('série') || valor.includes('serie');
}

export function paraLista(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean).map(String);
  if (!valor) return [];
  return String(valor)
    .split(/[,/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listaDeResposta(dados) {
  if (Array.isArray(dados)) return dados;
  if (!dados || typeof dados !== 'object') return [];

  const candidatos = [
    dados.filmes,
    dados.series,
    dados.animacoes,
    dados.resultados,
    dados.items,
    dados.data,
  ];

  return candidatos.find(Array.isArray) || [];
}

function extrairObjetosConcatenados(texto) {
  const objetos = [];
  let inicio = -1;
  let profundidade = 0;
  let dentroDeString = false;
  let escapando = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];

    if (dentroDeString) {
      if (escapando) {
        escapando = false;
      } else if (caractere === '\\') {
        escapando = true;
      } else if (caractere === '"') {
        dentroDeString = false;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeString = true;
      continue;
    }

    if (caractere === '{') {
      if (profundidade === 0) inicio = indice;
      profundidade += 1;
      continue;
    }

    if (caractere === '}' && profundidade > 0) {
      profundidade -= 1;
      if (profundidade === 0 && inicio >= 0) {
        try {
          objetos.push(JSON.parse(texto.slice(inicio, indice + 1)));
        } catch (erro) {
          // Fragmentos inválidos são ignorados sem interromper a listagem.
        }
        inicio = -1;
      }
    }
  }

  return objetos;
}

/**
 * Trata respostas normais e streams que concatenam objetos JSON sem formar um array válido.
 */
export function parseObjetosStream(texto) {
  if (!texto) return [];

  const bruto = typeof texto === 'string' ? texto.trim() : texto;
  let lista = [];

  if (typeof bruto !== 'string') {
    lista = listaDeResposta(bruto);
  } else {
    try {
      lista = listaDeResposta(JSON.parse(bruto));
    } catch (erro) {
      lista = extrairObjetosConcatenados(bruto).filter((item) => item && item.titulo);
    }
  }

  const vistos = new Set();
  return lista.filter((item) => {
    if (!item || typeof item !== 'object' || !item.titulo) return false;
    const chave = item.slug || item.link_assistir || item.link || `${item.titulo}-${item.ano || ''}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}
