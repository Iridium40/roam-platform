// Direct Supabase Auth API calls
import { BaseAPI, ApiResponse } from './BaseAPI';
import { AuthResponse, User, Session } from '@/types/api';
import { logger } from "../../utils/logger";

class AuthAPI extends BaseAPI {
  private accessToken: string | null = null;

  constructor() {
    super();
  }

  private getHeaders(useAuthToken = false): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      "Content-Type": "application/json",
    };

    if (useAuthToken && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    } else {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(
      `${this.baseURL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      logger.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Authentication failed: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    this.accessToken = data.access_token;
    return data;
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(
      `${this.baseURL}/auth/v1/signup`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      logger.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Registration failed: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    this.accessToken = data.access_token;
    return data;
  }

  async refreshSession(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch(
      `${this.baseURL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      },
    );

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (readError) {
      logger.warn("Could not read response text:", readError);
      responseText = `HTTP ${response.status} - ${response.statusText}`;
    }

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    this.accessToken = data.access_token;
    return data;
  }

  async signOut(): Promise<void> {
    if (!this.accessToken) {
      return;
    }

    try {
      await fetch(`${this.baseURL}/auth/v1/logout`, {
        method: "POST",
        headers: this.getHeaders(true),
        body: JSON.stringify({
          scope: "global",
        }),
      });
    } catch (error) {
      logger.error("Error during sign out:", error);
    } finally {
      this.accessToken = null;
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

export const authAPI = new AuthAPI();
