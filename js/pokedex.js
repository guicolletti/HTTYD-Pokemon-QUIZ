/* Modo POKÉDEX: Nº → Pokémon, ou Pokémon → Nº (com "maior/menor") */
const ModoPokedex = {
  abrir(palco) {
    const cfg = U.ler('htp_dex_cfg', { sentido: 'num2nome' });
    const salvar = () => U.gravar('htp_dex_cfg', cfg);
    let alvo, erros, acabou, chutados;

    const topo = U.el('div', { class: 'controles' },
      U.seletor([['num2nome', 'Nº → Pokémon'], ['nome2num', 'Pokémon → Nº']], cfg.sentido, v => { cfg.sentido = v; salvar(); novo(); }));
    const placar = U.el('div', { class: 'placar' });
    const area = U.el('div', { class: 'area-dex' });
    const fim = U.el('div', { class: 'fim' });
    palco.append(App.cabecalho('pokedex'), topo, U.el('div', { class: 'mesa' }, placar, area, fim));

    const stats = () => U.stats('dex_' + cfg.sentido);
    const pool = () => App.pool('pokemon').filter(p => p.num > 0);
    const fmt = n => '#' + String(n).padStart(4, '0');

    function atualizarPlacar() {
      const s = stats(); placar.innerHTML = '';
      placar.append(U.el('span', null, 'Sequência ', U.el('b', null, s.seq)), U.el('span', null, 'Recorde ', U.el('b', null, s.recorde)),
        U.el('span', null, 'Acertos ', U.el('b', null, s.jogos ? Math.round(100 * s.vitorias / s.jogos) + '%' : '–')));
    }

    function novo() {
      fim.innerHTML = ''; area.innerHTML = ''; area.mini = area.fechar = null; erros = 0; acabou = false; chutados = new Set();
      const p = pool(); if (!p.length) { area.textContent = 'Nenhum Pokémon com esses filtros. Abra Filtros e marque alguma geração.'; return; }
      alvo = U.sortear(p);
      atualizarPlacar();
      cfg.sentido === 'num2nome' ? montarNum2Nome() : montarNome2Num(p);
    }

    function vidasEl(total) {
      const v = U.el('div', { class: 'vidas' });
      v.pintar = () => { v.innerHTML = ''; for (let i = 0; i < total; i++) v.appendChild(U.el('i', { class: i < total - erros ? 'cheia' : '' })); };
      v.pintar(); return v;
    }

    /* ---------- Nº → Pokémon ---------- */
    function montarNum2Nome() {
      const TENT = 3;
      const vidas = vidasEl(TENT);
      const dicas = U.el('div', { class: 'dicas' });
      const mini = U.el('div', { class: 'quadro pequeno silhueta oculto' }, U.el('img', { class: 'alvo', src: alvo.img, alt: '' }));
      const busca = criarBusca({
        itens: () => App.pool('pokemon'), excluir: () => chutados, placeholder: 'Qual Pokémon tem esse número?',
        aoEscolher: (it) => {
          if (acabou) return;
          if (it.id === alvo.id) { confete(painel); return terminar(true, busca); }
          chutados.add(it.id); erros++;
          U.toast(it.num ? `${it.nome} é o ${fmt(it.num)}` : `Não é ${it.nome}`, 'erro');
          vidas.pintar();
          if (erros >= TENT) return terminar(false, busca);
          if (erros === 1) dicas.appendChild(U.el('span', { class: 'dica' }, `Geração ${alvo.gen}, tipo ${alvo.t1}${alvo.t2 !== 'Nenhum' ? ' e ' + alvo.t2 : ''}`));
          if (erros === 2) { mini.classList.remove('oculto'); dicas.appendChild(U.el('span', { class: 'dica' }, 'Olha a silhueta')); }
        },
      });
      const painel = U.el('div', { class: 'visor-dex' }, U.el('span', { class: 'visor-rotulo' }, 'Pokédex Nacional'), U.el('div', { class: 'num-grande' }, fmt(alvo.num)));
      area.append(painel, vidas, dicas, mini, U.el('div', { class: 'linha-busca' }, busca,
        U.el('button', { class: 'btn-sec', onclick: () => !acabou && terminar(false, busca) }, 'Revelar')));
      area.mini = mini;
      busca.focar();
    }

    /* ---------- Pokémon → Nº ---------- */
    function montarNome2Num() {
      const TENT = 6;
      const vidas = vidasEl(TENT);
      const lista = U.el('div', { class: 'palpites' });
      const termometro = U.el('div', { class: 'termometro' }, U.el('i'));
      const input = U.el('input', { type: 'number', min: 1, max: 1025, inputmode: 'numeric', placeholder: 'Número', class: 'campo-num' });
      const btn = U.el('button', { class: 'btn', onclick: enviar }, 'Chutar');
      input.addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
      const dicas = U.el('div', { class: 'dicas' });

      function enviar() {
        if (acabou) return;
        const n = parseInt(input.value, 10);
        if (!n || n < 1 || n > 1025) { U.toast('Digite um número de 1 a 1025', 'erro'); return; }
        input.value = '';
        if (n === alvo.num) { confete(input); return terminar(true); }
        erros++;
        const d = Math.abs(n - alvo.num);
        const calor = d <= 5 ? ['Pelando!', 'pelando'] : d <= 20 ? ['Quente', 'quente'] : d <= 60 ? ['Morno', 'morno'] : d <= 150 ? ['Frio', 'frio'] : ['Congelando', 'gelado'];
        lista.prepend(U.el('div', { class: 'palpite ' + calor[1] }, U.el('b', null, fmt(n)),
          U.el('span', null, n < alvo.num ? 'O número é maior' : 'O número é menor'), U.el('em', null, calor[0])));
        termometro.firstChild.style.width = Math.max(4, 100 - Math.min(100, d / 3)) + '%';
        termometro.className = 'termometro ' + calor[1];
        vidas.pintar();
        if (erros === 2) dicas.appendChild(U.el('span', { class: 'dica' }, `É da Geração ${alvo.gen}`));
        if (erros >= TENT) terminar(false);
        else input.focus();
      }
      area.append(U.el('div', { class: 'quadro revelado' }, U.el('div', { class: 'raios' }), U.el('img', { class: 'alvo', src: alvo.img, alt: alvo.nome })),
        U.el('div', { class: 'nome-grande' }, alvo.nome), vidas, termometro, dicas,
        U.el('div', { class: 'linha-busca' }, input, btn), lista);
      area.fechar = () => { input.disabled = true; btn.disabled = true; };
      input.focus();
    }

    function terminar(venceu, busca) {
      acabou = true;
      if (busca) busca.desativar(true);
      if (area.mini) area.mini.remove();
      if (area.fechar) area.fechar();
      stats().registrar(venceu); atualizarPlacar();
      const prox = U.el('button', { class: 'btn', onclick: novo }, 'Próximo');
      fim.innerHTML = '';
      fim.append(U.el('h3', { class: venceu ? 'ok' : 'nok' }, venceu ? 'Acertou!' : `Era o ${fmt(alvo.num)}`), cartaoRevelacao(alvo), prox);
      setTimeout(() => prox.focus(), 50);
    }

    novo();
  },
};
