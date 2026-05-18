# 🌸 Bloom Garden Ultimate

Um jardim mágico 3D para navegador, construído com **Three.js + Vite**. Visual rico, criaturas animadas, ciclo dia/noite e arquitetura modular ESM.

## 🎮 Jogar agora — sem instalar nada!

> **Abra o link abaixo no navegador e jogue diretamente:**
> ### ➡️ https://JAOG1V1.github.io/JAOG1V1-BloomGardenUltimate/

Nenhum download necessário. Funciona no celular e no computador.

---

## ✨ O que há no jardim

| Elemento | Descrição |
|---|---|
| 🌸 **Flores variadas** | Rosa, girassol, tulipa, margarida, lótus e mais (7 espécies) |
| 🦋 **Borboletas** | 8 borboletas coloridas com trajetórias em figura-8 e batida de asas |
| 🐝 **Abelhas** | 6 abelhas que coletam pólen em rotas Bézier entre flores |
| 🍄 **Cogumelos mágicos** | 12 cogumelos brilhantes com material emissivo pulsante |
| ✨ **Vagalumes** | 18 vagalumes que aparecem à noite com luz suave |
| 🌳 **Árvores estilizadas** | 8 árvores com folhagem em camadas que balança no vento |
| 💧 **Lagoa** | Superfície d'água animada com ondulações e reflexos |
| 🪨 **Pedras decorativas** | 14 rochas espalhadas pelo cenário |
| 🌿 **Grama instanciada** | 1600 tufos de grama animados via InstancedMesh |
| 🌸 **Pétalas caindo** | 100 pétalas coloridas derivando pelo jardim |
| 🌅 **Ciclo dia/noite** | Transição completa: amanhecer → meio-dia → pôr do sol → noite estrelada |
| 🌙 **Lua e estrelas** | Aparecem progressivamente durante a noite |
| 🌫️ **Neblina** | Fog suave para profundidade e atmosfera |

---

## 🎮 Controles

| Ação | Como fazer |
|---|---|
| Energizar flor | Clique / toque na flor central |
| Alternar Dia / Noite | Botão 🌙 (canto superior direito) |
| Modo Foto (esconde HUD) | Botão 📷 (canto superior direito) |
| Câmera girando | Automática (órbita lenta) |

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

---

## 🌐 Deploy no GitHub Pages

Este projeto é publicado pelo workflow `.github/workflows/deploy.yml`, que a cada push em `main`:

1. Roda `npm run build` (saída em `docs/`).
2. Faz commit de `docs/` de volta na branch.
3. Publica `docs/` no GitHub Pages via `actions/deploy-pages`.

Acesse em: **https://JAOG1V1.github.io/JAOG1V1-BloomGardenUltimate/**

---

## 📁 Estrutura do projeto

```
bloom-garden-ultimate/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js              # Ponto de entrada
    ├── styles/
    │   └── style.css        # Tema mágico com Quicksand + Cinzel + glassmorphism
    ├── game/
    │   ├── Game.js          # Loop principal e orquestração
    │   ├── UI.js            # HUD, modo foto, toggle dia/noite
    │   └── SaveSystem.js    # Save/load via localStorage
    ├── scenes/
    │   └── GardenScene.js   # Cena Three.js — integra todos os sistemas
    ├── systems/
    │   ├── SkyDome.js       # Cúpula do céu com lua, estrelas e aurora
    │   ├── ParticleField.js # Campo de partículas mágicas
    │   └── FlowerField.js   # 7 espécies de flores (rosa, tulipa, girassol…)
    ├── world/
    │   ├── DayNightCycle.js # Ciclo dia/noite com luzes e cores animadas
    │   ├── GrassField.js    # Grama instanciada (InstancedMesh)
    │   ├── TreeField.js     # Árvores estilizadas com folhagem em camadas
    │   ├── Pond.js          # Lagoa com ondulações animadas
    │   └── PetalParticles.js# Pétalas caindo
    └── entities/
        ├── Butterfly.js     # Borboletas com trajetória figura-8
        ├── Bee.js           # Abelhas com rota Bézier entre flores
        ├── Mushroom.js      # Cogumelos com emissivo pulsante
        ├── Firefly.js       # Vagalumes noturnos (PointLights)
        └── Rock.js          # Pedras decorativas
```

---

## 🛠️ Stack

| Tecnologia | Uso |
|---|---|
| [Three.js](https://threejs.org/) v0.174 | Renderização 3D WebGL |
| [Vite](https://vitejs.dev/) v6 | Bundler e dev server |
| JavaScript (ESM) | Lógica modular |
| Google Fonts (Quicksand + Cinzel) | Tipografia mágica |

---

## 🎮 Progressão do jogo

1. Clique em **"Entrar no Jardim"** no menu inicial
2. **Clique ou toque na flor central** para gerar energia
3. Energia → Seiva → Pontuação → Nível
4. O jardim pulsa, muda de cor e reage às suas interações!
5. Espere a noite para ver os vagalumes aparecerem ✨

