import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useShopify } from '@/hooks/useShopify';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getDateRange } from '@/lib/shopify-utils';

const Sync = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { syncOrders, syncing, loadConfig, getOrderCount } = useShopify();
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [shopifyOrderCount, setShopifyOrderCount] = useState<number | null>(null);
  const [syncDays, setSyncDays] = useState(30);

  useEffect(() => {
    if (user) {
      checkConfig();
      loadLastSync();
    }
  }, [user]);

  const checkConfig = async () => {
    const config = await loadConfig();
    setHasConfig(!!config && !!config.shop_url && !!config.access_token);

    // Load order count from Shopify
    if (config) {
      const count = await getOrderCount();
      setShopifyOrderCount(count);
    }
  };

  const loadLastSync = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('shopify_config')
        .select('last_sync')
        .eq('user_id', user.id)
        .single();

      if (data?.last_sync) {
        setLastSync(data.last_sync);
      }
    } catch (error) {
      // Ignore error
    }
  };

  const handleSync = async (days?: number) => {
    const options = days ? getDateRange(days) : {};

    const result = await syncOrders(
      days
        ? {
            limit: 250,
            created_at_min: options.start,
          }
        : { limit: 250 }
    );

    if (result.success) {
      loadLastSync();
      setShopifyOrderCount((prev) => (prev !== null ? prev + result.count : result.count));
    }
  };

  if (hasConfig === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasConfig) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sincronização</h1>
            <p className="text-muted-foreground mt-1">
              Sincronize encomendas manualmente do Shopify
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuração necessária</AlertTitle>
            <AlertDescription>
              Você precisa configurar a conexão com o Shopify antes de sincronizar encomendas.
            </AlertDescription>
          </Alert>

          <Button onClick={() => navigate('/settings')}>Ir para Configurações</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sincronização</h1>
          <p className="text-muted-foreground mt-1">
            Sincronize encomendas manualmente do Shopify
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Sincronização</CardTitle>
            <CardDescription>
              Informações sobre a última sincronização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Última sincronização:</span>
              </div>
              <span className="font-medium">
                {lastSync
                  ? new Date(lastSync).toLocaleString('pt-PT')
                  : 'Nunca sincronizado'}
              </span>
            </div>

            {shopifyOrderCount !== null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Encomendas disponíveis no Shopify:
                  </span>
                </div>
                <span className="font-medium">{shopifyOrderCount}</span>
              </div>
            )}

            {syncing && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Sincronizando encomendas... Aguarde.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Sync Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronizar Encomendas</CardTitle>
            <CardDescription>
              Escolha o período de sincronização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                onClick={() => handleSync()}
                disabled={syncing}
                size="lg"
                className="h-20 flex-col gap-2"
              >
                <RefreshCw className={syncing ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
                <div>
                  <div className="font-semibold">Sincronizar Tudo</div>
                  <div className="text-xs font-normal opacity-80">
                    Últimas 250 encomendas
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleSync(7)}
                disabled={syncing}
                size="lg"
                variant="outline"
                className="h-20 flex-col gap-2"
              >
                <RefreshCw className={syncing ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
                <div>
                  <div className="font-semibold">Últimos 7 Dias</div>
                  <div className="text-xs font-normal opacity-80">
                    Encomendas da última semana
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleSync(30)}
                disabled={syncing}
                size="lg"
                variant="outline"
                className="h-20 flex-col gap-2"
              >
                <RefreshCw className={syncing ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
                <div>
                  <div className="font-semibold">Últimos 30 Dias</div>
                  <div className="text-xs font-normal opacity-80">
                    Encomendas do último mês
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleSync(90)}
                disabled={syncing}
                size="lg"
                variant="outline"
                className="h-20 flex-col gap-2"
              >
                <RefreshCw className={syncing ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
                <div>
                  <div className="font-semibold">Últimos 90 Dias</div>
                  <div className="text-xs font-normal opacity-80">
                    Encomendas dos últimos 3 meses
                  </div>
                </div>
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Nota:</strong> A sincronização pode demorar alguns minutos dependendo do
                número de encomendas. As encomendas são salvas automaticamente no banco de dados.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Sync;
