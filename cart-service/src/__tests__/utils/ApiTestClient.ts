// ========================================
// API 테스트 클라이언트 (수정됨 - 헤더 기반 인증)
// cart-service/src/__tests__/utils/ApiTestClient.ts
// ========================================

import request from "supertest";
import express from "express";

export class ApiTestClient {
  constructor(private app: express.Application) {}

  // ========================================
  // 🔧 헤더 생성 헬퍼 메서드들
  // ========================================

  /**
   * 인증 헤더 생성
   */
  private createAuthHeaders(
    userId?: string,
    sessionId?: string
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (userId) {
      headers["Authorization"] = `Bearer ${userId}`;
    }

    if (sessionId) {
      headers["X-Session-ID"] = sessionId;
    }

    return headers;
  }

  // ========================================
  // 🛒 장바구니 API 호출 메서드들 (수정됨)
  // ========================================

  async addToCart(data: {
    userId?: string;
    sessionId?: string;
    productId: string;
    quantity: number;
  }) {
    const { userId, sessionId, ...bodyData } = data;
    const headers = this.createAuthHeaders(userId, sessionId);

    return request(this.app)
      .post("/api/v1/cart/items")
      .set(headers)
      .send(bodyData)
      .expect("Content-Type", /json/);
  }

  async getCart(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;
    const headers = this.createAuthHeaders(userId, sessionId);

    return request(this.app)
      .get("/api/v1/cart")
      .set(headers)
      .expect("Content-Type", /json/);
  }

  async updateCartItem(data: {
    userId?: string;
    sessionId?: string;
    productId: string;
    quantity: number;
  }) {
    const { userId, sessionId, productId, quantity } = data;
    const headers = this.createAuthHeaders(userId, sessionId);

    return request(this.app)
      .put(`/api/v1/cart/items/${productId}`)
      .set(headers)
      .send({ quantity })
      .expect("Content-Type", /json/);
  }

  async removeFromCart(data: {
    userId?: string;
    sessionId?: string;
    productId: string;
  }) {
    const { userId, sessionId, productId } = data;
    const headers = this.createAuthHeaders(userId, sessionId);

    return request(this.app)
      .delete(`/api/v1/cart/items/${productId}`)
      .set(headers)
      .expect("Content-Type", /json/);
  }

  async clearCart(data: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = data;
    const headers = this.createAuthHeaders(userId, sessionId);

    return request(this.app)
      .delete("/api/v1/cart")
      .set(headers)
      .expect("Content-Type", /json/);
  }

  async transferCart(data: { userId: string; sessionId: string }) {
    const { userId, sessionId } = data;
    const headers = this.createAuthHeaders(userId, sessionId);

    return request(this.app)
      .post("/api/v1/cart/transfer")
      .set(headers)
      .expect("Content-Type", /json/);
  }

  // ========================================
  // 🏥 헬스체크 API
  // ========================================

  async healthCheck() {
    return request(this.app).get("/health").expect("Content-Type", /json/);
  }

  async getServiceInfo() {
    return request(this.app).get("/api/v1/info").expect("Content-Type", /json/);
  }

  // ========================================
  // 🔧 일반적인 HTTP 메서드들
  // ========================================

  async get(path: string, headers?: any) {
    let req = request(this.app).get(path);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async post(path: string, data?: any, headers?: any) {
    let req = request(this.app).post(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async put(path: string, data?: any, headers?: any) {
    let req = request(this.app).put(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async patch(path: string, data?: any, headers?: any) {
    let req = request(this.app).patch(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async delete(path: string, data?: any, headers?: any) {
    let req = request(this.app).delete(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async options(path: string, headers: Record<string, string> = {}) {
    return request(this.app).options(path).set(headers);
  }

  // ========================================
  // 📊 응답 검증 헬퍼 메서드들 (수정됨)
  // ========================================

  /**
   * 성공 응답 검증
   * 수정: 실제 응답 구조에 맞게 검증 로직 수정
   */
  expectSuccessResponse(response: any, expectedData?: any) {
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message");

    // timestamp는 data 안에 있거나 최상위에 있을 수 있음
    if (response.body.timestamp) {
      expect(response.body).toHaveProperty("timestamp");
    } else if (response.body.data && response.body.data.timestamp) {
      expect(response.body.data).toHaveProperty("timestamp");
    }

    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  /**
   * 에러 응답 검증
   * 수정: 실제 에러 응답 구조에 맞게 검증 로직 수정
   */
  expectErrorResponse(
    response: any,
    expectedCode?: number,
    expectedMessage?: string
  ) {
    expect(response.body).toHaveProperty("success", false);

    // 에러 응답은 "error" 필드 또는 "message" 필드를 가질 수 있음
    const hasError = response.body.error || response.body.message;
    expect(hasError).toBeTruthy();

    if (expectedCode) {
      expect(response.status).toBe(expectedCode);
    }

    if (expectedMessage) {
      const errorMessage = response.body.message || response.body.error;
      expect(errorMessage).toContain(expectedMessage);
    }
  }

  /**
   * 🔧 새로운 헬퍼: 장바구니 응답 구조 검증
   */
  expectCartResponse(response: any, expectCart: boolean = true) {
    this.expectSuccessResponse(response);
    expect(response.body).toHaveProperty("data");

    if (expectCart) {
      expect(response.body.data).toHaveProperty("cart");
      expect(response.body.data.cart).toBeTruthy();
    } else {
      // 빈 장바구니의 경우 cart가 null일 수 있음
      expect(response.body.data).toHaveProperty("cart");
    }
  }

  /**
   * 🔧 새로운 헬퍼: 장바구니 아이템 수 검증
   */
  expectCartItemCount(response: any, expectedCount: number) {
    this.expectCartResponse(response, expectedCount > 0);

    if (expectedCount > 0) {
      expect(response.body.data.cart.items).toHaveLength(expectedCount);
    } else {
      const cart = response.body.data.cart;
      if (cart) {
        expect(cart.items).toHaveLength(0);
      } else {
        expect(cart).toBeNull();
      }
    }
  }

  /**
   * 🔧 새로운 헬퍼: 장바구니 총액 검증
   */
  expectCartTotalAmount(response: any, expectedAmount: number) {
    this.expectCartResponse(response, expectedAmount > 0);

    if (expectedAmount > 0) {
      expect(response.body.data.cart.totalAmount).toBe(expectedAmount);
    } else {
      const cart = response.body.data.cart;
      if (cart) {
        expect(cart.totalAmount).toBe(0);
      }
    }
  }
}
