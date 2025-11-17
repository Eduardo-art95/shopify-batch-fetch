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
import { Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
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

  const validateShopUrl = (url: string): string => {
    // Remove https:// or http:// if present
    let cleanUrl = url.trim().toLowerCase();
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '');
    return cleanUrl;
  };

  const validateAccessToken = (token: string): boolean => {
    // Shopify access tokens start with 'shpat_' or 'shppa_' (for private apps)
    const trimmedToken = token.trim();
    return trimmedToken.length > 30 && (
      trimmedToken.startsWith('shpat_') ||
      trimmedToken.startsWith('shppa_') ||
      trimmedToken.startsWith('shpca_') // custom app token
    );
  };

  const testConnection = async () => {
    if (!config.shop_url || !config.access_token) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o URL da loja e o Access Token para testar a conexão",
        variant: "destructive"
      });
      return;
    }

    const cleanUrl = validateShopUrl(config.shop_url);

    if (!cleanUrl.includes('.myshopify.com')) {
      toast({
        title: "URL inválido",
        description: "O URL deve ser no formato: minhaloja.myshopify.com",
        variant: "destructive"
      });
      return;
    }

    if (!validateAccessToken(config.access_token)) {
      toast({
        title: "Token inválido",
        description: "O Access Token deve começar com 'shpat_', 'shppa_' ou 'shpca_' e ter pelo menos 30 caracteres",
        variant: "destructive"
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      // Test connection using Supabase Edge Function
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-shopify-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            shop_url: cleanUrl,
            access_token: config.access_token.trim(),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setConnectionStatus('success');
        setConnectionMessage(`Conectado à loja: ${result.shop.name} (${result.shop.plan_name})`);
        toast({
          title: "Conexão bem-sucedida!",
          description: `Conectado à loja ${result.shop.name}`,
        });
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.message || 'Erro desconhecido');
        toast({
          title: "Erro na conexão",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setConnectionStatus('error');
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setConnectionMessage('Edge Function não disponível. Deploy as funções no Supabase primeiro.');
        toast({
          title: "Edge Function não disponível",
          description: "Faça deploy das funções no Supabase Dashboard",
          variant: "destructive"
        });
      } else {
        setConnectionMessage(`Erro: ${error.message}`);
        toast({
          title: "Erro de conexão",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (config.shop_url && !validateShopUrl(config.shop_url).includes('.myshopify.com')) {
      toast({
        title: "URL inválido",
        description: "O URL deve ser no formato: minhaloja.myshopify.com",
        variant: "destructive"
      });
      return;
    }

    if (config.access_token && !validateAccessToken(config.access_token)) {
      toast({
        title: "Token inválido",
        description: "O Access Token deve começar com 'shpat_', 'shppa_' ou 'shpca_'",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const cleanShopUrl = config.shop_url ? validateShopUrl(config.shop_url) : '';

      const { error } = await supabase
        .from('shopify_config')
        .upsert({
          user_id: user!.id,
          shop_url: cleanShopUrl,
          access_token: config.access_token.trim(),
          trigger_order_count: config.trigger_order_count,
          is_active: config.is_active
        });

      if (error) throw error;

      setConfig(prev => ({ ...prev, shop_url: cleanShopUrl }));

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
          <AlertDescription className="space-y-2">
            <p className="font-medium">Como obter as credenciais do Shopify:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Aceda ao admin do Shopify → <strong>Settings</strong> → <strong>Apps and sales channels</strong></li>
              <li>Clique em <strong>Develop apps</strong> → <strong>Create an app</strong></li>
              <li>Dê um nome à app (ex: "Batch Fetch") e clique em <strong>Create app</strong></li>
              <li>Vá a <strong>Configuration</strong> → <strong>Admin API integration</strong> → <strong>Configure</strong></li>
              <li>Selecione as permissões: <strong>read_orders</strong> (obrigatório)</li>
              <li>Clique em <strong>Save</strong> e depois <strong>Install app</strong></li>
              <li>Copie o <strong>Admin API access token</strong> (começa com shpat_)</li>
            </ol>
            <p className="text-xs mt-2">
              <strong>Nota:</strong> O URL da sua loja é o domínio .myshopify.com (não o domínio personalizado)
            </p>
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
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={testingConnection || !config.shop_url || !config.access_token}
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A testar...
                    </>
                  ) : (
                    'Testar Conexão'
                  )}
                </Button>

                {connectionStatus === 'success' && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}

                {connectionStatus === 'error' && (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Erro
                  </Badge>
                )}
              </div>

              {connectionMessage && (
                <p className={`text-sm mt-2 ${
                  connectionStatus === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionMessage}
                </p>
              )}
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