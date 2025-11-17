import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  syncOrdersToDatabase,
  createClientFromConfig,
  verifyShopifyConnection,
} from "./service";
import { ShopifyOrder } from "./types";
import { supabase } from "@/integrations/supabase/client";

// Mock fetch for ShopifyClient
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock supabase functions invoke - use vi.hoisted for proper hoisting
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: mockInvoke,
    },
  },
}));

describe("Shopify Service", () => {
  const mockUserId = "user-123-456";

  const mockOrder: ShopifyOrder = {
    id: 123456789,
    name: "#1001",
    order_number: 1001,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T11:00:00Z",
    closed_at: null,
    cancelled_at: null,
    financial_status: "paid",
    fulfillment_status: null,
    total_price: "150.00",
    subtotal_price: "140.00",
    total_tax: "10.00",
    total_discounts: "0.00",
    currency: "EUR",
    customer: {
      id: 987654321,
      email: "customer@example.com",
      first_name: "Maria",
      last_name: "Silva",
      phone: "+351912345678",
    },
    billing_address: null,
    shipping_address: null,
    line_items: [],
    note: null,
    tags: "",
    email: "customer@example.com",
    phone: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockInvoke.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createClientFromConfig", () => {
    it("should create a ShopifyClient from config object", () => {
      const config = {
        shop_url: "test-store.myshopify.com",
        access_token: "shpat_test123",
      };

      const client = createClientFromConfig(config);

      expect(client.getShopUrl()).toBe("test-store.myshopify.com");
    });

    it("should handle shop URL without domain", () => {
      const config = {
        shop_url: "test-store",
        access_token: "shpat_test123",
      };

      const client = createClientFromConfig(config);

      expect(client.getShopUrl()).toBe("test-store.myshopify.com");
    });
  });

  describe("syncOrdersToDatabase", () => {
    it("should sync orders successfully", async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await syncOrdersToDatabase(mockUserId, [mockOrder]);

      expect(result.success).toBe(true);
      expect(result.ordersProcessed).toBe(1);
      expect(result.newOrders).toBe(1);

      expect(mockFrom).toHaveBeenCalledWith("orders");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          shopify_order_id: "123456789",
          order_number: "1001",
          customer_name: "Maria Silva",
          customer_email: "customer@example.com",
          total_price: 150.0,
          currency: "EUR",
          status: "paid",
        }),
        expect.objectContaining({
          onConflict: "user_id,shopify_order_id",
        })
      );
    });

    it("should handle orders without customer info", async () => {
      const orderWithoutCustomer = {
        ...mockOrder,
        customer: null,
        email: null,
      };

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await syncOrdersToDatabase(mockUserId, [orderWithoutCustomer]);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: "Unknown Customer",
          customer_email: null,
        }),
        expect.any(Object)
      );
    });

    it("should continue processing even if one order fails", async () => {
      const mockUpsert = vi
        .fn()
        .mockResolvedValueOnce({ error: { message: "Duplicate" } })
        .mockResolvedValueOnce({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await syncOrdersToDatabase(mockUserId, [
        mockOrder,
        { ...mockOrder, id: 999999999 },
      ]);

      expect(result.ordersProcessed).toBe(2);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle empty orders array", async () => {
      const result = await syncOrdersToDatabase(mockUserId, []);

      expect(result.success).toBe(true);
      expect(result.ordersProcessed).toBe(0);
      expect(result.newOrders).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      const mockUpsert = vi.fn().mockRejectedValue(new Error("Database connection lost"));
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await syncOrdersToDatabase(mockUserId, [mockOrder]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection lost");
    });
  });

  describe("verifyShopifyConnection", () => {
    it("should return valid when connection succeeds", async () => {
      // First call is for verifyConnection(), second for getOrdersCount()
      mockInvoke
        .mockResolvedValueOnce({
          data: { count: 25 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { count: 25 },
          error: null,
        });

      const result = await verifyShopifyConnection(
        "test-store.myshopify.com",
        "shpat_valid_token"
      );

      expect(result.valid).toBe(true);
      expect(result.orderCount).toBe(25);
    });

    it("should return invalid with error message on authentication failure", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          error: "Shopify API error",
          status: 401,
          details: { errors: "Invalid API key" },
        },
        error: null,
      });

      const result = await verifyShopifyConnection(
        "test-store.myshopify.com",
        "invalid_token"
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("should return invalid on network errors", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Network unreachable" },
      });

      const result = await verifyShopifyConnection(
        "test-store.myshopify.com",
        "shpat_token"
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Network unreachable");
    });
  });
});
