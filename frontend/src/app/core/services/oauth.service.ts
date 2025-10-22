import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    LoginResponse,
    OAuth2AuthorizationRequest,
    OAuth2AuthorizationResponse,
    OAuth2CallbackRequest,
    OAuth2LinkAccountRequest,
    OAuth2ProvidersResponse,
    OAuth2UnlinkAccountRequest,
    User
} from '../../models/user.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

/**
 * OAuth2 service for handling OAuth2 authentication flows.
 * Provides methods for initiating OAuth flows, handling callbacks, and managing OAuth providers.
 */
@Injectable({
  providedIn: 'root'
})
export class OAuth2Service {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private router = inject(Router);
  private authService = inject(AuthService);

  private readonly apiUrl = `${environment.apiBaseUrl}/oauth`;

  // Signals for OAuth state management
  private providersSignal = signal<OAuth2ProvidersResponse | null>(null);
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  providers = this.providersSignal.asReadonly();
  isLoading = this.isLoadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  /**
   * Get available OAuth2 providers - Observable version
   */
  getProviders(): Observable<OAuth2ProvidersResponse> {
    return this.http.get<OAuth2ProvidersResponse>(`${this.apiUrl}/providers`);
  }

  /**
   * Get available OAuth2 providers - Async version
   */
  async getProvidersAsync(): Promise<OAuth2ProvidersResponse> {
    this.isLoadingSignal.set(true);
    try {
      const providers = await firstValueFrom(this.getProviders());
      this.providersSignal.set(providers);
      return providers;
    } catch (error) {
      this.handleError('Failed to load OAuth providers', error);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Initiate OAuth2 authorization flow - Observable version
   */
  authorize(request: OAuth2AuthorizationRequest): Observable<OAuth2AuthorizationResponse> {
    return this.http.post<OAuth2AuthorizationResponse>(`${this.apiUrl}/authorize`, request);
  }

  /**
   * Initiate OAuth2 authorization flow - Async version
   */
  async authorizeAsync(provider: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.authorize({ provider })
      );

      // Store state in session storage for verification
      this.storage.saveOAuthState(response.state);

      // Redirect to OAuth provider
      window.location.href = response.authorization_url;
    } catch (error) {
      this.handleError(`Failed to initiate ${provider} login`, error);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Handle OAuth2 callback - Observable version
   */
  handleCallback(request: OAuth2CallbackRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/callback`, request);
  }

  /**
   * Handle OAuth2 callback - Async version
   */
  async handleCallbackAsync(code: string, state: string, provider: string): Promise<LoginResponse> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Verify state matches stored state
      const storedState = this.storage.getOAuthState();
      if (storedState !== state) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Clear stored state
      this.storage.clearOAuthState();

      // Exchange code for token
      const response = await firstValueFrom(
        this.handleCallback({ code, state, provider })
      );

      // Store token and user info
      this.storage.saveToken(response.access_token);
      this.storage.saveUser(response.user);

      return response;
    } catch (error) {
      this.handleError(`OAuth callback failed for ${provider}`, error);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Link OAuth2 account to current user - Observable version
   */
  linkAccount(request: OAuth2LinkAccountRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/link`, request);
  }

  /**
   * Link OAuth2 account to current user - Async version
   */
  async linkAccountAsync(code: string, state: string, provider: string): Promise<User> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Verify state matches stored state
      const storedState = this.storage.getOAuthState();
      if (storedState !== state) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Clear stored state
      this.storage.clearOAuthState();

      // Link account
      const user = await firstValueFrom(
        this.linkAccount({ code, state, provider })
      );

      // Update stored user
      this.storage.saveUser(user);

      return user;
    } catch (error) {
      this.handleError(`Failed to link ${provider} account`, error);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Unlink OAuth2 account - Observable version
   */
  unlinkAccount(request: OAuth2UnlinkAccountRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/unlink`, request);
  }

  /**
   * Unlink OAuth2 account - Async version
   */
  async unlinkAccountAsync(provider: string): Promise<User> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const user = await firstValueFrom(
        this.unlinkAccount({ provider })
      );

      // Update stored user
      this.storage.saveUser(user);

      return user;
    } catch (error) {
      this.handleError(`Failed to unlink ${provider} account`, error);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Initiate OAuth2 login for a provider
   */
  async loginWithProvider(provider: string): Promise<void> {
    await this.authorizeAsync(provider);
  }

  /**
   * Get OAuth provider icon class
   */
  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      google: 'fab fa-google',
      github: 'fab fa-github',
      microsoft: 'fab fa-microsoft'
    };
    return icons[provider] || 'fas fa-sign-in-alt';
  }

  /**
   * Get OAuth provider color class
   */
  getProviderColorClass(provider: string): string {
    const colors: Record<string, string> = {
      google: 'bg-red-600 hover:bg-red-700',
      github: 'bg-gray-800 hover:bg-gray-900',
      microsoft: 'bg-blue-600 hover:bg-blue-700'
    };
    return colors[provider] || 'bg-gray-600 hover:bg-gray-700';
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Handle errors
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);

    let errorMessage = message;
    if (error?.error?.detail) {
      errorMessage = `${message}: ${error.error.detail}`;
    } else if (error?.message) {
      errorMessage = `${message}: ${error.message}`;
    }

    this.errorSignal.set(errorMessage);
  }
}
