import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ShopifyClient, createShopifyClient } from "./client";
import { ShopifyOrder, ShopifyOrdersResponse, ShopifyCountResponse } from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ShopifyClient", () => {
  let client: ShopifyClient;

  const mockConfig = {
    shopUrl: "test-store.myshopify.com",
    accessToken: "test-access-token-123",
    apiVersion: "2024-01",
  };

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
      first_name: "John",
      last_name: "Doe",
      phone: "+351912345678",
    },
    billing_address: {
      first_name: "John",
      last_name: "Doe",
      address1: "Rua Principal 123",
      address2: null,
      city: "Lisboa",
      province: "Lisboa",
      country: "Portugal",
      zip: "1000-001",
      phone: "+351912345678",
      company: null,
    },
    shipping_address: {
      first_name: "John",
      last_name: "Doe",
      address1: "Rua Principal 123",
      address2: null,
      city: "Lisboa",
      province: "Lisboa",
      country: "Portugal",
      zip: "1000-001",
      phone: "+351912345678",
      company: null,
    },
    line_items: [
      {
        id: 111222333,
        title: "Test Product",
        quantity: 2,
        price: "70.00",
        sku: "TEST-001",
        variant_title: "Medium / Blue",
        product_id: 444555666,
        variant_id: 777888999,
      },
    ],
    note: "Please deliver in the morning",
    tags: "priority, new-customer",
    email: "customer@example.com",
    phone: "+351912345678",
  };

  beforeEach(() => {
    client = new ShopifyClient(mockConfig);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor and URL normalization", () => {
    it("should normalize shop URL with protocol", () => {
      const clientWithProtocol = new ShopifyClient({
        ...mockConfig,
        shopUrl: "https://test-store.myshopify.com",
      });
      expect(clientWithProtocol.getShopUrl()).toBe("test-store.myshopify.com");
    });

    it("should add .myshopify.com if no domain provided", () => {
      const clientWithoutDomain = new ShopifyClient({
        ...mockConfig,
        shopUrl: "test-store",
      });
      expect(clientWithoutDomain.getShopUrl()).toBe("test-store.myshopify.com");
    });

    it("should remove trailing slashes", () => {
      const clientWithSlash = new ShopifyClient({
        ...mockConfig,
        shopUrl: "test-store.myshopify.com///",
      });
      expect(clientWithSlash.getShopUrl()).toBe("test-store.myshopify.com");
    });

    it("should use default API version if not provided", () => {
      const clientNoVersion = createShopifyClient({
        shopUrl: "test-store",
        accessToken: "token",
      });
      expect(clientNoVersion.getApiVersion()).toBeDefined();
    });

    it("should use provided API version", () => {
      expect(client.getApiVersion()).toBe("2024-01");
    });
  });

  describe("getOrdersCount", () => {
    it("should fetch orders count successfully", async () => {
      const mockResponse: ShopifyCountResponse = { count: 42 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const count = await client.getOrdersCount();

      expect(count).toBe(42);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-store.myshopify.com/admin/api/2024-01/orders/count.json",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Shopify-Access-Token": "test-access-token-123",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should add query parameters for filtering", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 10 }),
      });

      await client.getOrdersCount({
        status: "open",
        financial_status: "paid",
        created_at_min: "2024-01-01T00:00:00Z",
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("status=open");
      expect(calledUrl).toContain("financial_status=paid");
      expect(calledUrl).toContain("created_at_min=2024-01-01T00%3A00%3A00Z");
    });
  });

  describe("getOrders", () => {
    it("should fetch orders successfully", async () => {
      const mockResponse: ShopifyOrdersResponse = { orders: [mockOrder] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const orders = await client.getOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe(123456789);
      expect(orders[0].name).toBe("#1001");
      expect(orders[0].customer?.email).toBe("customer@example.com");
    });

    it("should use default limit of 50", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [] }),
      });

      await client.getOrders();

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("limit=50");
    });

    it("should add since_id for pagination", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [] }),
      });

      await client.getOrders({ since_id: 100000, limit: 100 });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain("since_id=100000");
      expect(calledUrl).toContain("limit=100");
    });

    it("should handle API errors with JSON error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            errors: "Invalid API key or access token",
          }),
      });

      await expect(client.getOrders()).rejects.toThrow(
        "Invalid API key or access token"
      );
    });

    it("should handle API errors with object error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: () =>
          Promise.resolve({
            errors: {
              order: ["is invalid"],
              limit: ["must be less than 250"],
            },
          }),
      });

      await expect(client.getOrders()).rejects.toThrow(
        "order: is invalid; limit: must be less than 250"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getOrders()).rejects.toThrow("Network error");
    });
  });

  describe("fetchAllOrders (batch fetch)", () => {
    it("should fetch all orders in batches", async () => {
      const mockOrder2 = { ...mockOrder, id: 123456790, name: "#1002" };

      // First batch returns 1 order (less than limit, so no more pages)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [mockOrder, mockOrder2] }),
      });

      const result = await client.fetchAllOrders({ limit: 250 });

      expect(result.success).toBe(true);
      expect(result.totalFetched).toBe(2);
      expect(result.orders).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it("should handle pagination when more orders exist", async () => {
      // Simulate 2 pages of results
      const ordersPage1 = Array(250)
        .fill(null)
        .map((_, i) => ({ ...mockOrder, id: i + 1 }));
      const ordersPage2 = [{ ...mockOrder, id: 251 }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ orders: ordersPage1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ orders: ordersPage2 }),
        });

      const result = await client.fetchAllOrders({ limit: 250 });

      expect(result.success).toBe(true);
      expect(result.totalFetched).toBe(251);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return partial results on error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ orders: [mockOrder] }),
        })
        .mockRejectedValueOnce(new Error("Connection timeout"));

      const result = await client.fetchAllOrders({ limit: 1 });

      expect(result.success).toBe(false);
      expect(result.totalFetched).toBe(1);
      expect(result.hasMore).toBe(true);
      expect(result.error).toBe("Connection timeout");
    });
  });

  describe("verifyConnection", () => {
    it("should return valid when connection succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      });

      const result = await client.verifyConnection();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid with error message on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () => Promise.resolve({ errors: "Access denied" }),
      });

      const result = await client.verifyConnection();

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Access denied");
    });
  });

  describe("createShopifyClient factory", () => {
    it("should create a valid ShopifyClient instance", () => {
      const client = createShopifyClient(mockConfig);
      expect(client).toBeInstanceOf(ShopifyClient);
      expect(client.getShopUrl()).toBe("test-store.myshopify.com");
    });
  });
});
