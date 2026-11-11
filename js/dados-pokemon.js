/* Dados dos Pokémon: baixados da PokéAPI (CSV oficiais do repositório) e guardados em cache no navegador. */
const TIPOS = [null, 'Normal', 'Lutador', 'Voador', 'Venenoso', 'Terrestre', 'Pedra', 'Inseto', 'Fantasma', 'Aço',
  'Fogo', 'Água', 'Planta', 'Elétrico', 'Psíquico', 'Gelo', 'Dragão', 'Sombrio', 'Fada'];
const CORES_PK = [null, 'Preto', 'Azul', 'Marrom', 'Cinza', 'Verde', 'Rosa', 'Roxo', 'Vermelho', 'Branco', 'Amarelo'];
const COR_TIPO = { Normal: '#a8a77a', Lutador: '#c22e28', Voador: '#a98ff3', Venenoso: '#a33ea1', Terrestre: '#e2bf65', Pedra: '#b6a136',
  Inseto: '#a6b91a', Fantasma: '#735797', 'Aço': '#b7b7ce', Fogo: '#ee8130', 'Água': '#6390f0', Planta: '#7ac74c', 'Elétrico': '#f7d02c',
  'Psíquico': '#f95587', Gelo: '#96d9d6', 'Dragão': '#6f35fc', Sombrio: '#705746', Fada: '#d685ad' };

/* Iniciais da Geração 10 (Pokémon Winds & Waves, 2027) — ainda não estão na PokéAPI.
   Número na Pokédex e cor oficial ainda não foram divulgados. */
const GEN10 = [
  { nome: 'Browt', ja: 'ハブロウ', roma: 'Haburou', t1: 12, alt: 0.3, peso: 3.5 },
  { nome: 'Pombon', ja: 'ポムケン', roma: 'Pomuken', t1: 10, alt: 0.4, peso: 6.7 },
  { nome: 'Gecqua', ja: 'ミオリー', roma: 'Miori', t1: 11, alt: 0.3, peso: 4.3 },
];

const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const ARTE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const SPRITE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const CACHE_PK = 'htp_pokemon_v1';

function parseCSV(txt) {
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      if (linha.length > 1 || linha[0] !== '') linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  const cab = linhas.shift();
  return linhas.map(l => Object.fromEntries(cab.map((h, i) => [h, l[i]])));
}

const Pokemon = {
  lista: [],
  pronto: false,

  async carregar(aoProgresso = () => {}) {
    const cache = U.ler(CACHE_PK, null);
    if (cache && cache.length > 1000) { this.montar(cache); return; }
    const arquivos = ['pokemon_species', 'pokemon_species_names', 'pokemon', 'pokemon_types'];
    let feitos = 0;
    const textos = await Promise.all(arquivos.map(async a => {
      const r = await fetch(CSV_BASE + a + '.csv');
      if (!r.ok) throw new Error('Falha ao baixar ' + a);
      const t = await r.text(); aoProgresso(++feitos / arquivos.length); return t;
    }));
    const [esp, nomes, pk, tipos] = textos.map(parseCSV);

    const porEsp = new Map();
    for (const e of esp) {
      const id = +e.id; if (id > 2000) continue;
      porEsp.set(id, { id, gen: +e.generation_id, de: e.evolves_from_species_id ? +e.evolves_from_species_id : 0,
        cor: +e.color_id, lend: e.is_legendary === '1', mit: e.is_mythical === '1' });
    }
    for (const n of nomes) {
      const s = porEsp.get(+n.pokemon_species_id); if (!s) continue;
      const lg = +n.local_language_id;
      if (lg === 9) { s.nome = n.name; s.genus = n.genus; }
      else if (lg === 1) s.ja = n.name;
      else if (lg === 2) s.roma = n.name;
      else if (lg === 11 && !s.ja) s.ja = n.name;
    }
    const tiposPorPk = new Map();
    for (const t of tipos) {
      const pid = +t.pokemon_id;
      if (!tiposPorPk.has(pid)) tiposPorPk.set(pid, []);
      tiposPorPk.get(pid)[+t.slot - 1] = +t.type_id;
    }
    for (const p of pk) {
      if (p.is_default !== '1') continue;
      const s = porEsp.get(+p.species_id); if (!s) continue;
      s.alt = +p.height / 10; s.peso = +p.weight / 10;
      const tt = tiposPorPk.get(+p.id) || [];
      s.t1 = tt[0] || 0; s.t2 = tt[1] || 0;
    }
    // estágio evolutivo
    const estagio = (s) => { let n = 1, cur = s; while (cur && cur.de) { n++; cur = porEsp.get(cur.de); if (n > 4) break; } return n; };
    const compacto = [];
    for (const s of [...porEsp.values()].sort((a, b) => a.id - b.id)) {
      if (!s.nome) continue;
      compacto.push([s.id, s.nome, s.ja || '', s.roma || '', s.gen, s.t1, s.t2, s.cor, estagio(s), s.alt, s.peso, s.lend ? 1 : s.mit ? 2 : 0, s.genus || '']);
    }
    U.gravar(CACHE_PK, compacto);
    this.montar(compacto);
  },

  montar(compacto) {
    this.lista = compacto.map(([num, nome, ja, roma, gen, t1, t2, cor, est, alt, peso, raro, genus]) => ({
      id: 'p' + num, tipo: 'pokemon', num, nome, rotulo: nome, ja, roma, gen,
      t1: TIPOS[t1] || '?', t2: TIPOS[t2] || 'Nenhum', cor: CORES_PK[cor] || '?', estagio: est, alt, peso, raro, genus,
      img: ARTE(num), sprite: SPRITE(num), chaves: [U.chave(nome)],
    }));
    GEN10.forEach((g, i) => this.lista.push({
      id: 'g10_' + i, tipo: 'pokemon', num: 0, nome: g.nome, rotulo: g.nome, ja: g.ja, roma: g.roma, gen: 10,
      t1: TIPOS[g.t1], t2: 'Nenhum', cor: '?', estagio: 1, alt: g.alt, peso: g.peso, raro: 0, genus: '',
      img: null, sprite: null, chaves: [U.chave(g.nome)], semDados: true,
    }));
    this.pronto = true;
  },

  limparCache() { localStorage.removeItem(CACHE_PK); },

  geracoesAtivas() { return U.ler('htp_gens', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); },
  filtrados() {
    const g = new Set(this.geracoesAtivas());
    return this.lista.filter(p => g.has(p.gen));
  },
};
