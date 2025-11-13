import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface Order {
  id: string;
  shopify_order_id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total_price: number;
  currency: string;
  status: string | null;
  shopify_created_at: string | null;
}

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('shopify_created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      logger.error('Error loading orders', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Encomendas</h1>
          <p className="text-muted-foreground mt-1">
            Lista de todas as encomendas extraídas do Shopify
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Encomendas</CardTitle>
            <CardDescription>
              Total: {orders.length} encomendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma encomenda encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Encomenda</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          #{order.order_number}
                        </TableCell>
                        <TableCell>{order.customer_name || '-'}</TableCell>
                        <TableCell>{order.customer_email || '-'}</TableCell>
                        <TableCell>
                          {order.total_price.toFixed(2)} {order.currency}
                        </TableCell>
                        <TableCell>
                          {order.status ? (
                            <Badge variant="secondary">{order.status}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {order.shopify_created_at
                            ? new Date(order.shopify_created_at).toLocaleDateString('pt-PT')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Orders;