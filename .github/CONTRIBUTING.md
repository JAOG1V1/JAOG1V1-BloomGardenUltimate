# 🌱 Como contribuir — Bloom Garden Ultimate

Obrigado pelo interesse em ajudar a fazer o jardim florescer! 🌸
Toda contribuição é bem-vinda: correções de bugs, novas flores e criaturas,
melhorias de performance, documentação ou ideias.

## 📋 Antes de começar

- O projeto usa **Three.js v0.174** + **Vite v6**, em **JavaScript ESM modular**.
- A publicação no GitHub Pages sai da pasta `docs/`, que é **gerada pelo build**.
  **Nunca edite `docs/` à mão** — seu conteúdo é sobrescrito a cada deploy.
- Para entender a arquitetura em detalhe, leia o
  [DESENVOLVIMENTO.md](../DESENVOLVIMENTO.md).

## 🚀 Rodando o projeto localmente

Você vai precisar do **[Node.js LTS](https://nodejs.org/)**.

```bash
# 1. Faça um fork e clone o seu fork
git clone https://github.com/SEU-USUARIO/JAOG1V1-BloomGardenUltimate.git
cd JAOG1V1-BloomGardenUltimate

# 2. Instale as dependências
npm install

# 3. Suba o servidor de desenvolvimento
npm run dev
```

Abra `http://localhost:5173` no navegador. O Vite recarrega automaticamente a cada
alteração.

Para gerar o build estático (saída em `docs/`):

```bash
npm run build
npm run preview   # visualiza o build localmente
```

## 🌿 Fluxo de contribuição

1. **Faça um fork** do repositório.
2. **Crie uma branch** descritiva a partir de `main`:
   ```bash
   git checkout -b feat/nova-flor-orquidea
   ```
3. **Faça suas alterações** seguindo as convenções de código abaixo.
4. **Teste** localmente com `npm run dev` e garanta que `npm run build` continua
   funcionando sem erros.
5. **Faça commits pequenos e descritivos** (veja o padrão abaixo).
6. **Abra um Pull Request** para a branch `main`, descrevendo o que mudou e por quê.
   Inclua screenshots ou GIFs quando a mudança for visual.

### ✍️ Padrão de commits

Use mensagens curtas no estilo [Conventional Commits](https://www.conventionalcommits.org/):

| Prefixo | Quando usar |
|---|---|
| `feat:` | Nova funcionalidade (flor, criatura, sistema) |
| `fix:` | Correção de bug |
| `perf:` | Melhoria de performance |
| `docs:` | Apenas documentação |
| `refactor:` | Refatoração sem mudança de comportamento |
| `style:` | Formatação, espaçamento (sem mudar lógica) |
| `chore:` | Tarefas de manutenção, build, dependências |

Exemplos:

```
feat: adiciona espécie de flor orquídea ao FlowerField
fix: corrige vagalumes não aparecendo no modo noturno
perf: usa InstancedMesh para as pedras decorativas
```

## 🎨 Convenções de código e estilo

- **ESM modular**: cada sistema/entidade vive no seu próprio módulo, com uma
  classe exportada (ex.: `export class Butterfly`).
- **Organização de pastas** (mantenha o padrão):
  - `src/game/` — orquestração, UI, save.
  - `src/scenes/` — montagem da cena Three.js.
  - `src/systems/` — sistemas visuais reutilizáveis (céu, partículas, flores).
  - `src/world/` — elementos do cenário (grama, árvores, lagoa, pétalas).
  - `src/entities/` — criaturas e objetos animados (borboletas, abelhas, etc.).
- **Indentação de 2 espaços** e ponto e vírgula ao final das instruções,
  acompanhando o estilo já existente no código.
- **Nomes**: classes em `PascalCase`, variáveis e métodos em `camelCase`,
  campos privados com prefixo `_` (ex.: `this._mesh`).
- **Comentários** em português, curtos e explicando o "porquê" quando a intenção
  não for óbvia.
- **Performance** (jogo 3D em tempo real): prefira `InstancedMesh` para objetos
  repetidos, libere recursos da GPU com `dispose()`, evite criar muitas luzes
  dinâmicas e reaproveite geometrias/materiais e texturas sempre que possível.

## 🐛 Reportando bugs e sugerindo melhorias

Abra uma **[issue](https://github.com/JAOG1V1/JAOG1V1-BloomGardenUltimate/issues)**
usando os templates disponíveis:

- **Bug**: descreva o que aconteceu, o que era esperado, passos para reproduzir,
  navegador/dispositivo e, se possível, um print ou GIF.
- **Sugestão / melhoria**: descreva a ideia, o problema que ela resolve e como
  imagina o resultado.

## 💚 Código de conduta

Seja gentil e respeitoso, como um bom jardineiro. Mantenha as discussões
construtivas e focadas em fazer o projeto crescer.

Boa jardinagem! 🌻
