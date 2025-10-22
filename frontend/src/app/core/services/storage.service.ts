import { Injectable } from '@angular/core';
import { User } from '../../models/user.model';

/**
 * Service for managing localStorage operations
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'current_user';
  private readonly OAUTH_STATE_KEY = 'oauth_state';

  /**
   * Save access token to localStorage
   */
  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Get access token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Remove access token from localStorage
   */
  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Save user data to localStorage
   */
  saveUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Get user data from localStorage
   */
  getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Remove user data from localStorage
   */
  removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.OAUTH_STATE_KEY);
  }

  /**
   * Save OAuth state to sessionStorage (for CSRF protection)
   */
  saveOAuthState(state: string): void {
    sessionStorage.setItem(this.OAUTH_STATE_KEY, state);
  }

  /**
   * Get OAuth state from sessionStorage
   */
  getOAuthState(): string | null {
    return sessionStorage.getItem(this.OAUTH_STATE_KEY);
  }

  /**
   * Clear OAuth state from sessionStorage
   */
  clearOAuthState(): void {
    sessionStorage.removeItem(this.OAUTH_STATE_KEY);
  }
}
