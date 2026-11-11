/* Modo QUEM É?: adivinhe pela silhueta preta (Pokémon e dragões dos filmes/séries) */
const ModoSilhueta = {
  abrir(palco) {
    const cfg = U.ler('htp_silh_cfg', { universo: 'pokemon' });
    cfg.universo = migrarUniverso(cfg.universo);
    if (!['pokemon', 'filmes', 'tudo'].includes(cfg.universo)) cfg.universo = 'filmes';
    const TENT = 3;
    let alvo, erros, acabou, chutados;

    const topo = U.el('div', { class: 'controles' },
      seletorUniverso(['pokemon', 'filmes', 'tudo'], cfg.universo, v => { cfg.universo = v; U.gravar('htp_silh_cfg', cfg); preparar(); }));
    const placar = U.el('div', { class: 'placar' });
    const img = U.el('img', { class: 'alvo', alt: '', draggable: 'false' });
    const quadro = U.el('div', { class: 'quadro silhueta' }, U.el('div', { class: 'raios' }), img);
    const dicas = U.el('div', { class: 'dicas' });
    const vidas = U.el('div', { class: 'vidas' });
    const busca = criarBusca({ itens: () => App.pool(cfg.universo), excluir: () => chutados, aoEscolher: chutar, placeholder: 'Quem é? Digite o nome' });
    const pular = U.el('button', { class: 'btn-sec', onclick: () => !acabou && terminar(false) }, 'Revelar');
    const fim = U.el('div', { class: 'fim' });
    const aviso = U.el('p', { class: 'nota' });
    palco.append(App.cabecalho('silhueta'), topo, aviso,
      U.el('div', { class: 'mesa' }, placar, quadro, vidas, dicas, U.el('div', { class: 'linha-busca' }, busca, pular), fim));

    const stats = () => U.stats('silh_' + cfg.universo);

    async function preparar() {
      aviso.textContent = '';
      if (cfg.universo !== 'pokemon' && !Dragoes.comSilhueta().length) {
        aviso.textContent = 'Buscando as imagens dos dragões na HTTYD Wiki…';
        await Dragoes.carregarImagens(p => (aviso.textContent = `Buscando as imagens dos dragões… ${Math.round(p * 100)}%`));
        aviso.textContent = Dragoes.comSilhueta().length ? '' : 'Não deu para carregar as imagens dos dragões. Confira a internet e recarregue a página.';
      }
      novo();
    }

    function candidatos() {
      return App.pool(cfg.universo).filter(it => it.tipo === 'pokemon' ? !!it.img : !!Dragoes.silhueta(it));
    }

    function novo() {
      fim.innerHTML = ''; dicas.innerHTML = ''; erros = 0; acabou = false; chutados = new Set();
      const c = candidatos();
      if (!c.length) { quadro.classList.add('vazio'); return; }
      alvo = U.sortear(c);
      quadro.className = 'quadro silhueta carregando-img';
      img.onload = () => quadro.classList.remove('carregando-img');
      img.src = alvo.tipo === 'pokemon' ? alvo.img : Dragoes.silhueta(alvo);
      atualizar(); busca.desativar(false); pular.disabled = false; busca.focar();
    }

    function atualizar() {
      const s = stats();
      placar.innerHTML = '';
      placar.append(U.el('span', null, 'Sequência ', U.el('b', null, s.seq)), U.el('span', null, 'Recorde ', U.el('b', null, s.recorde)));
      vidas.innerHTML = '';
      for (let i = 0; i < TENT; i++) vidas.appendChild(U.el('i', { class: i < TENT - erros ? 'cheia' : '' }));
    }

    function dica() {
      const d = alvo.tipo === 'pokemon'
        ? [`Geração ${alvo.gen}`, `Tipo ${alvo.t1}${alvo.t2 !== 'Nenhum' ? ' e ' + alvo.t2 : ''}`]
        : [`Classe ${alvo.classe}`, `Estreia: ${alvo.estreia}`];
      d.push(`Começa com ${alvo.nome[0]} e tem ${U.letras(alvo.nome).length} letras`);
      dicas.appendChild(U.el('span', { class: 'dica' }, d[Math.min(erros - 1, d.length - 1)]));
    }

    function chutar(it) {
      if (acabou) return;
      if (App.igual(it, alvo)) return terminar(true);
      chutados.add(it.id); erros++;
      U.toast(`Não é ${it.nome}`, 'erro');
      quadro.classList.remove('sacode'); void quadro.offsetWidth; quadro.classList.add('sacode');
      if (erros >= TENT) return terminar(false);
      dica(); atualizar();
    }

    function terminar(venceu) {
      acabou = true; busca.desativar(true); pular.disabled = true;
      quadro.className = 'quadro revelado';
      if (alvo.tipo === 'dragao') img.src = Dragoes.imagem(alvo);
      stats().registrar(venceu); atualizar();
      fim.innerHTML = '';
      const btn = U.el('button', { class: 'btn', onclick: novo }, 'Próximo');
      const h = U.el('h3', { class: venceu ? 'ok' : 'nok' }, venceu ? 'Acertou!' : 'Era…');
      fim.append(h, cartaoRevelacao(alvo), btn);
      if (venceu) confete(quadro);
      setTimeout(() => btn.focus(), 50);
    }

    preparar();
  },
};
