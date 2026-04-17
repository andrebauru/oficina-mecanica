# 🛠️ Oficina Mecânica - Sistema de Gestão Multilíngue

## 📋 Sobre o Projeto

**Oficina Mecânica** é um sistema web completo de gestão para oficinas de conserto de veículos, desenvolvido com as mais modernas tecnologias web. O sistema oferece suporte completo a **4 idiomas** (Português, Vietnamita, Filipino e Japonês) com sincronização em tempo real em toda a interface.

### ✨ Características Principais

- 🌍 **Multilíngue Completo**: Interface 100% traduzida em 4 idiomas
- 🛠️ **Gestão de Ordens de Serviço**: Criação, acompanhamento e conclusão de OS
- 👥 **CRM de Clientes**: Sistema completo de gerenciamento de clientes
- 🚗 **Registro de Veículos**: Cadastro detalhado de veículos com documentação
- 📄 **Geração de Contratos**: Contratos de venda em formato PDF multilíngue
- 📊 **Dashboard Inteligente**: Visualização de KPIs e métricas em tempo real
- 💰 **Gestão Financeira**: Controle de vendas, recebíveis e faturamento
- 🗃️ **Armazenamento de Documentos**: Upload e organização de documentação
- 📱 **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18+** - Interface de usuário moderna
- **TypeScript** - Tipagem estática para segurança
- **Material-UI (MUI)** - Componentes UI profissionais
- **Vite** - Build tool rápido e eficiente
- **Axios** - Requisições HTTP
- **html2pdf.js** - Geração de PDFs

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MySQL** - Banco de dados relacional
- **UUID** - Geração de IDs únicos
- **Multer** - Upload de arquivos

### DevOps
- **Git** - Controle de versão
- **NPM** - Gerenciador de pacotes
- **Docker** (opcional) - Containerização

---

## 🌐 Suporte Multilíngue

O sistema detecta e muda automaticamente todos os textos da interface quando você seleciona um idioma diferente no menu. Os idiomas suportados são:

| Idioma | Código | Status |
|--------|--------|--------|
| 🇧🇷 Português | `pt` | ✅ Completo |
| 🇻🇳 Vietnamita | `vi` | ✅ Completo |
| 🇵🇭 Filipino | `fil` | ✅ Completo |
| 🇯🇵 Japonês | `ja` | ✅ Completo |

### Exemplos de Palavras Traduzidas

```
PORTUGUÊS    | VIETNAMITA      | FILIPINO        | JAPONÊS
-------------|-----------------|-----------------|------------------
Clientes     | Khách hàng      | Mga Kliyente    | お客様
Veículos     | Xe cộ           | Mga Sasakyan    | 車両
Serviços     | Dịch vụ         | Mga Serbisyo    | サービス
Documentos   | Tài liệu        | Mga Dokumento   | ドキュメント
Gerar        | Tạo             | Lumikha         | 作成
```

---

## 📦 Instalação

### Pré-requisitos
- Node.js 16+ ou superior
- NPM ou Yarn
- MySQL 8+
- Git

### Frontend
```bash
# Clonar o repositório
git clone https://github.com/fvandrad/oficina-mecanica.git
cd oficina-mecanica

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Backend
```bash
cd backend

# Instalar dependências
npm install

# Configurar arquivo .env
cp .env.example .env
# Editar .env com suas configurações de banco de dados

# Iniciar servidor
npm start
# ou com watch mode
npm run dev
```

---

## 🔧 Configuração

### Variáveis de Ambiente (.env)

**Frontend** (`root/.env.example`)
```env
VITE_API_URL=http://localhost:3001/api
```

**Backend** (`backend/.env.example`)
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=oficina_mecanica
SESSION_SECRET=sua_chave_secreta_segura
```

### Banco de Dados
```bash
# Executar schema no MySQL
mysql -u root -p oficina_mecanica < backend/schema.sql
```

---

## 📱 Interface do Usuário

### Dashboard Principal
Visualize KPIs importantes:
- Total de clientes
- Total de veículos
- Ordens em andamento
- Faturamento total
- Valores a receber
- Últimas transações

### Menu de Navegação
- **OS** - Ordens de Serviço
- **Clientes** - Gerenciamento de clientes
- **Veículos** - Registro de veículos
- **Serviços** - Cadastro de serviços
- **Peças** - Catálogo de peças
- **Vendas** - Vendas de carros
- **Financeiro** - Gestão financeira
- **Configurações** - Ajustes do sistema

---

## 🎯 Funcionalidades Principais

### 1️⃣ Gestão de Clientes
- Cadastro completo com documentação
- Upload de documentos (DNI, CNH, etc.)
- Histórico de atendimentos (CRM)
- Contatos e endereços

### 2️⃣ Registro de Veículos
- Cadastro de veículos associados a clientes
- Documentação do veículo
- Histórico de manutenção
- Fotos e anotações

### 3️⃣ Ordens de Serviço
- Criação de OS com descrição
- Acompanhamento de status
- Cálculo de valores
- Conclusão com relatório

### 4️⃣ Geração de Contratos
- Contratos de venda em PDF
- Suporte a 4 idiomas
- Cálculo automático de parcelas
- Download direto do navegador

### 5️⃣ Gestão Financeira
- Controle de recebíveis
- Status de pagamentos
- Relatórios de faturamento
- Integração com WhatsApp

---

## 🔐 Segurança

- ✅ Autenticação de usuários
- ✅ Sessões com timeout de 1 hora
- ✅ Proteção CSRF
- ✅ CORS configurado
- ✅ Validação de entrada
- ✅ Sanitização de dados
- ✅ Senhas criptografadas

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- `usuarios` - Usuários do sistema
- `clientes` - Dados de clientes
- `veiculos` - Registro de veículos
- `ordens_servico` - Ordens de serviço
- `servicos` - Catálogo de serviços
- `pecas` - Catálogo de peças
- `vendas` - Vendas de carros
- `client_documents` - Documentos e contratos
- `empresas` - Configurações da empresa

---

## 🚀 Deploy

### Vercel (Frontend)
```bash
npm run build
# Fazer push para GitHub
git push origin main
# Deploy automático via Vercel
```

### Heroku (Backend)
```bash
heroku create oficina-mecanica-backend
git push heroku main
```

### Docker (Opcional)
```bash
docker build -t oficina-mecanica .
docker run -p 3000:3000 oficina-mecanica
```

---

## 🐛 Troubleshooting

### Erro: "Conexão recusada no banco de dados"
- Verificar se MySQL está rodando
- Confirmar credenciais em `.env`
- Executar schema do banco

### Erro: "Idioma não muda na interface"
- Verificar se `useLanguage()` está importado
- Confirmar se `t()` está sendo chamado
- Checar console para erros

### Erro: "PDF não gera"
- Verificar se html2pdf está instalado
- Confirmar permissões de arquivo
- Checar se dados estão corretos

---

## 📝 API Documentation

### Endpoints Principais

#### Clientes
```
GET    /api/clientes           - Listar clientes
POST   /api/clientes           - Criar cliente
PUT    /api/clientes/:id       - Atualizar cliente
DELETE /api/clientes/:id       - Deletar cliente
```

#### Veículos
```
GET    /api/veiculos           - Listar veículos
POST   /api/veiculos           - Criar veículo
PUT    /api/veiculos/:id       - Atualizar veículo
DELETE /api/veiculos/:id       - Deletar veículo
```

#### Contratos
```
POST   /api/contracts/generate - Gerar contrato
GET    /api/contracts/:id      - Obter contrato
GET    /api/clients/:id/contracts - Listar contratos do cliente
DELETE /api/contracts/:id      - Deletar contrato
```

#### Documentos
```
GET    /api/clients/:id/documents - Listar documentos
POST   /api/clients/:id/documents - Upload de documento
DELETE /api/clients/:id/documents/:docId - Deletar documento
```

---

## 📞 Suporte

Para reportar bugs ou sugerir features:
- 📧 Email: support@oficinamecanica.com
- 🐙 GitHub Issues: [GitHub](https://github.com/fvandrad/oficina-mecanica/issues)
- 💬 Discord: [Discord Server](https://discord.gg/oficinamecanica)

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes

---

## 👥 Contribuidores

- **Fernando Vandrad** (@fvandrad) - Desenvolvedor Principal
- **GitHub Copilot** - Assistência em desenvolvimento

---

## 🎓 Aprendizados

Este projeto demonstra:
- ✅ Arquitetura Full Stack moderna
- ✅ Internacionalização (i18n) completa
- ✅ Padrões de design em React
- ✅ Integração Frontend-Backend
- ✅ Gestão de estado com Context API
- ✅ Geração de PDF dinâmico
- ✅ Autenticação e autorização
- ✅ Boas práticas de código

---

## 🎉 Status do Projeto

| Componente | Status | Progresso |
|-----------|--------|-----------|
| Frontend | ✅ Completo | 100% |
| Backend | ✅ Completo | 100% |
| Banco de Dados | ✅ Completo | 100% |
| Testes | ⚠️ Parcial | 60% |
| Deploy | ⚠️ Planejado | 0% |
| Documentação | ✅ Completo | 100% |

---

## 🚀 Roadmap Futuro

- [ ] Testes E2E com Cypress
- [ ] App Mobile com React Native
- [ ] Sistema de notificações
- [ ] Integração com WhatsApp Business API
- [ ] Relatórios avançados com gráficos
- [ ] Sistema de backup automático
- [ ] Integração com sistemas de pagamento
- [ ] Suporte para mais idiomas

---

**Feito com ❤️ para oficinas de conserto de veículos**

Versão: 1.0.0 | Última atualização: 17 de abril de 2026
