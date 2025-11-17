import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle, XCircle, RefreshCw, Link as LinkIcon, Unlink } from 'lucide-react';
import { generateAuthUrl, generateState, storeOAuthState, fetchOrders, getShopInfo } from '@/services/shopify';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [config, setConfig] = useState({
    shop_url: '',
    access_token: '',
    trigger_order_count: 10,
    is_active: false,
    last_sync: null as string | null
  });

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  useEffect(() => {
    if (config.access_token && config.shop_url) {
      loadShopInfo();
    }
  }, [config.access_token, config.shop_url]);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('shopify_config')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (data) {
        setConfig({
          shop_url: data.shop_url || '',
          access_token: data.access_token || '',
          trigger_order_count: data.trigger_order_count,
          is_active: data.is_active,
          last_sync: data.last_sync
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadShopInfo = async () => {
    try {
      const result = await getShopInfo();
      if (result.success && result.data) {
        setShopInfo(result.data);
      }
    } catch (error) {
      console.error('Error loading shop info:', error);
    }
  };

  const handleConnectShopify = () => {
    if (!config.shop_url) {
      toast({
        title: "URL em falta",
        description: "Por favor, introduza o URL da sua loja Shopify primeiro",
        variant: "destructive"
      });
      return;
    }

    setConnecting(true);

    // Generate state for CSRF protection
    const state = generateState();
    storeOAuthState(state, config.shop_url);

    // Generate and redirect to OAuth URL
    const authUrl = generateAuthUrl(config.shop_url, state);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shopify_config')
        .update({
          access_token: '',
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      setConfig(prev => ({
        ...prev,
        access_token: '',
        is_active: false
      }));
      setShopInfo(null);

      toast({
        title: "Desconectado",
        description: "A sua loja Shopify foi desconectada"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    setSyncing(true);
    try {
      const result = await fetchOrders({ limit: 50 });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao sincronizar pedidos');
      }

      const ordersCount = result.data?.length || 0;

      toast({
        title: "Sincronização concluída",
        description: `${ordersCount} pedidos foram sincronizados com sucesso`
      });

      // Reload config to update last_sync
      await loadConfig();
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('shopify_config')
        .upsert({
          user_id: user!.id,
          shop_url: config.shop_url,
          access_token: config.access_token,
          trigger_order_count: config.trigger_order_count,
          is_active: config.is_active
        });

      if (error) throw error;

      toast({
        title: "Configurações guardadas",
        description: "As suas configurações foram atualizadas com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao guardar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = Boolean(config.access_token && config.shop_url);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Configure a conexão com o Shopify e as regras de automação
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Conecte a sua loja Shopify usando OAuth para autorizar o acesso seguro aos seus pedidos.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Conexão Shopify</span>
              {isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não conectado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isConnected
                ? `Conectado a ${config.shop_url}`
                : 'Introduza o URL da sua loja e clique em conectar'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="shop_url">URL da Loja</Label>
                  <Input
                    id="shop_url"
                    placeholder="minhaloja.myshopify.com"
                    value={config.shop_url}
                    onChange={(e) => setConfig({ ...config, shop_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemplo: minhaloja.myshopify.com
                  </p>
                </div>

                <Button
                  onClick={handleConnectShopify}
                  disabled={connecting || !config.shop_url}
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {connecting ? 'A redirecionar...' : 'Conectar ao Shopify'}
                </Button>
              </>
            ) : (
              <>
                {shopInfo && (
                  <div className="bg-muted p-4 rounded-md space-y-2">
                    <p><strong>Loja:</strong> {shopInfo.name}</p>
                    <p><strong>Email:</strong> {shopInfo.email}</p>
                    <p><strong>Domínio:</strong> {shopInfo.myshopify_domain}</p>
                    <p><strong>Plano:</strong> {shopInfo.plan_name}</p>
                    <p><strong>Moeda:</strong> {shopInfo.currency}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSyncOrders}
                    disabled={syncing}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'A sincronizar...' : 'Sincronizar Pedidos'}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={loading}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </div>

                {config.last_sync && (
                  <p className="text-xs text-muted-foreground">
                    Última sincronização: {new Date(config.last_sync).toLocaleString('pt-PT')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regras de Automação</CardTitle>
            <CardDescription>
              Configure quando a automação deve extrair encomendas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trigger_count">Número de Encomendas (Trigger)</Label>
              <Input
                id="trigger_count"
                type="number"
                min="1"
                value={config.trigger_order_count}
                onChange={(e) => setConfig({ ...config, trigger_order_count: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-muted-foreground">
                A automação será executada quando este número de novas encomendas for atingido
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-input"
                disabled={!isConnected}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Ativar automação
              </Label>
            </div>

            {!isConnected && (
              <p className="text-xs text-amber-600">
                Conecte primeiro a sua loja Shopify para ativar a automação
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'A guardar...' : 'Guardar Configurações'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
