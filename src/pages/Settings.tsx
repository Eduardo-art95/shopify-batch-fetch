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
import { Info, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [config, setConfig] = useState({
    shop_url: '',
    access_token: '',
    trigger_order_count: 10,
    is_active: false
  });

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

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
          is_active: data.is_active
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
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

  const testConnection = async () => {
    if (!config.shop_url || !config.access_token) {
      toast({
        title: "Dados em falta",
        description: "Por favor, preencha o URL da loja e o Access Token antes de testar",
        variant: "destructive"
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // First save the config
      const { error: saveError } = await supabase
        .from('shopify_config')
        .upsert({
          user_id: user!.id,
          shop_url: config.shop_url,
          access_token: config.access_token,
          trigger_order_count: config.trigger_order_count,
          is_active: config.is_active
        });

      if (saveError) throw saveError;

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-shopify-orders', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        toast({
          title: "Conexão bem-sucedida!",
          description: `Buscámos ${data.orders_fetched} encomendas da sua loja Shopify. ${data.orders_saved} foram guardadas.`
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      console.error('Connection test error:', error);
      toast({
        title: "Erro na conexão",
        description: error.message || 'Não foi possível conectar ao Shopify',
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

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
            Para conectar à sua loja Shopify, precisará criar uma aplicação privada no admin do Shopify
            e obter o URL da loja e o Access Token. Mais tarde poderá usar a integração nativa do Shopify.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Conexão Shopify</CardTitle>
            <CardDescription>
              Introduza os dados da sua loja Shopify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <Input
                id="access_token"
                type="password"
                placeholder="shpat_xxxxxxxxxxxxx"
                value={config.access_token}
                onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Obtenha este token no admin do Shopify em Apps {'>'} Develop apps
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={testConnection}
                disabled={testingConnection || !config.shop_url || !config.access_token}
                variant="outline"
                className="w-full"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    A testar conexão...
                  </>
                ) : connectionStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    Testar Conexão
                  </>
                ) : connectionStatus === 'error' ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    Testar Conexão
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testar Conexão e Buscar Encomendas
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Testa a conexão à API do Shopify e busca as encomendas mais recentes
              </p>
            </div>
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
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Ativar automação
              </Label>
            </div>
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