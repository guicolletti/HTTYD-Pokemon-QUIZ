/* Modo DICAS (estilo Monképo / Pokédle): chute e compare as características */
const ModoDicas = {
  abrir(palco) {
    const cfg = U.ler('htp_dicas_cfg', { universo: 'pokemon', diario: false });
    cfg.universo = migrarUniverso(cfg.universo);
    if (cfg.universo === 'tudo') cfg.universo = 'pokemon';
    const tipoCols = () => cfg.universo === 'pokemon' ? 'pokemon' : 'dragao';
    const salvar = () => U.gravar('htp_dicas_cfg', cfg);
    let alvo, chutes, acabou, chaveDia;

    const COLS = {
      pokemon: [
        ['Tipo 1', it => it.t1, (a, b) => a.t1 === b.t1 ? 'certo' : a.t1 === b.t2 ? 'quase' : 'errado'],
        ['Tipo 2', it => it.t2, (a, b) => a.t2 === b.t2 ? 'certo' : (a.t2 !== 'Nenhum' && a.t2 === b.t1) ? 'quase' : 'errado'],
        ['Geração', it => it.gen, num('gen')],
        ['Estágio', it => it.estagio, num('estagio')],
        ['Cor', it => it.cor, (a, b) => a.cor !== '?' && a.cor === b.cor ? 'certo' : 'errado'],
        ['Altura', it => it.alt.toFixed(1).replace('.', ',') + ' m', num('alt')],
        ['Peso', it => it.peso.toFixed(1).replace('.', ',') + ' kg', num('peso')],
      ],
      dragao: [
        ['Classe', it => it.classe, (a, b) => a.classe === b.classe ? 'certo' : 'errado'],
        ['Estreia', it => it.estreia, (a, b) => cmp(ESTREIAS[a.estreia], ESTREIAS[b.estreia])],
        ['Tamanho', it => TAMANHOS[it.tam], num('tam')],
        ['Cor', it => it.cor, (a, b) => a.cor !== '?' && a.cor === b.cor ? 'certo' : 'errado'],
        ['Cabeças', it => it.cabecas, num('cabecas')],
      ],
    };
    function cmp(x, y) { if (x == null || y == null || x === 0 || y === 0) return 'errado'; return x === y ? 'certo' : x < y ? 'sobe' : 'desce'; }
    function num(campo) { return (a, b) => cmp(a[campo], b[campo]); }

    const topo = U.el('div', { class: 'controles' },
      seletorUniverso(['pokemon', 'filmes', 'livros', 'dragoes'], cfg.universo, v => { cfg.universo = v; salvar(); novo(); }),
      U.seletor([[false, '♾️ Infinito'], [true, '📅 Diário']], cfg.diario, v => { cfg.diario = v; salvar(); novo(); }));
    const legenda = U.el('div', { class: 'legenda' },
      U.el('span', null, U.el('i', { class: 'certo' }), 'igual'), U.el('span', null, U.el('i', { class: 'quase' }), 'quase (tipo trocado)'),
      U.el('span', null, U.el('i', { class: 'errado' }), 'diferente'), U.el('span', null, '⬆️⬇️ o certo é maior/menor'));
    const contador = U.el('div', { class: 'placar' });
    const extras = U.el('div', { class: 'extras' });
    const busca = criarBusca({ itens: () => App.todosDoUniverso(cfg.universo), excluir: () => new Set(chutes.map(c => c.id)), aoEscolher: chutar });
    const desistir = U.el('button', { class: 'btn-sec', onclick: () => !acabou && terminar(false) }, 'Desistir');
    const tabela = U.el('div', { class: 'tabela-wrap' });
    const fim = U.el('div', { class: 'fim' });
    palco.append(App.cabecalho('dicas'), topo, U.el('div', { class: 'mesa' }, legenda, contador, extras, U.el('div', { class: 'linha-busca' }, busca, desistir), fim, tabela));

    const stats = () => U.stats('dicas_' + cfg.universo);

    function novo() {
      acabou = false; chutes = []; fim.innerHTML = ''; busca.desativar(false); desistir.disabled = false;
      const cand = App.pool(cfg.universo).filter(it => !it.semDados && (it.tipo === 'pokemon' || (it.tam && it.cor !== '?')));
      if (!cand.length) { tabela.textContent = 'Nenhum item com esses filtros.'; return; }
      if (cfg.diario) {
        chaveDia = 'htp_dicas_dia_' + cfg.universo;
        const rnd = U.rng(U.hash(U.hoje() + '|dicas|' + cfg.universo));
        alvo = U.sortear(cand, rnd);
        const s = U.ler(chaveDia, null);
        if (s && s.data === U.hoje() && s.alvo === alvo.id) {
          const todos = App.todosDoUniverso(cfg.universo);
          chutes = s.chutes.map(id => todos.find(t => t.id === id)).filter(Boolean);
        }
      } else alvo = U.sortear(cand);
      if (cfg.universo !== 'pokemon' && !Object.keys(Dragoes._img).length) Dragoes.carregarImagens().then(desenhar);
      desenhar();
      if (chutes.some(c => App.igual(c, alvo))) terminar(true, true);
      else if (cfg.diario && U.ler(chaveDia, {}).desistiu && U.ler(chaveDia, {}).data === U.hoje()) terminar(false, true);
      busca.focar();
    }

    function chutar(it) {
      if (acabou) return;
      chutes.unshift(it);
      if (cfg.diario) U.gravar(chaveDia, { data: U.hoje(), alvo: alvo.id, chutes: chutes.map(c => c.id) });
      desenhar();
      if (App.igual(it, alvo)) setTimeout(() => terminar(true), 400);
    }

    function desenhar() {
      const cols = COLS[tipoCols()];
      contador.textContent = `Chutes: ${chutes.length}`;
      // dicas extras liberadas conforme os chutes
      extras.innerHTML = '';
      const lib = [
        [3, '🔠 Primeira letra', () => `Começa com "${alvo.nome[0]}"`],
        [6, cfg.universo === 'pokemon' ? '👤 Silhueta' : (Dragoes.silhueta(alvo) ? '👤 Silhueta' : '🖼️ Imagem borrada'), null],
        [9, cfg.universo === 'pokemon' ? '🇯🇵 Nome japonês' : '🔢 Nº de letras', () => cfg.universo === 'pokemon' ? `${alvo.ja} (${alvo.roma})` : `${U.letras(alvo.nome).length} letras: ${alvo.nome.replace(/[A-Za-z]/g, '_')}`],
      ];
      for (const [n, rot, txt] of lib) {
        const ok = chutes.length >= n || acabou;
        if (!ok) { extras.appendChild(U.el('span', { class: 'extra trancada' }, `🔒 ${rot} (em ${n - chutes.length})`)); continue; }
        if (txt) extras.appendChild(U.el('span', { class: 'extra' }, `${rot}: `, U.el('b', null, txt())));
        else {
          const temSilh = alvo.tipo === 'pokemon' || !!Dragoes.silhueta(alvo);
          const url = acabou ? (alvo.tipo === 'pokemon' ? alvo.img : Dragoes.imagem(alvo)) : (alvo.tipo === 'pokemon' ? alvo.img : Dragoes.silhueta(alvo) || Dragoes.imagem(alvo));
          extras.appendChild(url ? U.el('span', { class: 'extra' }, U.el('img', { class: 'mini-silh ' + (acabou ? '' : temSilh ? 'silhueta' : 'borrado-forte'), src: url, alt: '' }))
            : U.el('span', { class: 'extra' }, '(sem imagem)'));
        }
      }
      // tabela
      const t = U.el('table', { class: 'tab-dicas' });
      t.appendChild(U.el('tr', null, U.el('th', null, ''), U.el('th', null, 'Nome'), ...cols.map(c => U.el('th', null, c[0]))));
      chutes.forEach((it, idx) => {
        const tr = U.el('tr', { class: idx === 0 ? 'novo' : '' }, U.el('td', { class: 'td-img' }, miniatura(it)), U.el('td', { class: 'td-nome' }, it.nome));
        cols.forEach(([, val, comp], i) => {
          const r = comp(it, alvo);
          const seta = r === 'sobe' ? ' ⬆️' : r === 'desce' ? ' ⬇️' : '';
          const td = U.el('td', { class: 'cel-d ' + (r === 'sobe' || r === 'desce' ? 'errado' : r) }, String(val(it)) + seta);
          if (idx === 0) td.style.animationDelay = (i * 0.08) + 's';
          tr.appendChild(td);
        });
        t.appendChild(tr);
      });
      tabela.innerHTML = '';
      if (chutes.length) tabela.appendChild(t);
    }

    function terminar(venceu, restaurado = false) {
      acabou = true; busca.desativar(true); desistir.disabled = true;
      if (!restaurado) {
        stats().registrar(venceu);
        if (cfg.diario && !venceu) U.gravar(chaveDia, { data: U.hoje(), alvo: alvo.id, chutes: chutes.map(c => c.id), desistiu: true });
      }
      desenhar();
      fim.innerHTML = '';
      if (venceu && !restaurado) setTimeout(() => confete(fim.querySelector('h3')), 30);
      fim.append(U.el('h3', { class: venceu ? 'ok' : 'nok' }, venceu ? `Acertou com ${chutes.length} chute${chutes.length > 1 ? 's' : ''}!` : 'A resposta era…'),
        cartaoRevelacao(alvo), U.painelStats(stats()),
        cfg.diario ? U.el('p', { class: 'nota' }, 'Volte amanhã para um novo desafio!') : U.el('button', { class: 'btn', onclick: novo }, 'Jogar de novo'));
    }

    novo();
  },
};
