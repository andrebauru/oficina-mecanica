# Contexto do Projeto: Sistema de Gerenciamento de Oficina Mecânica

## 📋 Visão Geral do Projeto
Este projeto é um sistema web desenvolvido para gerenciamento de oficinas mecânicas. Ele permite o controle abrangente de clientes, veículos, serviços, peças e ordens de serviço. A aplicação oferece um dashboard com visão geral e módulos dedicados para cada uma das entidades gerenciadas.

### Tecnologias Principais:
*   **Frontend**: React (v19.0.0) com TypeScript, utilizando Vite para construção e desenvolvimento rápido.
*   **UI/UX**: Material-UI (MUI v6.4.6) para componentes visuais, com temas personalizados.
*   **Roteamento**: React Router DOM (v7.2.0) para navegação entre as páginas.
*   **Gerenciamento de Datas**: MUI Date Pickers, date-fns e dayjs para manipulação e seleção de datas.
*   **Requisições HTTP**: Axios (v1.8.1) para comunicação com a API.
*   **Mock API**: JSON Server (v1.0.0-beta.3) para simular uma API RESTful localmente, utilizando `db.json` como fonte de dados.

### Funcionalidades Implementadas:
*   Dashboard com visão geral do sistema.
*   Cadastro e gerenciamento de clientes.
*   Controle de veículos associados aos clientes.
*   Gestão de serviços oferecidos pela oficina.
*   Controle de estoque de peças.
*   Gerenciamento de ordens de serviço, vinculando veículos, serviços e peças.

## 🛠️ Build e Execução

### Pré-requisitos:
Certifique-se de ter o Node.js e o npm (ou yarn) instalados em sua máquina.

### Comandos Essenciais:

1.  **Instalar Dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

2.  **Iniciar o Servidor de Desenvolvimento (Frontend):**
    Este comando inicia a aplicação React em modo de desenvolvimento.
    ```bash
    npm run dev
    # ou
    yarn dev
    ```

3.  **Iniciar o JSON Server (Mock API):**
    Este comando inicia um servidor de API local utilizando o `db.json` para fornecer os dados.
    ```bash
    npm run json-server
    # ou
    yarn json-server
    ```
    *   **Observação**: O JSON Server será executado na porta `3001` (http://localhost:3001).

4.  **Compilar a Aplicação para Produção:**
    ```bash
    npm run build
    # ou
    yarn build
    ```

5.  **Visualizar a Build de Produção Localmente:**
    ```bash
    npm run preview
    # ou
    yarn preview
    ```

### Estrutura da Mock API (`db.json`):
O arquivo `db.json` simula o backend da aplicação, contendo as seguintes coleções:
*   `clientes`: Dados de clientes.
*   `veiculos`: Dados de veículos, associados a `clientes`.
*   `servicos`: Lista de serviços da oficina.
*   `pecas`: Estoque de peças.
*   `ordens_servico`: Ordens de serviço, vinculando `veiculos`, `servicos` e `pecas`.

## ⚙️ Convenções de Desenvolvimento

### Linting:
O projeto utiliza ESLint para garantir a qualidade do código e seguir um padrão consistente. As configurações de linting são definidas em `eslint.config.js`.

### Estilo de Código:
Seguindo as convenções do React com TypeScript e Material-UI. O projeto preza por componentes funcionais, hooks e tipagem rigorosa.

## 🤝 Contribuição
Para contribuir, siga os padrões de código existentes e as práticas de desenvolvimento React/TypeScript. Abra issues para relatar bugs ou sugerir melhorias e Pull Requests para as implementações.
