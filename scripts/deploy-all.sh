#!/bin/bash

echo "🚀 Deploy Completo - Shopify Batch Fetch"
echo "=========================================="
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado!"
    echo ""
    echo "Instala primeiro:"
    echo "  macOS:    brew install supabase/tap/supabase"
    echo "  Windows:  scoop install supabase"
    echo "  Linux:    brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar se está logado
echo "🔐 Verificando login..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Não está logado. A fazer login..."
    supabase login
fi

echo "✅ Login verificado"
echo ""

# Linkar ao projeto
echo "🔗 Linkando ao projeto..."
supabase link --project-ref hzdmqymvvhdesmcexdgl

if [ $? -ne 0 ]; then
    echo "❌ Erro ao linkar. Continuar mesmo assim? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Projeto linkado"
echo ""

# Aplicar migrations
echo "📦 Aplicando migrations..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Erro ao aplicar migrations!"
    echo "Verifica os erros acima."
    exit 1
fi

echo "✅ Migrations aplicadas"
echo ""

# Deploy Edge Functions
echo "🚀 Fazendo deploy das Edge Functions..."
echo ""

echo "  → save-config..."
supabase functions deploy save-config
if [ $? -eq 0 ]; then
    echo "  ✅ save-config deployed"
else
    echo "  ❌ Erro no deploy de save-config"
fi

echo ""
echo "  → get-config..."
supabase functions deploy get-config
if [ $? -eq 0 ]; then
    echo "  ✅ get-config deployed"
else
    echo "  ❌ Erro no deploy de get-config"
fi

echo ""
echo "  → fetch-shopify-orders..."
supabase functions deploy fetch-shopify-orders
if [ $? -eq 0 ]; then
    echo "  ✅ fetch-shopify-orders deployed"
else
    echo "  ❌ Erro no deploy de fetch-shopify-orders"
fi

echo ""
echo "=========================================="
echo "✅ Deploy completo!"
echo ""

# Listar functions
echo "📋 Functions disponíveis:"
supabase functions list

echo ""
echo "🎉 Tudo pronto!"
echo ""
echo "Próximos passos:"
echo "1. Acede: https://691c95b41f67638afc3dac64--shopify-batch-fetch.netlify.app/"
echo "2. Faz login"
echo "3. Vai a Configurações"
echo "4. Preenche dados do Shopify e testa!"
