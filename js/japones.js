/* Modo NOME JAPONÊS: 日本語 → nome, ou nome → 日本語 (múltipla escolha) */
const ModoJapones = {
  abrir(palco) {
    const cfg = U.ler('htp_jp_cfg', { sentido: 'jp2nome', romaji: false });
    const salvar = () => U.gravar('htp_jp_cfg', cfg);
    const TENT = 3;
    let alvo, erros, acabou, chutados;

    const topo = U.el('div', { class: 'controles' },
      U.seletor([['jp2nome', '🇯🇵 → Nome (digitar)'], ['nome2jp', 'Nome → 🇯🇵 (alternativas)']], cfg.sentido, v => { cfg.sentido = v; salvar(); novo(); }),
      U.seletor([[false, 'Sem romaji'], [true, 'Com romaji']], cfg.romaji, v => { cfg.romaji = v; salvar(); novo(); }));
    const placar = U.el('div', { class: 'placar' });
    const area = U.el('div', { class: 'area-jp' });
    const fim = U.el('div', { class: 'fim' });
    palco.append(App.cabecalho('japones'), topo, U.el('div', { class: 'mesa' }, placar, area, fim));

    const stats = () => U.stats('jp_' + cfg.sentido);
    const pool = () => App.pool('pokemon').filter(p => p.ja);

    function atualizarPlacar() {
      const s = stats(); placar.innerHTML = '';
      placar.append(U.el('span', null, 'Sequência ', U.el('b', null, s.seq)), U.el('span', null, 'Recorde ', U.el('b', null, s.recorde)),
        U.el('span', null, 'Acertos ', U.el('b', null, s.jogos ? Math.round(100 * s.vitorias / s.jogos) + '%' : '–')));
    }

    function novo() {
      fim.innerHTML = ''; area.innerHTML = ''; erros = 0; acabou = false; chutados = new Set();
      const p = pool(); if (!p.length) { area.textContent = 'Nenhum Pokémon com esses filtros.'; return; }
      alvo = U.sortear(p);
      atualizarPlacar();
      cfg.sentido === 'jp2nome' ? montarJp2Nome() : montarNome2Jp(p);
    }

    function montarJp2Nome() {
      const dicas = U.el('div', { class: 'dicas' });
      const vidas = U.el('div', { class: 'vidas' });
      const pintar = () => { vidas.innerHTML = ''; for (let i = 0; i < TENT; i++) vidas.appendChild(U.el('i', { class: i < TENT - erros ? 'cheia' : '' })); };
      pintar();
      const mini = U.el('div', { class: 'quadro pequeno silhueta oculto' }, alvo.img ? U.el('img', { class: 'alvo', src: alvo.img, alt: '' }) : null);
      const busca = criarBusca({
        itens: () => App.todosDoUniverso('pokemon'), excluir: () => chutados, placeholder: 'Qual Pokémon é esse?',
        aoEscolher: (it) => {
          if (acabou) return;
          if (it.id === alvo.id) { confete(area); return terminar(true, busca, mini); }
          chutados.add(it.id); erros++; U.toast(`Não é ${it.nome}!`, 'erro');
          pintar();
          if (erros >= TENT) return terminar(false, busca, mini);
          if (erros === 1) dicas.appendChild(U.el('span', { class: 'dica' }, `Geração ${alvo.gen}, tipo ${alvo.t1}${alvo.t2 !== 'Nenhum' ? ' e ' + alvo.t2 : ''}`));
          if (erros === 2) { mini.classList.remove('oculto'); dicas.appendChild(U.el('span', { class: 'dica' }, 'Olha a silhueta')); }
        },
      });
      area.append(
        U.el('div', { class: 'jp-grande' }, alvo.ja),
        cfg.romaji ? U.el('div', { class: 'romaji' }, alvo.roma) : U.el('button', { class: 'btn-sec pequeno', onclick: (e) => e.target.replaceWith(U.el('div', { class: 'romaji' }, alvo.roma)) }, 'Mostrar romaji'),
        vidas, dicas, mini, busca,
        U.el('button', { class: 'btn-sec', onclick: () => !acabou && terminar(false, busca, mini) }, 'Revelar'));
      busca.focar();
    }

    function montarNome2Jp(p) {
      // distratores: preferir mesma geração e tamanho parecido de nome em katakana
      const outros = U.embaralhar(p.filter(x => x.id !== alvo.id && x.ja !== alvo.ja));
      outros.sort((a, b) => (Math.abs(a.ja.length - alvo.ja.length) + (a.gen === alvo.gen ? 0 : 1)) - (Math.abs(b.ja.length - alvo.ja.length) + (b.gen === alvo.gen ? 0 : 1)));
      const opcoes = U.embaralhar([alvo, ...outros.slice(0, 12).sort(() => Math.random() - 0.5).slice(0, 3)]);
      const img = alvo.img ? U.el('img', { class: 'alvo', src: alvo.img, alt: alvo.nome }) : U.el('div', { class: 'sem-img' }, '❔');
      const grade = U.el('div', { class: 'opcoes' });
      opcoes.forEach(o => {
        const b = U.el('button', { class: 'opcao', onclick: () => {
          if (acabou) return;
          acabou = true;
          const certo = o.id === alvo.id;
          grade.querySelectorAll('button').forEach((x, i) => { x.disabled = true; if (opcoes[i].id === alvo.id) x.classList.add('certo'); });
          if (!certo) b.classList.add('errado'); else confete(b);
          grade.querySelectorAll('button').forEach((x, i) => x.appendChild(U.el('small', null, cfg.romaji ? opcoes[i].nome : `${opcoes[i].roma} · ${opcoes[i].nome}`)));
          stats().registrar(certo); atualizarPlacar();
          const prox = U.el('button', { class: 'btn', onclick: novo }, 'Próximo');
          fim.innerHTML = ''; fim.append(U.el('h3', { class: certo ? 'ok' : 'nok' }, certo ? '正解! Isso mesmo!' : `O certo era ${alvo.ja}`), prox);
          setTimeout(() => prox.focus(), 50);
        } }, U.el('span', { class: 'jp' }, o.ja), cfg.romaji ? U.el('small', null, o.roma) : null);
        grade.appendChild(b);
      });
      area.append(U.el('div', { class: 'quadro revelado' }, img), U.el('div', { class: 'nome-grande' }, alvo.nome), U.el('p', null, 'Qual é o nome japonês?'), grade);
    }

    function terminar(venceu, busca, mini) {
      acabou = true; busca.desativar(true); mini.remove();
      stats().registrar(venceu); atualizarPlacar();
      const prox = U.el('button', { class: 'btn', onclick: novo }, 'Próximo');
      fim.innerHTML = '';
      fim.append(U.el('h3', { class: venceu ? 'ok' : 'nok' }, venceu ? 'すごい! Acertou!' : 'Era…'), cartaoRevelacao(alvo), prox);
      setTimeout(() => prox.focus(), 50);
    }

    novo();
  },
};
