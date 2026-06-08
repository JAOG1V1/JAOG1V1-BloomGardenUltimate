# 🌸 Bloom Garden Ultimate

[![Deploy](https://github.com/JAOG1V1/JAOG1V1-BloomGardenUltimate/actions/workflows/deploy.yml/badge.svg)](https://github.com/JAOG1V1/JAOG1V1-BloomGardenUltimate/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Made with Three.js](https://img.shields.io/badge/Made%20with-Three.js-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

Um jardim mágico 3D para navegador, construído com **Three.js + Vite**. Visual rico, criaturas animadas, ciclo dia/noite e arquitetura modular ESM.

<p align="center">
  <a href="https://JAOG1V1.github.io/JAOG1V1-BloomGardenUltimate/">
    <b>🌼 ➡️ JOGAR AGORA NO NAVEGADOR ⬅️ 🌼</b>
  </a>
</p>

> Nenhum download necessário. Funciona no celular e no computador.

---

## 📑 Índice

- [Sobre o jogo](#-sobre-o-jogo)
- [Screenshots](#-screenshots)
- [O que há no jardim](#-o-que-há-no-jardim)
- [Como jogar e progressão](#-como-jogar-e-progressão)
- [Controles](#-controles)
- [Como abrir localmente](#-como-abrir-localmente)
- [Build estático](#️-build-estático)
- [Deploy no GitHub Pages](#-deploy-no-github-pages)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Stack](#️-stack)
- [Roadmap / próximos passos](#️-roadmap--próximos-passos)
- [Como contribuir](#-como-contribuir)
- [Créditos e agradecimentos](#-créditos-e-agradecimentos)
- [Licença](#-licença)

---

## 🌷 Sobre o jogo

**Bloom Garden Ultimate** é um jardim 3D vivo e contemplativo que roda direto no
navegador. A proposta é simples e relaxante: você cuida de uma flor central que,
ao ser energizada, faz todo o jardim pulsar, brilhar e crescer ao seu redor.

A atmosfera é o coração da experiência. Um **ciclo dia/noite** completo conduz o
cenário do amanhecer ao meio-dia, do pôr do sol à noite estrelada — com cores,
luzes e neblina mudando suavemente. Durante o dia, **borboletas** desenham
trajetórias no ar e **abelhas** viajam entre as flores; quando a noite chega,
**vagalumes** acendem, a **lua** sobe e o céu se enche de **estrelas**.

Tudo é montado em tempo real com Three.js: **grama instanciada** balançando ao
vento, **árvores** com folhagem em camadas, uma **lagoa** com ondulações,
**cogumelos** que pulsam com luz própria e **pétalas** que derivam pelo ar. É um
brinquedo digital tranquilo — pensado tanto para brincar quanto para tirar fotos
bonitas no **Modo Foto**.

---

## 📸 Screenshots

> 💡 **Capturas ainda não adicionadas.** A melhor forma de ver o jogo é
> [jogar agora no navegador](https://JAOG1V1.github.io/JAOG1V1-BloomGardenUltimate/).
> Para ilustrar este README, gere as imagens com o **Modo Foto** (📷) e salve-as
> em [`assets/`](./assets/) — os nomes esperados e as instruções estão em
> [assets/README.md](./assets/README.md). Depois, descomente as linhas abaixo:

<!--
![Gameplay](./assets/screenshot.png)
![Jardim à noite](./assets/screenshot-night.png)
-->


---

## ✨ O que há no jardim

| Elemento | Descrição |
|---|---|
| 🌸 **Flores variadas** | Rosa, girassol, tulipa, margarida, lótus e mais (7 espécies) |
| 🦋 **Borboletas** | Borboletas coloridas com trajetórias em figura-8 e batida de asas |
| 🐝 **Abelhas** | 6 abelhas que coletam pólen em rotas Bézier entre flores |
| 🍄 **Cogumelos mágicos** | Cogumelos brilhantes com material emissivo pulsante |
| ✨ **Vagalumes** | Vagalumes que aparecem à noite com brilho suave |
| 🌳 **Árvores estilizadas** | Árvores com folhagem em camadas que balança no vento |
| 💧 **Lagoa** | Superfície d'água animada com ondulações e reflexos |
| 🪨 **Pedras decorativas** | Rochas espalhadas pelo cenário |
| 🌿 **Grama instanciada** | Milhares de tufos de grama animados via InstancedMesh |
| 🌸 **Pétalas caindo** | Pétalas coloridas derivando pelo jardim |
| 🌅 **Ciclo dia/noite** | Transição completa: amanhecer → meio-dia → pôr do sol → noite estrelada |
| 🌙 **Lua e estrelas** | Aparecem progressivamente durante a noite |
| 🌫️ **Neblina** | Fog suave para profundidade e atmosfera |

> 🔧 As quantidades de grama, criaturas e partículas se ajustam automaticamente
> entre **desktop** e **mobile** para manter o jogo fluido em qualquer aparelho.

---

## 🎮 Como jogar e progressão

O loop do jogo é leve e satisfatório:

1. No menu inicial, clique em **"Entrar no Jardim"**.
2. **Clique ou toque na flor central** para gerar **energia** ⚡.
3. A energia se converte continuamente em **seiva** 🌿 e em **pontuação** 🏆.
4. Ao acumular seiva suficiente, o jardim sobe de **nível** 🌟 e floresce mais
   forte — crescendo mais rápido a cada nível.
5. A energia decai com o tempo, então continue interagindo para manter o jardim vibrante.
6. Espere a **noite** para ver os vagalumes acenderem ✨.

```
clique → ENERGIA → SEIVA → NÍVEL
   └──────────────→ PONTUAÇÃO (permanente)
```

> 💾 Seu progresso é salvo automaticamente no navegador (localStorage) e
> retomado quando você voltar.

---

## 🎮 Controles

| Ação | Como fazer |
|---|---|
| Energizar flor | Clique / toque na flor central |
| Coletar power-up | Clique / toque no item brilhante que aparece no jardim |
| Girar a câmera | Arraste com o mouse / dedo (a órbita automática pausa e retoma sozinha) |
| Zoom | Roda do mouse / pinça com dois dedos |
| Loja & Coleção | Botões 🛒 e 📖 (canto superior direito) |
| Alternar Dia / Noite | Botão 🌙 (canto superior direito) |
| Som ligado / desligado | Botão 🔊 (canto superior direito) |
| Modo Foto (esconde HUD) | Botão 📷 (canto superior direito) — `Esc` para sair |

---

## 🚀 Como abrir localmente

### ▶️ Opção 1 — Script de início rápido (recomendado)

1. Instale o **[Node.js LTS](https://nodejs.org/)** caso ainda não tenha
2. Execute o script de início:
   - **Windows:** dê dois cliques no arquivo **`start.bat`**
   - **Mac/Linux:** abra o terminal na pasta do projeto e execute:
     ```bash
     bash start.sh
     ```
3. Quando aparecer o endereço `http://localhost:5173`, abra-o no navegador

### 🛠️ Opção 2 — Linha de comando manual

```bash
git clone https://github.com/JAOG1V1/JAOG1V1-BloomGardenUltimate.git
cd JAOG1V1-BloomGardenUltimate
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador.

---

## 🏗️ Build estático

```bash
npm run build
```

Os arquivos gerados ficam em `docs/`. Para visualizar o build localmente:

```bash
npm run preview
```

> ⚠️ A pasta `docs/` é **saída do build** e é publicada no GitHub Pages.
> Não edite seu conteúdo à mão — ele é sobrescrito a cada deploy.

---

## 🌐 Deploy no GitHub Pages

Este projeto é publicado pelo workflow `.github/workflows/deploy.yml`, que a cada push em `main`:

1. Instala dependências (`npm ci`) e roda os testes (`npm test`).
2. Roda `npm run build` (saída em `docs/`, incluindo `.nojekyll`).
3. Publica `docs/` no GitHub Pages como **artefato** via `actions/deploy-pages`
   (Pages configurado como *source: GitHub Actions* — a saída de build **não** é
   versionada no repositório).

> O workflow `.github/workflows/ci.yml` também roda testes + build em cada Pull
> Request, pegando regressões antes do merge.

Acesse em: **https://JAOG1V1.github.io/JAOG1V1-BloomGardenUltimate/**

---

## 📁 Estrutura do projeto

```
bloom-garden-ultimate/
├── index.html
├── package.json
├── vite.config.js
├── start.sh / start.bat     # Scripts de início rápido (Mac/Linux e Windows)
├── LICENSE                  # Licença MIT
├── DESENVOLVIMENTO.md       # Guia de arquitetura e desenvolvimento
├── assets/                  # Imagens do README (screenshots / GIFs)
├── public/                  # Favicons, ícones PWA, site.webmanifest e sw.js (offline)
├── test/                    # Testes unitários (Vitest) da lógica pura
├── .github/
│   ├── CONTRIBUTING.md      # Guia de contribuição
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/      # Templates de bug e sugestão
│   └── workflows/
│       ├── ci.yml           # Testes + build em cada Pull Request
│       └── deploy.yml       # Build + deploy no GitHub Pages
└── src/
    ├── main.js              # Ponto de entrada
    ├── styles/
    │   └── style.css        # Tema mágico com Quicksand + Cinzel + glassmorphism
    ├── game/
    │   ├── Game.js          # Loop principal, economia, combo, power-ups e orquestração
    │   ├── UI.js            # HUD, menu, loja, coleção, tutorial e modo foto
    │   ├── SaveSystem.js    # Save/load via localStorage (com migração de versão)
    │   ├── Sound.js         # Áudio WebAudio sintetizado (cliques, ambiente)
    │   ├── Achievements.js  # Definições das conquistas
    │   └── Upgrades.js      # Definições da loja (upgrades e custos)
    ├── scenes/
    │   └── GardenScene.js   # Cena Three.js — integra todos os sistemas
    ├── systems/
    │   ├── SkyDome.js       # Cúpula do céu com lua, estrelas e aurora
    │   ├── ParticleField.js # Campo de partículas mágicas
    │   ├── FlowerField.js   # Flor central + prado de fundo (posições p/ abelhas)
    │   ├── FlowerSpecies.js # Construtores 3D das 7 espécies de flores
    │   └── textures.js      # Texturas procedurais compartilhadas (cache)
    ├── world/
    │   ├── DayNightCycle.js # Ciclo dia/noite com luzes e cores animadas
    │   ├── Terrain.js       # Relevo do solo + cobertura instanciada + bacia da lagoa
    │   ├── GrassField.js    # Grama instanciada (InstancedMesh) com vento na GPU
    │   ├── TreeField.js     # Árvores estilizadas com folhagem em camadas
    │   ├── Pond.js          # Lagoa com ondulações animadas
    │   └── PetalParticles.js# Pétalas caindo
    └── entities/
        ├── Butterfly.js     # Borboletas com trajetória figura-8
        ├── Bee.js           # Abelhas com rota Bézier entre flores
        ├── Mushroom.js      # Cogumelos com emissivo pulsante
        ├── Firefly.js       # Vagalumes noturnos (sprites aditivos)
        ├── PowerUp.js       # Power-ups clicáveis que surgem no jardim
        └── Rock.js          # Pedras decorativas
```

> 🧱 A pasta `docs/` (não listada acima) é **saída do build** — gerada por
> `npm run build` e publicada no GitHub Pages pelo workflow. Ela é
> **ignorada pelo git** (`.gitignore`); o deploy a reconstrói a cada push.

> 📖 Para entender a arquitetura em profundidade, leia o
> **[DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)**.

---

## 🛠️ Stack

| Tecnologia | Uso |
|---|---|
| [Three.js](https://threejs.org/) v0.174 | Renderização 3D WebGL |
| [Vite](https://vitejs.dev/) v6 | Bundler e dev server |
| JavaScript (ESM) | Lógica modular |
| Google Fonts (Quicksand + Cinzel) | Tipografia mágica |

---

## 🗺️ Roadmap / próximos passos

Já entregue ✅:

- [x] 🎵 Som ambiente e efeitos sonoros suaves (WebAudio).
- [x] 🏆 Conquistas, missões e coleção de espécies.
- [x] 🛒 Loja de upgrades, combo e power-ups.
- [x] ♿ Acessibilidade: teclado (Espaço/Enter), foco nos modais, `prefers-reduced-motion`, rótulos ARIA.
- [x] ⚡ Desempenho adaptativo (ajuste automático de qualidade por FPS) + modo econômico.
- [x] 📱 PWA instalável e jogável **offline** (service worker).

Próximas ideias (contribuições são bem-vindas!):

- [ ] 📸 Adicionar capturas de tela e um GIF de gameplay ao README.
- [ ] 🌺 Novas espécies de flores e criaturas (libélulas, joaninhas).
- [ ] 🌧️ Eventos de clima (chuva leve, arco-íris após a chuva).
- [ ] 🎨 Mais opções no Modo Foto (filtros, enquadramentos).

---

## 🤝 Como contribuir

Contribuições são muito bem-vindas! Veja o guia completo em
**[.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md)** — ele explica como
fazer fork, criar branches, o padrão de commits e abrir um Pull Request.

Para reportar bugs ou sugerir melhorias, abra uma
[issue](https://github.com/JAOG1V1/JAOG1V1-BloomGardenUltimate/issues) usando os
templates disponíveis.

---

## 💛 Créditos e agradecimentos

- **[Three.js](https://threejs.org/)** — a base de toda a renderização 3D.
- **[Vite](https://vitejs.dev/)** — bundler e servidor de desenvolvimento.
- **[Google Fonts](https://fonts.google.com/)** — tipografia
  **[Quicksand](https://fonts.google.com/specimen/Quicksand)** e
  **[Cinzel](https://fonts.google.com/specimen/Cinzel)**, que dão o ar mágico ao projeto.

Feito com 🌱 por [JAOG1V1](https://github.com/JAOG1V1).

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.
