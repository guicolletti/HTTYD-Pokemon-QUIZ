/* Modo TERMO: adivinhe o nome letra por letra (estilo Wordle/Termo) */
const ModoTermo = {
  abrir(palco) {
    const cfg = U.ler('htp_termo_cfg', { universo: 'tudo', tam: 'livre', diario: false });
    cfg.universo = migrarUniverso(cfg.universo);
    const salvarCfg = () => U.gravar('htp_termo_cfg', cfg);
    const stats = () => U.stats('termo_' + cfg.universo);

    const topo = U.el('div', { class: 'controles' },
      seletorUniverso(['pokemon', 'filmes', 'livros', 'dragoes', 'tudo'], cfg.universo, v => { cfg.universo = v; salvarCfg(); novo(); }),
      U.seletor([['livre', 'Qualquer tamanho'], ['5', '5 letras (clássico)']], cfg.tam, v => { cfg.tam = v; salvarCfg(); novo(); }),
      U.seletor([[false, '♾️ Infinito'], [true, '📅 Diário']], cfg.diario, v => { cfg.diario = v; salvarCfg(); novo(); }));
    const info = U.el('div', { class: 'info-termo' });
    const tabuleiro = U.el('div', { class: 'tabuleiro' });
    const teclado = U.el('div', { class: 'teclado' });
    const fim = U.el('div', { class: 'fim' });
    palco.append(App.cabecalho('termo'), topo, U.el('div', { class: 'mesa' }, info, tabuleiro, teclado, fim));

    const MAX = 6;
    let alvo, padrao, letrasAlvo, tentativas, atual, acabou, dicaUsada, chaveDia;

    // dicionário de nomes válidos por número de letras
    const dic = new Map();
    for (const it of App.todos()) {
      const l = U.letras(it.nome); if (!dic.has(l.length)) dic.set(l.length, new Set());
      dic.get(l.length).add(l);
    }

    function candidatos() {
      return App.pool(cfg.universo).filter(it => {
        const n = U.letras(it.nome).length;
        return cfg.tam === '5' ? n === 5 : n >= 3 && n <= 12;
      });
    }

    function novo() {
      fim.innerHTML = ''; acabou = false; dicaUsada = false; tentativas = []; atual = '';
      const cand = candidatos();
      if (!cand.length) { info.textContent = 'Nenhum nome disponível com esses filtros.'; tabuleiro.innerHTML = ''; return; }
      if (cfg.diario) {
        chaveDia = `htp_termo_dia_${cfg.universo}_${cfg.tam}`;
        const rnd = U.rng(U.hash(U.hoje() + '|termo|' + cfg.universo + '|' + cfg.tam));
        alvo = U.sortear(cand.slice().sort((a, b) => a.id < b.id ? -1 : 1), rnd);
        const salvo = U.ler(chaveDia, null);
        if (salvo && salvo.data === U.hoje() && salvo.alvo === alvo.id) tentativas = salvo.tentativas;
      } else alvo = U.sortear(cand);

      letrasAlvo = U.letras(alvo.nome);
      padrao = [];
      for (const ch of U.norm(alvo.nome)) {
        if (/[A-Z]/.test(ch)) padrao.push('L');
        else if ((ch === ' ' || ch === '-') && padrao[padrao.length - 1] !== 'G') padrao.push('G');
      }
      info.innerHTML = '';
      info.append(U.el('span', { class: 'contagem' }, U.el('b', null, letrasAlvo.length), ' letras, ', U.el('b', null, MAX), ' tentativas'),
        U.el('button', { class: 'btn-sec pequeno', onclick: darDica }, 'Pedir dica'),
        cfg.diario ? null : U.el('button', { class: 'btn-sec pequeno', onclick: () => terminar(false) }, 'Desistir'));
      montarTeclado();
      desenhar();
      if (tentativas.length && (tentativas.includes(letrasAlvo) || tentativas.length >= MAX)) terminar(tentativas.includes(letrasAlvo), true);
    }

    function darDica() {
      if (acabou) return;
      dicaUsada = true;
      const t = alvo.tipo === 'pokemon'
        ? `É um Pokémon da Geração ${alvo.gen}, tipo ${alvo.t1}${alvo.t2 !== 'Nenhum' ? '/' + alvo.t2 : ''}.`
        : `É um dragão ${alvo.livro ? 'dos livros' : 'de filmes/séries/jogos'}, classe ${alvo.classe} (estreia: ${alvo.estreia}).`;
      U.toast(t);
      info.querySelector('button').textContent = t;
    }

    function avaliar(p, a) {
      const r = Array(a.length).fill('errado'), resto = {};
      for (let i = 0; i < a.length; i++) { if (p[i] === a[i]) r[i] = 'certo'; else resto[a[i]] = (resto[a[i]] || 0) + 1; }
      for (let i = 0; i < a.length; i++) if (r[i] !== 'certo' && resto[p[i]] > 0) { r[i] = 'quase'; resto[p[i]]--; }
      return r;
    }

    function desenhar() {
      tabuleiro.innerHTML = '';
      const n = letrasAlvo.length;
      tabuleiro.style.setProperty('--cel', `min(52px, calc((min(100vw, 640px) - 40px) / ${padrao.length + 1}))`);
      for (let l = 0; l < MAX; l++) {
        const linha = U.el('div', { class: 'linha' });
        const palavra = l < tentativas.length ? tentativas[l] : l === tentativas.length ? atual : '';
        const res = l < tentativas.length ? avaliar(tentativas[l], letrasAlvo) : null;
        let k = 0;
        for (const p of padrao) {
          if (p === 'G') { linha.appendChild(U.el('div', { class: 'gap' })); continue; }
          const c = U.el('div', { class: 'cel' + (res ? ' ' + res[k] : '') + (palavra[k] ? ' cheia' : '') }, palavra[k] || '');
          if (res) c.style.animationDelay = (k * 0.07) + 's';
          linha.appendChild(c); k++;
        }
        if (l === tentativas.length && !acabou) linha.classList.add('atual');
        tabuleiro.appendChild(linha);
      }
      // estado do teclado
      const est = {};
      tentativas.forEach(t => avaliar(t, letrasAlvo).forEach((r, i) => {
        const ch = t[i], prio = { certo: 3, quase: 2, errado: 1 };
        if (!est[ch] || prio[r] > prio[est[ch]]) est[ch] = r;
      }));
      teclado.querySelectorAll('button[data-k]').forEach(b => { b.className = est[b.dataset.k] || ''; });
      if (n) { /* noop */ }
    }

    function montarTeclado() {
      teclado.innerHTML = '';
      ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫'].forEach(fila => {
        const f = U.el('div', { class: 'fila' });
        for (const ch of fila) {
          const k = ch === '↵' ? 'ENTER' : ch === '⌫' ? 'BACK' : ch;
          f.appendChild(U.el('button', { 'data-k': k.length === 1 ? k : null, class: k.length > 1 ? 'larga' : '', onclick: () => tecla(k) }, ch === '↵' ? 'ENTER' : ch));
        }
        teclado.appendChild(f);
      });
    }

    function tecla(k) {
      if (acabou) return;
      const n = letrasAlvo.length;
      if (k === 'BACK') atual = atual.slice(0, -1);
      else if (k === 'ENTER') {
        if (atual.length < n) { U.toast('Faltam letras', 'erro'); sacudir(); return; }
        const validos = dic.get(n);
        if (validos && validos.size >= 15 && !validos.has(atual)) { U.toast('Esse nome não está na lista', 'erro'); sacudir(); return; }
        tentativas.push(atual); atual = '';
        if (cfg.diario) U.gravar(chaveDia, { data: U.hoje(), alvo: alvo.id, tentativas });
        desenhar();
        if (tentativas[tentativas.length - 1] === letrasAlvo) return setTimeout(() => terminar(true), 700);
        if (tentativas.length >= MAX) return setTimeout(() => terminar(false), 500);
        return;
      } else if (/^[A-Z]$/.test(k) && atual.length < n) atual += k;
      desenhar();
    }
    function sacudir() {
      const l = tabuleiro.querySelector('.atual'); if (!l) return;
      l.classList.remove('sacode'); void l.offsetWidth; l.classList.add('sacode');
    }

    function terminar(venceu, restaurado = false) {
      if (acabou) return;
      acabou = true; desenhar();
      const s = stats(); if (!restaurado) s.registrar(venceu);
      fim.innerHTML = '';
      fim.append(
        U.el('h3', { class: venceu ? 'ok' : 'nok' }, venceu ? `Acertou em ${tentativas.length}/${MAX}!` : 'Não foi dessa vez…'),
        cartaoRevelacao(alvo), U.painelStats(s),
        cfg.diario ? U.el('p', { class: 'nota' }, 'Volte amanhã para um novo desafio diário!')
          : U.el('button', { class: 'btn', onclick: novo }, 'Jogar de novo'));
      if (venceu && !restaurado) confete(fim.querySelector('h3'));
      fim.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const aoTeclar = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'INPUT') return;
      if (e.key === 'Enter') tecla('ENTER');
      else if (e.key === 'Backspace') tecla('BACK');
      else { const k = U.letras(e.key); if (k.length === 1 && e.key.length === 1) tecla(k); }
    };
    document.addEventListener('keydown', aoTeclar);
    novo();
    return () => document.removeEventListener('keydown', aoTeclar);
  },
};

/* Cartão com a resposta (usado por todos os modos) */
function cartaoRevelacao(it) {
  const url = it.tipo === 'pokemon' ? it.img : Dragoes.imagem(it);
  const img = url ? U.el('img', { src: url, alt: it.nome }) : U.el('div', { class: 'sem-img' }, it.tipo === 'dragao' ? '🐉' : '?');
  let chips, extra = null;
  if (it.tipo === 'pokemon') {
    chips = [chip(it.num ? '#' + String(it.num).padStart(4, '0') : 'Nº ainda secreto'), chip('Geração ' + it.gen),
      chipTipo(it.t1), it.t2 !== 'Nenhum' ? chipTipo(it.t2) : null];
    if (it.ja) extra = U.el('div', { class: 'revela-jp' }, U.el('span', { class: 'jp' }, it.ja), U.el('span', null, it.roma));
  } else {
    chips = [chip(it.livro ? 'Livros' : 'Filmes e séries'), chip('Classe ' + it.classe), chip('Estreia: ' + it.estreia),
      it.tam ? chip(TAMANHOS[it.tam]) : null];
    if (it.pt) extra = U.el('div', { class: 'revela-jp' }, U.el('span', null, 'No Brasil: ' + it.pt));
  }
  return U.el('div', { class: 'revela' }, U.el('div', { class: 'revela-img' }, img),
    U.el('div', { class: 'revela-txt' }, U.el('b', null, it.nome), U.el('div', { class: 'chips' }, ...chips), extra));
}
function chipTipo(t) { return chip(t, COR_TIPO[t] || '#666'); }
