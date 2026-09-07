# SmartMind

Sistema web composto por uma API e uma aplicação frontend, organizado em dois projetos principais:

- `smartmind-api`: backend da aplicação
- `smartmind-web`: frontend da aplicação

## 📁 Estrutura do projeto

```text
SmartMind/
├── smartmind-api/
│   ├── node_modules/
│   ├── src/
│   ├── test/
│   ├── .gitignore
│   ├── .prettierrc
│   ├── nest-cli.json
│   ├── oxlint.json
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.build.json
│   ├── tsconfig.json
│   ├── vitest.config.e2e...
│   └── vitest.config.ts
│
└── smartmind-web/
    ├── node_modules/
    ├── public/
    ├── src/
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    └── package.json
```

> A estrutura acima foi criada a partir da organização visual apresentada no projeto. Os detalhes internos de `src/` ainda podem ser documentados conforme os módulos e funcionalidades forem definidos.

---

## 🚀 Tecnologias

### Backend — `smartmind-api`

Pela estrutura do projeto, o backend utiliza:

- **Node.js**
- **TypeScript**
- **NestJS**
- **Vitest** para testes
- **ESLint/Oxlint/Prettier** para qualidade e padronização de código

### Frontend — `smartmind-web`

Pela presença do `vite.config.ts`, o frontend utiliza:

- **Node.js**
- **TypeScript/JavaScript**
- **Vite**
- **ESLint**
- **NPM**

> O framework de UI utilizado no frontend (por exemplo, React ou outro) pode ser especificado aqui conforme a implementação do projeto.

---

## 🧠 Sobre o projeto

O **SmartMind** é uma aplicação web estruturada com separação entre frontend e backend.

A aplicação possui a seguinte divisão de responsabilidades:

```text
smartmind-web  →  Interface do usuário
                     ↓
                  HTTP/API
                     ↓
smartmind-api  →  Regras de negócio e acesso aos dados
```

Essa separação permite desenvolver e testar cada parte da aplicação de forma independente.

---

## 🏗️ Arquitetura

### Backend

O projeto `smartmind-api` utiliza a estrutura padrão de uma aplicação NestJS, centralizando a aplicação dentro da pasta `src/`.

Uma organização recomendada para evolução do projeto é:

```text
src/
├── modules/
│   ├── ...
│
├── common/
│   ├── ...
│
├── config/
│   └── ...
│
├── app.module.ts
└── main.ts
```

A estrutura pode ser adaptada conforme os módulos e regras de negócio do SmartMind.

### Frontend

A aplicação `smartmind-web` mantém a interface dentro de `src/` e os arquivos públicos em `public/`.

Uma organização possível é:

```text
src/
├── components/
├── pages/
├── services/
├── hooks/
├── models/
├── assets/
└── ...
```

---

## ⚙️ Pré-requisitos

Antes de executar o projeto, tenha instalado:

- [Node.js](https://nodejs.org/)
- NPM

Para verificar:

```bash
node --version
npm --version
```

---

## ▶️ Executando o Backend

Entre na pasta da API:

```bash
cd smartmind-api
```

Instale as dependências:

```bash
npm install
```

Execute em modo de desenvolvimento:

```bash
npm run start:dev
```

A API deverá iniciar utilizando a configuração definida pelo projeto.

### Testes

Executar os testes:

```bash
npm test
```

Testes em modo de observação:

```bash
npm run test:watch
```

Testes end-to-end:

```bash
npm run test:e2e
```

> Os comandos disponíveis podem variar conforme o conteúdo atual do `package.json`.

---

## ▶️ Executando o Frontend

Entre na pasta do frontend:

```bash
cd smartmind-web
```

Instale as dependências:

```bash
npm install
```

Execute o ambiente de desenvolvimento:

```bash
npm run dev
```

O Vite exibirá no terminal a URL utilizada para acessar a aplicação.

---

## 🔌 Comunicação entre Frontend e Backend

O frontend deve consumir os endpoints disponibilizados pela API.

Exemplo conceitual:

```text
Frontend
   │
   │ HTTP Request
   ▼
smartmind-api
   │
   │ Processamento
   ▼
Banco de dados / serviços externos
```

Uma boa prática é centralizar as chamadas HTTP em serviços próprios:

```text
src/
└── services/
    ├── api.ts
    ├── auth.service.ts
    └── ...
```

---

## 🔐 Configuração de ambiente

Informações específicas do ambiente devem ser armazenadas em variáveis de ambiente, evitando valores sensíveis diretamente no código.

Exemplo:

```env
PORT=3000
DATABASE_URL=...
API_URL=http://localhost:3000
```

> Os nomes das variáveis devem ser ajustados de acordo com a configuração real do projeto.

---

## 🧪 Testes

O backend possui uma estrutura de testes dedicada:

```text
smartmind-api/
└── test/
```

Além disso, o projeto possui configurações relacionadas ao **Vitest**, indicando o uso dessa ferramenta para testes automatizados.

A estratégia recomendada é manter testes para:

- regras de negócio;
- serviços;
- controllers/endpoints;
- cenários de erro;
- integração entre componentes importantes.

---

## 📌 Convenções recomendadas

Para manter o projeto organizado:

### Código

- Utilize nomes descritivos para variáveis, classes e funções.
- Separe responsabilidades.
- Evite lógica de negócio diretamente nos controllers.
- Centralize chamadas à API no frontend.
- Evite duplicação de código.

### Git

Utilize commits objetivos:

```text
feat: adiciona autenticação
fix: corrige validação de usuário
refactor: reorganiza módulo de usuários
test: adiciona testes para autenticação
docs: atualiza documentação
```

---

## 🛠️ Scripts

### `smartmind-api`

Os scripts devem ser consultados no `package.json`. A estrutura atual indica comandos relacionados a:

```bash
npm run start
npm run start:dev
npm test
npm run test:e2e
```

### `smartmind-web`

Os scripts devem ser consultados no `package.json`. Em um projeto Vite, normalmente existe:

```bash
npm run dev
npm run build
npm run preview
```

---

## 📚 Documentação

Documentações específicas podem ser adicionadas posteriormente:

- arquitetura;
- endpoints da API;
- modelo do banco de dados;
- autenticação;
- regras de negócio;
- componentes do frontend;
- fluxos da aplicação;
- testes.

---

## 👥 Desenvolvimento

Este projeto pode ser desenvolvido de forma independente em cada aplicação:

```text
SmartMind
├── Backend
│   └── smartmind-api
│
└── Frontend
    └── smartmind-web
```

---

## 📄 Licença

Defina aqui a licença utilizada pelo projeto.

Exemplo:

```text
MIT License
```

