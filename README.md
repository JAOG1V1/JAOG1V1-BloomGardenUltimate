# 🌸 Bloom Garden Ultimate

Um jogo/jardim mágico para navegador, construído com **Three.js + Vite**. Visual forte, arquitetura modular e pronto para crescer.

---

## ✨ Visão geral

Bloom Garden Ultimate é uma experiência web interativa onde você cultiva um jardim mágico vivo:

- Cena 3D imersiva com céu animado, partículas mágicas e flores vivas
- Clique na flor central para energizá-la e gerar seiva
- Sistema de progressão com pontuação, seiva, energia e níveis
- Save automático no localStorage
- Base pronta para expansões futuras (mercado, missões, biomas, achievements)

---

## 🚀 Como abrir sem VS Code

Você **não precisa** do VS Code para jogar! Siga uma das opções abaixo:

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

**Pré-requisitos:** Node.js 18+ e npm

```bash
# 1. Clone o repositório
git clone https://github.com/JAOG1V1/JAOG1V1-BloomGardenUltimate.git
cd JAOG1V1-BloomGardenUltimate

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Abra `http://localhost:5173` no navegador.

---

## 🏗️ Build estático

```bash
npm run build
```

Os arquivos gerados ficam em `dist/`. Para visualizar o build localmente:

```bash
npm run preview
```

---

## 🌐 Deploy no GitHub Pages

1. Faça o build: `npm run build`
2. Publique a pasta `dist/` no branch `gh-pages` (ou configure via GitHub Actions)
3. Acesse em: `https://JAOG1V1.github.io/JAOG1V1-BloomGardenUltimate/`

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
    │   └── style.css        # Estilos globais com glassmorphism
    ├── game/
    │   ├── Game.js          # Loop principal e orquestração
    │   ├── UI.js            # Controle do HUD e menus
    │   └── SaveSystem.js    # Save/load via localStorage
    ├── scenes/
    │   └── GardenScene.js   # Cena Three.js (câmera, luzes, renderer)
    └── systems/
        ├── SkyDome.js       # Cúpula do céu animada com aurora e estrelas
        ├── ParticleField.js # Campo de partículas mágicas flutuantes
        └── FlowerField.js   # Flor central + campo de flores de fundo
```

---

## 🛠️ Stack

| Tecnologia | Uso |
|---|---|
| [Three.js](https://threejs.org/) | Renderização 3D WebGL |
| [Vite](https://vitejs.dev/) | Bundler e dev server |
| JavaScript (ESM) | Lógica do jogo |

---

## 🎮 Como jogar

1. Clique em **"Entrar no Jardim"** no menu inicial
2. **Clique ou toque na flor central** para energizá-la
3. A energia gera seiva, a seiva gera pontuação e faz você subir de nível
4. O jardim pulsa e reage às suas interações!

---

## 🔮 Próximas expansões planejadas

- [ ] Mercado de upgrades (velocidade, multiplicadores)
- [ ] Sistema de missões e achievements
- [ ] Biomas desbloqueáveis (floresta, oceano, vulcão)
- [ ] Efeitos visuais avançados (bloom, pós-processamento)
- [ ] Modo noturno e transições de dia/noite
- [ ] Sistema de som ambiente