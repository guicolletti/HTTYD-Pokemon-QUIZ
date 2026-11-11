# HTPkmn Quiz — Pokémon e Dragões

Abra o **index.html** no navegador (precisa de internet).

## Modos
- **Termo**: adivinhe o nome letra por letra (verde = lugar certo, amarelo = existe em outro lugar). Infinito ou diário.
- **Quem é?**: silhueta preta de Pokémon e de 128 dragões dos filmes e séries. 3 vidas.
- **Dicas** (estilo Monképo): chute e compare tipos, geração, estágio, cor, altura e peso (Pokémon) ou classe, estreia, tamanho, cor e cabeças (dragões).
- **Nome japonês**: japonês → nome (digitando) ou nome → japonês (alternativas).
- **Pokédex**: número → Pokémon, ou Pokémon → número (com "maior/menor" e termômetro de quente/frio).

Em cada modo dá para escolher: Pokémon, dragões dos filmes e séries, dragões dos livros, todos os dragões ou tudo junto.

## Dados
- Pokémon: baixados da PokéAPI na primeira visita e guardados no navegador. Os iniciais de Winds & Waves ficam em `js/dados-pokemon.js` (lista `GEN10`).
- Dragões: `js/dados-dragoes.js`. A lista `SILHUETAS_DR` diz qual imagem transparente da HTTYD Wiki vira silhueta de cada dragão.
- Em **Filtros** você escolhe as gerações, baixa os dados de novo ou zera as estatísticas.
