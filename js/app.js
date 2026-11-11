/* Navegação, tela inicial, filtros e carregamento */
const App = {
  sair: null,
  modos: {
    termo: { obj: ModoTermo, nome: 'Termo', desc: 'Descubra o nome letra por letra em 6 tentativas. Tem desafio diário.' },
    silhueta: { obj: ModoSilhueta, nome: 'Quem é?', desc: 'Pokémon e dragões pela silhueta. Três vidas por rodada.' },
    dicas: { obj: ModoDicas, nome: 'Dicas', desc: 'Chute qualquer um e compare tipo, geração, classe e tamanho até chegar lá.' },
    japones: { obj: ModoJapones, nome: 'Nome japonês', desc: 'Do japonês para o nome, ou do nome para o japonês.' },
    pokedex: { obj: ModoPokedex, nome: 'Pokédex', desc: 'Qual Pokémon é o número 133? E qual é o número do Lapras?' },
  },

  pool(universo) {
    const u = migrarUniverso(universo);
    const pk = (u === 'pokemon' || u === 'tudo') ? Pokemon.filtrados() : [];
    const dr = u === 'pokemon' ? [] : Dragoes.lista.filter(d => u === 'filmes' ? !d.livro : u === 'livros' ? d.livro : true);
    return pk.concat(dr);
  },
  todosDoUniverso(universo) { return this.pool(universo); },
  igual(a, b) { return a.id === b.id || (a.tipo === b.tipo && U.chave(a.nome) === U.chave(b.nome)); },
  todos() { return Pokemon.lista.concat(Dragoes.lista); },

  /* Arte de cada carta, feita com tipografia e as próprias silhuetas */
  arte(k) {
    const pk = Pokemon.lista.filter(p => p.num);
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    if (k === 'termo') {
      const est = ['certo', 'quase', 'errado', 'certo', 'quase'];
      return U.el('div', { class: 'arte arte-termo' }, ...'TERMO'.split('').map((c, i) =>
        U.el('span', { class: 'cel ' + est[i], style: { animationDelay: (0.35 + i * 0.09) + 's' } }, c)));
    }
    if (k === 'silhueta') {
      const p = pk.length ? r(pk) : null;
      const d = Dragoes.comSilhueta();
      const dr = d.length ? r(d) : null;
      return U.el('div', { class: 'arte arte-silh' },
        p ? U.el('img', { src: p.img, alt: '', class: 's1' }) : U.el('span', { class: 'interroga' }, '?'),
        dr ? U.el('img', { src: Dragoes.silhueta(dr), alt: '', class: 's2' }) : null);
    }
    if (k === 'dicas') {
      const linhas = [['errado', 'quase', 'sobe', 'errado'], ['certo', 'errado', 'desce', 'quase'], ['certo', 'certo', 'certo', 'certo']];
      return U.el('div', { class: 'arte arte-dicas' }, ...linhas.map(l => U.el('div', null,
        ...l.map(c => U.el('i', { class: c }, c === 'sobe' ? '↑' : c === 'desce' ? '↓' : '')))));
    }
    if (k === 'japones') {
      const c = pk.filter(x => x.ja && x.ja.length <= 5);
      return U.el('div', { class: 'arte arte-jp' }, U.el('span', { class: 'jp' }, c.length ? r(c).ja : 'あ'));
    }
    if (k === 'pokedex') {
      const n = pk.length ? r(pk).num : 133;
      return U.el('div', { class: 'arte arte-dex' }, U.el('span', null, '#' + String(n).padStart(4, '0')));
    }
  },

  cabecalho(k) {
    const m = this.modos[k];
    return U.el('header', { class: 'cab-modo' },
      U.el('a', { class: 'voltar', href: '#' }, U.el('span', { 'aria-hidden': 'true' }, '‹'), 'Menu'),
      U.el('h2', null, m.nome));
  },

  ir() {
    if (this.sair) { try { this.sair(); } catch (e) { } this.sair = null; }
    const palco = document.getElementById('palco');
    palco.innerHTML = '';
    const rota = location.hash.replace('#', '');
    const m = this.modos[rota];
    document.body.dataset.tela = m ? 'jogo' : 'inicio';
    if (!m) return this.inicio(palco);
    const sec = U.el('section', { class: 'modo modo-' + rota });
    palco.appendChild(sec);
    this.sair = m.obj.abrir(sec) || null;
    window.scrollTo(0, 0);
  },

  inicio(palco) {
    const nPk = Pokemon.lista.length, nDr = Dragoes.lista.length;
    const cartas = Object.entries(this.modos).map(([k, m], i) => {
      const s = U.ler('htp_stats_' + ({ termo: 'termo_tudo', silhueta: 'silh_pokemon', dicas: 'dicas_pokemon', japones: 'jp_jp2nome', pokedex: 'dex_num2nome' })[k], null);
      const carta = U.el('a', { class: 'carta carta-' + k, href: '#' + k, style: { '--i': i } },
        U.el('div', { class: 'carta-arte' }, this.arte(k)),
        U.el('div', { class: 'carta-txt' }, U.el('h3', null, m.nome), U.el('p', null, m.desc),
          s && s.recorde ? U.el('small', null, `Seu recorde: ${s.recorde} seguidos`) : null),
        U.el('div', { class: 'holo', 'aria-hidden': 'true' }));
      carta.addEventListener('pointermove', e => {
        const r = carta.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        carta.style.setProperty('--mx', (x * 100) + '%'); carta.style.setProperty('--my', (y * 100) + '%');
        carta.style.setProperty('--rx', ((0.5 - y) * 8) + 'deg'); carta.style.setProperty('--ry', ((x - 0.5) * 10) + 'deg');
      });
      carta.addEventListener('pointerleave', () => { carta.style.setProperty('--rx', '0deg'); carta.style.setProperty('--ry', '0deg'); });
      return carta;
    });
    palco.append(
      U.el('div', { class: 'hero' },
        U.el('h1', null, U.el('span', { class: 'l1' }, 'Pokémon'), U.el('span', { class: 'e' }, 'e'), U.el('span', { class: 'l2' }, 'Dragões')),
        U.el('p', null, `${nPk ? nPk.toLocaleString('pt-BR') : '…'} Pokémon e ${nDr} espécies de dragões de Como Treinar o Seu Dragão. Escolha um jeito de jogar.`)),
      U.el('div', { class: 'cartas' }, ...cartas));
  },

  configurar() {
    const dlg = document.getElementById('dlgConfig');
    const corpo = dlg.querySelector('.corpo');
    corpo.innerHTML = '';
    const gens = new Set(Pokemon.geracoesAtivas());
    const box = U.el('div', { class: 'gens' });
    for (let g = 1; g <= 10; g++) {
      const cb = U.el('input', { type: 'checkbox', checked: gens.has(g), onchange: () => { cb.checked ? gens.add(g) : gens.delete(g); } });
      box.appendChild(U.el('label', null, cb, U.el('span', null, `Gen ${g}`)));
    }
    corpo.append(
      U.el('h4', null, 'Gerações de Pokémon'), box,
      U.el('div', { class: 'acoes esq' },
        U.el('button', { class: 'btn-sec pequeno', onclick: () => { box.querySelectorAll('input').forEach((c, i) => { c.checked = true; gens.add(i + 1); }); } }, 'Marcar todas'),
        U.el('button', { class: 'btn-sec pequeno', onclick: () => { box.querySelectorAll('input').forEach((c, i) => { c.checked = false; gens.delete(i + 1); }); } }, 'Desmarcar todas')),
      U.el('p', { class: 'nota esq' }, 'Os dragões dos filmes e séries e os dos livros são escolhidos dentro de cada modo.'),
      U.el('h4', null, 'Dados'),
      U.el('div', { class: 'acoes esq' },
        U.el('button', { class: 'btn-sec pequeno', onclick: () => { Pokemon.limparCache(); Dragoes.limparCache(); location.reload(); } }, 'Baixar os dados de novo'),
        U.el('button', { class: 'btn-sec pequeno perigo', onclick: () => {
          if (!confirm('Apagar todas as estatísticas?')) return;
          Object.keys(localStorage).filter(k => k.startsWith('htp_stats_') || k.includes('_dia_')).forEach(k => localStorage.removeItem(k));
          U.toast('Estatísticas zeradas');
        } }, 'Zerar estatísticas')));
    dlg.querySelector('.salvar').onclick = () => {
      if (!gens.size) { U.toast('Marque pelo menos uma geração', 'erro'); return; }
      U.gravar('htp_gens', [...gens].sort((a, b) => a - b));
      dlg.close(); this.ir();
    };
    dlg.showModal();
  },

  async iniciar() {
    document.getElementById('btnConfig').onclick = () => this.configurar();
    window.addEventListener('hashchange', () => this.ir());
    const tela = document.getElementById('carregando');
    const barra = tela.querySelector('.barra i');
    const msg = tela.querySelector('p');
    const imgs = Dragoes.carregarImagens().catch(() => { });
    try {
      await Pokemon.carregar(p => (barra.style.width = Math.round(p * 100) + '%'));
      tela.classList.add('sumindo'); setTimeout(() => tela.remove(), 500);
    } catch (e) {
      console.error(e);
      msg.textContent = 'Não deu para baixar a Pokédex. Confira a internet e tente de novo. Os modos com dragões funcionam mesmo assim.';
      tela.querySelector('.tentar').hidden = false;
      tela.querySelector('.tentar').onclick = () => location.reload();
      tela.querySelector('.seguir').hidden = false;
      tela.querySelector('.seguir').onclick = () => tela.remove();
    }
    this.ir();
    imgs.then(() => { if (!location.hash.replace('#', '')) this.ir(); });
  },
};

App.iniciar();
