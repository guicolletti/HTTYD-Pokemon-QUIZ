/* Utilidades gerais do HTPkmn Quiz */
const U = {
  norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); },
  letras(s) { return U.norm(s).replace(/[^A-Z]/g, ''); },
  chave(s) { return U.norm(s).replace(/[^A-Z0-9]/g, ''); },

  hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  sortear(arr, rnd = Math.random) { return arr[Math.floor(rnd() * arr.length)]; },
  embaralhar(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  ler(k, padrao) {
    try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; }
  },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* armazenamento cheio ou bloqueado */ } },

  el(tag, attrs, ...filhos) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of filhos.flat()) {
      if (f == null || f === false) continue;
      e.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(f) : f);
    }
    return e;
  },

  toast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'mostrar ' + tipo;
    clearTimeout(U._tt); U._tt = setTimeout(() => (t.className = ''), 2200);
  },

  /* Estatísticas por modo */
  stats(chave) {
    const s = U.ler('htp_stats_' + chave, { jogos: 0, vitorias: 0, seq: 0, recorde: 0 });
    return {
      ...s,
      registrar(venceu) {
        s.jogos++; if (venceu) { s.vitorias++; s.seq++; s.recorde = Math.max(s.recorde, s.seq); } else s.seq = 0;
        U.gravar('htp_stats_' + chave, s); Object.assign(this, s);
      },
    };
  },
  painelStats(s) {
    return U.el('div', { class: 'stats' },
      U.el('div', null, U.el('b', null, s.jogos), U.el('span', null, 'jogos')),
      U.el('div', null, U.el('b', null, s.jogos ? Math.round(100 * s.vitorias / s.jogos) + '%' : '–'), U.el('span', null, 'acertos')),
      U.el('div', null, U.el('b', null, s.seq), U.el('span', null, 'sequência')),
      U.el('div', null, U.el('b', null, s.recorde), U.el('span', null, 'recorde')));
  },

  /* Botões de opção (segmented control) */
  seletor(opcoes, valor, aoMudar) {
    const box = U.el('div', { class: 'seg' });
    for (const [v, rotulo] of opcoes) {
      const b = U.el('button', { class: v === valor ? 'ativo' : '', onclick: () => {
        box.querySelectorAll('button').forEach(x => x.classList.remove('ativo'));
        b.classList.add('ativo'); aoMudar(v);
      } }, rotulo);
      box.appendChild(b);
    }
    return box;
  },
};

/* Campo de busca com autocompletar */
function criarBusca({ itens, aoEscolher, excluir = () => new Set(), placeholder = 'Digite um nome…' }) {
  const caixa = U.el('div', { class: 'busca' });
  const input = U.el('input', { type: 'text', placeholder, autocomplete: 'off', spellcheck: 'false' });
  const lista = U.el('ul', { class: 'sugestoes' });
  caixa.append(input, lista);
  let atuais = [], sel = 0;

  function render() {
    const q = U.chave(input.value);
    lista.innerHTML = ''; atuais = [];
    if (!q) { lista.classList.remove('aberta'); return; }
    const ex = excluir();
    const fonte = typeof itens === 'function' ? itens() : itens;
    const comeca = [], contem = [];
    for (const it of fonte) {
      if (ex.has(it.id)) continue;
      if (it.chaves.some(k => k.startsWith(q))) comeca.push(it);
      else if (it.chaves.some(k => k.includes(q))) contem.push(it);
      if (comeca.length >= 10) break;
    }
    atuais = comeca.concat(contem).slice(0, 10);
    sel = 0;
    atuais.forEach((it, i) => {
      const li = U.el('li', { class: i === sel ? 'sel' : '', onmousedown: (e) => { e.preventDefault(); escolher(it); } },
        miniatura(it), U.el('span', null, it.rotulo), U.el('small', null, it.tipo === 'pokemon' ? (it.num ? '#' + it.num : 'Gen 10') : '🐉'));
      lista.appendChild(li);
    });
    lista.classList.toggle('aberta', atuais.length > 0);
  }
  function marcar() { [...lista.children].forEach((li, i) => li.classList.toggle('sel', i === sel)); }
  function escolher(it) { input.value = ''; render(); aoEscolher(it); input.focus(); }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, atuais.length - 1); marcar(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); marcar(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (atuais[sel]) escolher(atuais[sel]); else if (input.value.trim()) U.toast('Nome não encontrado na lista', 'erro'); }
    else if (e.key === 'Escape') { input.value = ''; render(); }
  });
  input.addEventListener('blur', () => setTimeout(() => lista.classList.remove('aberta'), 150));
  caixa.focar = () => input.focus();
  caixa.desativar = (v) => { input.disabled = v; };
  return caixa;
}

function miniatura(it) {
  if (it.tipo === 'pokemon' && it.num) return U.el('img', { class: 'mini', src: it.sprite, loading: 'lazy', alt: '' });
  const url = it.tipo === 'dragao' ? Dragoes.imagem(it) : null;
  if (url) return U.el('img', { class: 'mini mini-capa', src: url, loading: 'lazy', alt: '' });
  return U.el('span', { class: 'mini mini-emoji' }, it.tipo === 'dragao' ? '🐉' : '❔');
}

/* ---------- Universos (de onde saem as respostas) ---------- */
const UNIVERSOS = {
  pokemon: { icone: '⚡', nome: 'Pokémon' },
  filmes: { icone: '🎬', nome: 'Dragões: filmes e séries' },
  livros: { icone: '📖', nome: 'Dragões: livros' },
  dragoes: { icone: '🐉', nome: 'Todos os dragões' },
  tudo: { icone: '✨', nome: 'Tudo junto' },
};
function migrarUniverso(v) { return v === 'dragao' ? 'dragoes' : v === 'ambos' ? 'tudo' : (UNIVERSOS[v] ? v : 'pokemon'); }
function seletorUniverso(lista, valor, aoMudar) {
  return U.seletor(lista.map(k => [k, `${UNIVERSOS[k].icone} ${UNIVERSOS[k].nome}`]), valor, aoMudar);
}

/* ---------- Chips de informação ---------- */
function chip(txt, cor) { return U.el('span', { class: 'chip', style: cor ? { '--c': cor } : null }, txt); }

/* ---------- Confete (só quando a pessoa acerta) ---------- */
function confete(origem) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = U.el('canvas', { class: 'confete' });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
  const r = origem ? origem.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const ox = (r.left + r.width / 2) * devicePixelRatio, oy = (r.top + r.height / 2) * devicePixelRatio;
  const cores = ['#ffd23f', '#5df2c6', '#8b7bff', '#ff7a59', '#eef3ff'];
  const ps = Array.from({ length: 140 }, () => {
    const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 9) * devicePixelRatio;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6 * devicePixelRatio, s: (4 + Math.random() * 6) * devicePixelRatio,
      c: cores[Math.floor(Math.random() * cores.length)], r: Math.random() * 6, vr: (Math.random() - .5) * .3, f: Math.random() < .5 };
  });
  let t = 0;
  (function quadro() {
    ctx.clearRect(0, 0, W, H); t++;
    for (const p of ps) {
      p.vy += .28 * devicePixelRatio; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - t / 110); ctx.fillStyle = p.c;
      if (p.f) ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.6, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    if (t < 110) requestAnimationFrame(quadro); else cv.remove();
  })();
}
