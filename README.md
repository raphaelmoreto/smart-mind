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

## 🚀 Tecnologias

### Backend — `smartmind-api`

Pela estrutura do projeto, o backend utiliza:

- **TypeScript**
- **NestJS**
- **Vitest** para testes
- **ESLint/Prettier** para qualidade e padronização de código

### Frontend — `smartmind-web`

Pela presença do `vite.config.ts`, o frontend utiliza:

- **JavaScript**
- **Vite**
- **ESLint**
- **NPM**

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

## 🔐 Configuração de ambiente

Informações específicas do ambiente devem ser armazenadas em variáveis de ambiente, evitando valores sensíveis diretamente no código.

Exemplo:

```env
PORT=3000
DATABASE_URL=...
API_URL=http://localhost:3000
```

---

## 🛠️ Scripts

### `smartmind-api`

Os scripts devem ser consultados no `package.json`. A estrutura atual indica comandos relacionados a:

```bash
npm run start
npm run start:dev
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
