import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { exchangeCodeForToken, validateOAuthState } from '@/services/shopify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const ShopifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('A processar autorização do Shopify...');

  useEffect(() => {
    const processCallback = async () => {
      if (!user) {
        setStatus('error');
        setMessage('Utilizador não autenticado. Por favor, faça login primeiro.');
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const shop = searchParams.get('shop');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for errors from Shopify
      if (error) {
        setStatus('error');
        setMessage(`Erro do Shopify: ${errorDescription || error}`);
        toast({
          title: 'Erro de autorização',
          description: errorDescription || error,
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code || !state || !shop) {
        setStatus('error');
        setMessage('Parâmetros em falta na resposta do Shopify.');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Validate state to prevent CSRF attacks
      const stateValidation = validateOAuthState(state);
      if (!stateValidation.valid) {
        setStatus('error');
        setMessage('Estado de segurança inválido. Por favor, tente novamente.');
        toast({
          title: 'Erro de segurança',
          description: 'O estado da autorização não corresponde. Tente conectar novamente.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Exchange code for token
      setMessage('A trocar código por token de acesso...');
      const result = await exchangeCodeForToken(code, shop, user.id);

      if (!result.success) {
        setStatus('error');
        setMessage(`Erro ao conectar: ${result.error}`);
        toast({
          title: 'Erro ao conectar',
          description: result.error || 'Falha ao obter token de acesso',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Success!
      setStatus('success');
      setMessage(`Loja ${result.shop} conectada com sucesso!`);
      toast({
        title: 'Loja conectada!',
        description: `A sua loja Shopify foi conectada com sucesso.`,
      });

      // Redirect to settings after a short delay
      setTimeout(() => navigate('/settings'), 2000);
    };

    processCallback();
  }, [user, searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                A conectar ao Shopify
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Conexão bem sucedida
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Erro na conexão
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{message}</p>
          {status !== 'loading' && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              A redirecionar automaticamente...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyCallback;
