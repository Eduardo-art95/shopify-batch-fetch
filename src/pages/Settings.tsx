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
    is_active: false,
    selected_fields: {
      customer_phone: false,
      billing_address: false,
      shipping_address: false,
      line_items: true,
      fulfillment_status: true,
      financial_status: true,
      tags: false,
      note: false,
      discount_codes: false,
      shipping_lines: false,
      tax_lines: false,
      subtotal_price: false,
      total_tax: false,
      total_discounts: false,
      tracking_number: false,
      tracking_company: false
    }
  });

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found');
        return;
      }

      // Call Edge Function to get config
      const { data, error } = await supabase.functions.invoke('get-config', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error loading config:', error);
        return;
      }

      if (data?.data) {
        setConfig({
          shop_url: data.data.shop_url || '',
          access_token: data.data.access_token || '',
          trigger_order_count: data.data.trigger_order_count || 10,
          is_active: data.data.is_active || false,
          selected_fields: data.data.selected_fields || {
            customer_phone: false,
            billing_address: false,
            shipping_address: false,
            line_items: true,
            fulfillment_status: true,
            financial_status: true,
            tags: false,
            note: false,
            discount_codes: false,
            shipping_lines: false,
            tax_lines: false,
            subtotal_price: false,
            total_tax: false,
            total_discounts: false,
            tracking_number: false,
            tracking_company: false
          }
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Call Edge Function to save config
      const { data, error } = await supabase.functions.invoke('save-config', {
        body: {
          shop_url: config.shop_url,
          access_token: config.access_token,
          trigger_order_count: config.trigger_order_count,
          is_active: config.is_active,
          selected_fields: config.selected_fields
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao guardar configurações');
      }

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
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // First save the config using Edge Function
      const { data: saveData, error: saveError } = await supabase.functions.invoke('save-config', {
        body: {
          shop_url: config.shop_url,
          access_token: config.access_token,
          trigger_order_count: config.trigger_order_count,
          is_active: config.is_active,
          selected_fields: config.selected_fields
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (saveError) throw saveError;

      if (!saveData.success) {
        throw new Error(saveData.error || 'Erro ao guardar configurações');
      }

      // Call the Edge Function to fetch orders
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
            <CardTitle>Campos a Extrair</CardTitle>
            <CardDescription>
              Selecione os campos adicionais das encomendas que pretende extrair do Shopify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informação do Cliente</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="customer_phone"
                    checked={config.selected_fields.customer_phone}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, customer_phone: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="customer_phone" className="cursor-pointer font-normal">
                    Telefone do cliente
                  </Label>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Endereços</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billing_address"
                    checked={config.selected_fields.billing_address}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, billing_address: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="billing_address" className="cursor-pointer font-normal">
                    Endereço de faturação
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="shipping_address"
                    checked={config.selected_fields.shipping_address}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, shipping_address: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="shipping_address" className="cursor-pointer font-normal">
                    Endereço de envio
                  </Label>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Detalhes da Encomenda</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="line_items"
                    checked={config.selected_fields.line_items}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, line_items: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="line_items" className="cursor-pointer font-normal">
                    Produtos da encomenda (line items)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="fulfillment_status"
                    checked={config.selected_fields.fulfillment_status}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, fulfillment_status: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="fulfillment_status" className="cursor-pointer font-normal">
                    Estado de fulfillment
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="financial_status"
                    checked={config.selected_fields.financial_status}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, financial_status: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="financial_status" className="cursor-pointer font-normal">
                    Estado financeiro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tags"
                    checked={config.selected_fields.tags}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, tags: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="tags" className="cursor-pointer font-normal">
                    Tags
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="note"
                    checked={config.selected_fields.note}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, note: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="note" className="cursor-pointer font-normal">
                    Notas da encomenda
                  </Label>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Informação Financeira</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="subtotal_price"
                    checked={config.selected_fields.subtotal_price}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, subtotal_price: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="subtotal_price" className="cursor-pointer font-normal">
                    Subtotal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="total_tax"
                    checked={config.selected_fields.total_tax}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, total_tax: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="total_tax" className="cursor-pointer font-normal">
                    Total de impostos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="total_discounts"
                    checked={config.selected_fields.total_discounts}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, total_discounts: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="total_discounts" className="cursor-pointer font-normal">
                    Total de descontos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="discount_codes"
                    checked={config.selected_fields.discount_codes}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, discount_codes: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="discount_codes" className="cursor-pointer font-normal">
                    Códigos de desconto utilizados
                  </Label>
                </div>
              </div>
            </div>

            {/* Shipping & Tracking */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Envio e Rastreio</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="shipping_lines"
                    checked={config.selected_fields.shipping_lines}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, shipping_lines: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="shipping_lines" className="cursor-pointer font-normal">
                    Informação de envio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tracking_number"
                    checked={config.selected_fields.tracking_number}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, tracking_number: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="tracking_number" className="cursor-pointer font-normal">
                    Número de rastreio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tracking_company"
                    checked={config.selected_fields.tracking_company}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, tracking_company: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="tracking_company" className="cursor-pointer font-normal">
                    Transportadora
                  </Label>
                </div>
              </div>
            </div>

            {/* Tax Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Impostos</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tax_lines"
                    checked={config.selected_fields.tax_lines}
                    onChange={(e) => setConfig({
                      ...config,
                      selected_fields: { ...config.selected_fields, tax_lines: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="tax_lines" className="cursor-pointer font-normal">
                    Detalhes de impostos
                  </Label>
                </div>
              </div>
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