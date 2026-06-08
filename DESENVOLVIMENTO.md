# 🛠️ Guia de Desenvolvimento — Bloom Garden Ultimate

Este documento descreve a arquitetura interna do projeto, a responsabilidade de
cada módulo e como estendê-lo seguindo o padrão atual. Para o passo a passo de
contribuição (fork, branch, PR), veja o
[CONTRIBUTING.md](./.github/CONTRIBUTING.md).

## 📑 Sumário

- [Visão geral da arquitetura](#-visão-geral-da-arquitetura)
- [Responsabilidade de cada módulo](#-responsabilidade-de-cada-módulo)
- [Como adicionar uma nova entidade](#-como-adicionar-uma-nova-entidade)
- [Como adicionar um novo sistema](#-como-adicionar-um-novo-sistema)
- [Pipeline de build e deploy](#-pipeline-de-build-e-deploy)
- [Convenções e boas práticas de performance](#-convenções-e-boas-práticas-de-performance)

---

## 🧩 Visão geral da arquitetura

O Bloom Garden Ultimate é uma aplicação **ESM modular**: não há framework de UI,
apenas JavaScript moderno, Three.js para a renderização WebGL e Vite como bundler
e dev server.

O fluxo de inicialização é:

```
index.html
  └─ src/main.js              → cria a instância de Game
       └─ game/Game.js        → orquestra estado, loop, economia, combo, loja e conquistas
            ├─ game/UI.js      → HUD em DOM/HTML (pontos, energia, nível, loja, tutorial…)
            ├─ game/SaveSystem → persistência via localStorage (com migração)
            ├─ game/Sound.js   → áudio WebAudio (cliques, coleta, ambiente)
            └─ scenes/GardenScene.js → monta a cena Three.js
                 ├─ systems/   → céu, partículas, flores (+ espécies, texturas)
                 ├─ world/     → terreno, grama, árvores, lagoa, pétalas
                 └─ entities/  → borboletas, abelhas, cogumelos, vagalumes, power-ups, pedras
```

Cada módulo exporta **uma classe** com responsabilidade única. A `GardenScene`
funciona como o ponto de integração: instancia os sistemas, atualiza todos eles a
cada quadro e expõe métodos de alto nível (`update`, `resize`, `toggleDayNight`,
`handlePointer`, `dispose`).

A separação entre **lógica de jogo** (`game/`) e **mundo 3D** (`scenes/`,
`systems/`, `world/`, `entities/`) é proposital: o `Game` cuida da economia
(energia → seiva → nível → pontuação) e da interface; a cena cuida apenas do que
é visual.

---

## 📁 Responsabilidade de cada módulo

### `src/game/`
| Arquivo | Responsabilidade |
|---|---|
| `Game.js` | Classe raiz. Mantém o estado, roda o loop (`requestAnimationFrame`), processa cliques/toques, aplica a economia (energia → seiva → nível → pontos), combo, power-ups temporizados, loja e conquistas, e dispara o auto-save. |
| `UI.js` | Camada de interface em DOM: HUD, barra de energia/nível, mensagens, texto flutuante "+N", menu inicial, loja, coleção/conquistas, tutorial guiado e modo foto. |
| `SaveSystem.js` | Carrega e salva o estado em `localStorage`, com estado padrão, **migração de versão de save** e tolerância a falhas (modo privado, cota cheia, JSON corrompido). |
| `Sound.js` | Áudio leve via WebAudio (sem dependências): blips de clique/coleta/nível e um pad ambiente. `AudioContext` criado sob demanda no primeiro gesto. |
| `Achievements.js` | Lista declarativa de conquistas, cada uma com um `check(state, ctx)`. |
| `Upgrades.js` | Definições da loja: upgrades, moeda, custo progressivo e efeito por nível. |

### `src/scenes/`
| Arquivo | Responsabilidade |
|---|---|
| `GardenScene.js` | Cria `renderer`, `scene` e `camera`; define o nível de qualidade por dispositivo (mobile vs. desktop); instancia e atualiza todos os sistemas; faz o raycast de cliques; libera recursos no `dispose()`. |

### `src/systems/`
Sistemas visuais reutilizáveis, independentes do cenário específico:
| Arquivo | Responsabilidade |
|---|---|
| `SkyDome.js` | Cúpula do céu com gradiente, sol, lua, estrelas, aurora, nuvens e colinas distantes. |
| `ParticleField.js` | Campo de partículas mágicas flutuantes (camadas de poeira + brilho). |
| `FlowerField.js` | Flor central (herói) + prado de fundo; expõe as posições das flores (usadas pelas abelhas). |
| `FlowerSpecies.js` | Construtores 3D low-poly das 7 espécies, com cache de geometria de pétala. |
| `textures.js` | Texturas procedurais de canvas compartilhadas (brilho, disco, nuvem), geradas uma vez e cacheadas. |

### `src/world/`
Elementos do ambiente/cenário:
| Arquivo | Responsabilidade |
|---|---|
| `DayNightCycle.js` | Ciclo dia/noite: anima cores, luz do sol/lua e fog a partir de keyframes. |
| `Terrain.js` | Relevo do solo (campo de altura `terrainHeight(x,z)`), cobertura instanciada e a bacia carvada da lagoa. Base sobre a qual os demais sistemas se apoiam. |
| `GrassField.js` | Grama via `InstancedMesh` (1 draw call para milhares de tufos), com vento animado no vertex shader (GPU). |
| `TreeField.js` | Árvores estilizadas com folhagem em camadas e *fade* de segurança quando passam na frente da flor. |
| `Pond.js` | Lagoa com superfície animada, margens (rochas/juncos) e vitórias-régias. |
| `PetalParticles.js` | Pétalas caindo pelo jardim. |

### `src/entities/`
Criaturas e objetos animados:
| Arquivo | Responsabilidade |
|---|---|
| `Butterfly.js` | Borboletas com trajetória em figura-8 e batida de asas. |
| `Bee.js` | Abelhas em rota Bézier entre as posições das flores. |
| `Mushroom.js` | Cogumelos com material emissivo pulsante. |
| `Firefly.js` | Vagalumes noturnos renderizados como *sprites* aditivos (sem `PointLight` por vagalume, por performance). |
| `PowerUp.js` | Power-ups clicáveis que surgem no jardim (borboleta, chuva, cogumelo, vagalumes), com cooldown de spawn e expiração. |
| `Rock.js` | Pedras decorativas espalhadas pelo cenário. |

---

## ➕ Como adicionar uma nova entidade

Siga o padrão dos arquivos em `src/entities/`. Exemplo, uma libélula:

1. **Crie o módulo** `src/entities/Dragonfly.js` exportando uma classe:
   - Receba a `scene` (ou um grupo) no construtor e construa a geometria/material.
   - Prefira `InstancedMesh` se for criar várias cópias.
   - Exponha um método `update(time)` para a animação por quadro.
   - Exponha um `dispose()` que libere geometria, material e texturas.
2. **Instancie em `GardenScene.js`**, dentro do bloco de entidades, usando o nível
   de qualidade (`q`) para definir a quantidade por dispositivo.
3. **Chame `update(time)`** da nova entidade dentro do método `update` da cena.
4. **Inclua-a no descarte** garantindo que o `dispose()` da cena também libere os
   recursos da nova entidade (ou que ela seja percorrida pela varredura existente).

---

## ➕ Como adicionar um novo sistema

Sistemas visuais mais amplos (ex.: clima, chuva, arco-íris) vão em `src/systems/`:

1. Crie `src/systems/MeuSistema.js` com uma classe que monte um `THREE.Group` ou
   objeto e ofereça `update(time)` / `dispose()`.
2. Adicione-o à `GardenScene` (`this.scene.add(...)`), atualize-o no loop da cena
   e libere-o no `dispose()`.
3. Se o sistema tiver custo variável, respeite o tier de qualidade (`q`) para
   reduzir a carga em dispositivos móveis.

---

## 🏗️ Pipeline de build e deploy

- **Build**: `npm run build` executa o Vite, que empacota `src/` e gera a saída em
  **`docs/`** (configurado em `vite.config.js` via `build.outDir: "docs"`). A opção
  `base` aponta para `"/JAOG1V1-BloomGardenUltimate/"`, necessária para os caminhos
  funcionarem no GitHub Pages. O `.nojekyll` vem de `public/` (sempre presente na saída).
- **Testes**: `npm test` roda o **Vitest** sobre a lógica pura (economia/loja,
  conquistas, migração de save, terreno, ciclo dia/noite) em `test/`. Use
  `npm run test:watch` durante o desenvolvimento.
- **CI**: `.github/workflows/ci.yml` roda **testes + build** em cada Pull Request
  e push em `main`, pegando regressões antes do deploy.
- **Deploy**: o workflow `.github/workflows/deploy.yml` roda a cada push em `main`:
  `npm ci` → `npm test` → `npm run build` → publica `docs/` como **artefato** com
  `actions/deploy-pages` (Pages como *source: GitHub Actions*).

> ⚠️ A pasta `docs/` é **saída do build** e é **ignorada pelo git** (`.gitignore`):
> nunca a edite à mão nem a versione — o deploy a reconstrói a cada push. Documentos
> ficam na raiz (como este arquivo) ou em `.github/`.

### Service worker / offline

`public/sw.js` é um service worker sem dependências, registrado por `main.js`
**apenas em produção**. Navegações usam *network-first* (para receber novos
deploys) e os assets com hash usam *cache-first* (imutáveis), tornando o jogo
instalável e jogável offline após a primeira visita.

---

## ⚡ Convenções e boas práticas de performance

Por ser um jogo 3D em tempo real rodando no navegador (inclusive em celulares),
performance é prioridade:

- **Instancing**: use `InstancedMesh` para objetos repetidos (grama, pedras,
  pétalas) — reduz drasticamente o número de draw calls.
- **`dispose()`**: sempre libere `geometry`, `material` e `texture` da GPU ao
  remover objetos. A `GardenScene` faz uma varredura de descarte no `dispose()`.
- **Limite de luzes**: o WebGL lida mal com muitas luzes dinâmicas. Por isso os
  vagalumes são *sprites* aditivos, e não `PointLight`s individuais. Use luzes
  com parcimônia.
- **Tier de qualidade**: a cena detecta mobile vs. desktop e ajusta contagens
  (grama, partículas, criaturas, sombras). Respeite esse padrão ao adicionar
  conteúdo pesado.
- **Reaproveitamento**: compartilhe geometrias, materiais e texturas entre
  instâncias sempre que possível (ex.: a textura de brilho dos vagalumes é única).
- **Loop estável**: o `dt` é limitado (cap) para evitar "espirais" de atualização
  após o navegador ficar em segundo plano.
