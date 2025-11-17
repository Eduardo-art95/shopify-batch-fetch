import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, Activity, Settings as SettingsIcon, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalOrders: 0,
    recentLogs: 0,
    isConfigured: false,
    lastSync: null as string | null
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const [ordersResult, logsResult, configResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('automation_logs').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('shopify_config').select('*').eq('user_id', user!.id).single()
      ]);

      setStats({
        totalOrders: ordersResult.count || 0,
        recentLogs: logsResult.count || 0,
        isConfigured: !!configResult.data?.shop_url,
        lastSync: configResult.data?.last_sync || null
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async () => {
    if (!stats.isConfigured) {
      toast({
        title: "Configuração necessária",
        description: "Configure a conexão Shopify primeiro nas Configurações",
        variant: "destructive"
      });
      return;
    }

    setSyncing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-shopify-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Sincronização concluída!",
          description: result.message,
        });
        // Reload stats to show updated numbers
        await loadStats();
      } else {
        toast({
          title: "Erro na sincronização",
          description: result.message || 'Erro desconhecido',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        toast({
          title: "Edge Function não disponível",
          description: "Faça deploy das funções no Supabase Dashboard",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro na sincronização",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral da automação de encomendas Shopify
            </p>
          </div>
          {stats.isConfigured && (
            <Button
              onClick={syncOrders}
              disabled={syncing}
              className="gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A sincronizar...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Encomendas
                </>
              )}
            </Button>
          )}
        </div>

        {!stats.isConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuração Necessária</AlertTitle>
            <AlertDescription>
              Configure a conexão com o Shopify para começar a extrair encomendas automaticamente.
              <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => navigate('/settings')}>
                Ir para Configurações
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Encomendas
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Encomendas extraídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Execuções de Automação
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentLogs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de execuções
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Estado da Configuração
              </CardTitle>
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.isConfigured ? '✓' : '✗'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.isConfigured ? 'Shopify conectado' : 'Não configurado'}
              </p>
            </CardContent>
          </Card>
        </div>

        {stats.lastSync && (
          <Card>
            <CardHeader>
              <CardTitle>Última Sincronização</CardTitle>
              <CardDescription>
                Última vez que as encomendas foram verificadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {new Date(stats.lastSync).toLocaleString('pt-PT')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;