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
       └─ game/Game.js        → orquestra estado, loop, UI e save
            ├─ game/UI.js      → HUD em DOM/HTML (pontos, energia, nível…)
            ├─ game/SaveSystem → persistência via localStorage
            └─ scenes/GardenScene.js → monta a cena Three.js
                 ├─ systems/   → céu, partículas, flores
                 ├─ world/     → grama, árvores, lagoa, pétalas
                 └─ entities/  → borboletas, abelhas, cogumelos, vagalumes, pedras
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
| `Game.js` | Classe raiz. Mantém o estado, roda o loop (`requestAnimationFrame`), processa cliques/toques, aplica a economia do jogo e dispara o auto-save. |
| `UI.js` | Camada de interface em DOM: atualiza HUD, barra de energia/nível, mensagens, texto flutuante "+N", menu inicial, modo foto e toggle dia/noite. |
| `SaveSystem.js` | Carrega e salva o estado em `localStorage`, com estado padrão e tolerância a falhas (modo privado, cota cheia). |

### `src/scenes/`
| Arquivo | Responsabilidade |
|---|---|
| `GardenScene.js` | Cria `renderer`, `scene` e `camera`; define o nível de qualidade por dispositivo (mobile vs. desktop); instancia e atualiza todos os sistemas; faz o raycast de cliques; libera recursos no `dispose()`. |

### `src/systems/`
Sistemas visuais reutilizáveis, independentes do cenário específico:
| Arquivo | Responsabilidade |
|---|---|
| `SkyDome.js` | Cúpula do céu com lua, estrelas e aurora. |
| `ParticleField.js` | Campo de partículas mágicas flutuantes. |
| `FlowerField.js` | As 7 espécies de flores e suas posições (usadas também pelas abelhas). |

### `src/world/`
Elementos do ambiente/cenário:
| Arquivo | Responsabilidade |
|---|---|
| `DayNightCycle.js` | Ciclo dia/noite: anima cores, luz do sol e fog. |
| `GrassField.js` | Grama via `InstancedMesh` (1 draw call para milhares de tufos). |
| `TreeField.js` | Árvores estilizadas com folhagem em camadas. |
| `Pond.js` | Lagoa com superfície animada. |
| `PetalParticles.js` | Pétalas caindo pelo jardim. |

### `src/entities/`
Criaturas e objetos animados:
| Arquivo | Responsabilidade |
|---|---|
| `Butterfly.js` | Borboletas com trajetória em figura-8 e batida de asas. |
| `Bee.js` | Abelhas em rota Bézier entre as posições das flores. |
| `Mushroom.js` | Cogumelos com material emissivo pulsante. |
| `Firefly.js` | Vagalumes noturnos renderizados como *sprites* aditivos (sem `PointLight` por vagalume, por performance). |
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
  funcionarem no GitHub Pages.
- **Deploy**: o workflow `.github/workflows/deploy.yml` roda a cada push em `main`:
  1. `npm ci` e `npm run build` (saída em `docs/`).
  2. Cria `docs/.nojekyll` e faz commit de `docs/` se houver mudanças.
  3. Publica `docs/` no GitHub Pages com `actions/deploy-pages`.

> ⚠️ **Nunca** edite ou versione documentação dentro de `docs/`: a pasta é
> **saída do build** e é sobrescrita a cada deploy. Documentos ficam na raiz
> (como este arquivo) ou em `.github/`.

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
