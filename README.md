# Shopify Batch Fetch - Automação de Encomendas

Uma aplicação web para automatizar a extração de encomendas do Shopify quando um limite de encomendas é atingido.

## 📋 Sobre o Projeto

Este projeto permite conectar lojas Shopify e extrair encomendas automaticamente com base em triggers configuráveis. A aplicação inclui:

- ✅ Autenticação de usuários com Supabase Auth
- ✅ Dashboard com estatísticas
- ✅ Gestão de configurações Shopify
- ✅ Histórico de encomendas
- ✅ Logs de automação
- ⚠️ **NOTA**: A integração com a API do Shopify ainda não está implementada

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Validação**: Zod
- **Routing**: React Router v6

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ & npm (recomendado: [nvm](https://github.com/nvm-sh/nvm))
- Conta Supabase (gratuita)
- Conta Shopify (para testes)

### Passos de Instalação

```bash
# 1. Clone o repositório
git clone <YOUR_GIT_URL>
cd shopify-batch-fetch

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

### Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute as migrations em `supabase/migrations/`
3. Configure as variáveis no `.env`:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`

## 🔒 Segurança

### ⚠️ IMPORTANTE: Antes de fazer deploy

Este projeto inclui várias medidas de segurança, mas **requer configuração adicional antes do deploy em produção**:

1. **Credenciais**: Nunca commite o arquivo `.env` (já está no `.gitignore`)
2. **Tokens Shopify**: Atualmente armazenados em plaintext - **DEVE ser criptografado usando Supabase Vault**
3. **Email Verification**: Configure no Supabase Dashboard
4. **Rate Limiting**: Configure para prevenir abuso
5. **Logging**: Integre com Sentry/LogRocket para produção

Consulte [SECURITY.md](./SECURITY.md) para detalhes completos sobre:
- Vulnerabilidades conhecidas
- Como implementar criptografia de tokens
- Checklist de segurança para produção
- Boas práticas

### ✅ Medidas de Segurança Implementadas

- [x] Validação de inputs com Zod
- [x] Senhas fortes (8+ chars, maiúscula, minúscula, número)
- [x] TypeScript strict mode
- [x] Row Level Security (RLS) no Supabase
- [x] Protected routes
- [x] Recuperação de senha
- [x] Logging seguro (desabilitado em produção)
- [x] Validação de URLs e tokens do Shopify

## 📚 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes shadcn/ui
│   └── ...             # Componentes customizados
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx     # Hook de autenticação
│   └── use-toast.ts    # Hook de notificações
├── lib/                # Utilitários
│   ├── validations.ts  # Schemas Zod
│   ├── logger.ts       # Logger seguro
│   └── utils.ts        # Funções auxiliares
├── pages/              # Páginas da aplicação
│   ├── Auth.tsx        # Login/Register/Reset
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Orders.tsx      # Lista de encomendas
│   ├── Logs.tsx        # Logs de automação
│   └── Settings.tsx    # Configurações Shopify
└── integrations/       # Integrações externas
    └── supabase/       # Cliente Supabase
```

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Lint com ESLint
```

### Adicionar Nova Feature

1. Crie o componente em `src/components/` ou página em `src/pages/`
2. Adicione validação em `src/lib/validations.ts` se necessário
3. Atualize os tipos TypeScript
4. Teste localmente
5. Commit e push

## 📝 Próximos Passos

Consulte [TODO.md](./TODO.md) para o roadmap completo.

### Prioridade Alta

- [ ] Implementar integração com Shopify API
- [ ] Criar Supabase Edge Functions para automação
- [ ] Implementar criptografia de tokens (Supabase Vault)
- [ ] Adicionar webhooks do Shopify
- [ ] Criar testes unitários e E2E

### Prioridade Média

- [ ] Melhorar UX com loading states
- [ ] Adicionar filtros e paginação nas tabelas
- [ ] Implementar exportação de dados (CSV, Excel)
- [ ] Dashboard com gráficos (Chart.js ou Recharts)
- [ ] Notificações em tempo real

## 🌐 Deploy

### Deploy no Lovable (Recomendado para desenvolvimento)

1. Acesse [Lovable Project](https://lovable.dev/projects/a4164035-0e4a-4459-a71a-4f65856f3de1)
2. Clique em **Share → Publish**
3. Configure domínio customizado em **Project > Settings > Domains**

### Deploy em Produção (Vercel, Netlify, etc.)

```bash
# Build
npm run build

# O diretório dist/ contém os arquivos estáticos
```

**Importante**: Configure as variáveis de ambiente no painel do provedor de hosting.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e de uso interno.

## 🆘 Suporte

Para questões e suporte:
- Abra uma issue no GitHub
- Consulte a [documentação do Lovable](https://docs.lovable.dev)
- Consulte a [documentação do Supabase](https://supabase.com/docs)

## 🔗 Links Úteis

- [Lovable Project](https://lovable.dev/projects/a4164035-0e4a-4459-a71a-4f65856f3de1)
- [Supabase Dashboard](https://app.supabase.com)
- [Shopify API Docs](https://shopify.dev/docs/api)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Status do Projeto**: 🟡 Em Desenvolvimento

**Última Atualização**: 2025-11-13
