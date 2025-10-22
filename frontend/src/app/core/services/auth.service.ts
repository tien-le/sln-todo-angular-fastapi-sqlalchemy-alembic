import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User, UserCreate } from '../../models/user.model';
import { StorageService } from './storage.service';

/**
 * Authentication service for managing user authentication state.
 * Provides both Observable and Promise-based (async/await) methods.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  // Signals for reactive state management
  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => this.isAuthenticatedSignal());
  isLoading = this.isLoadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  constructor() {
    // Initialize auth state from storage
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const token = this.storage.getToken();
    const user = this.storage.getUser();

    if (token && user) {
      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);
    }
  }

  /**
   * Register a new user - Observable version
   */
  register(userData: UserCreate): Observable<User> {
    this.errorSignal.set(null);
    return this.http.post<User>(`${this.apiUrl}/register`, userData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Register a new user - Async version
   */
  async registerAsync(userData: UserCreate): Promise<User> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      const user = await firstValueFrom(this.register(userData));
      return user;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Login user - Observable version
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.errorSignal.set(null);
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => this.handleLoginSuccess(response)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Login user - Async version
   */
  async loginAsync(credentials: LoginRequest): Promise<LoginResponse> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      const response = await firstValueFrom(this.login(credentials));
      return response;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Handle successful login
   */
  private handleLoginSuccess(response: LoginResponse): void {
    this.storage.saveToken(response.access_token);
    this.storage.saveUser(response.user);
    this.currentUserSignal.set(response.user);
    this.isAuthenticatedSignal.set(true);
  }

  /**
   * Logout user
   */
  logout(): void {
    this.storage.clear();
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.errorSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Logout user - Async version
   */
  async logoutAsync(): Promise<void> {
    return Promise.resolve(this.logout());
  }

  /**
   * Get current user profile - Observable version
   */
  getMe(): Observable<User> {
    this.errorSignal.set(null);
    return this.http.get<User>(`${this.apiUrl}/me`)
      .pipe(
        tap(user => {
          this.storage.saveUser(user);
          this.currentUserSignal.set(user);
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get current user profile - Async version
   */
  async getMeAsync(): Promise<User> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      const user = await firstValueFrom(this.getMe());
      return user;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Refresh user data from server
   */
  async refreshUserData(): Promise<void> {
    if (this.isAuthenticatedSignal()) {
      try {
        await this.getMeAsync();
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        // Don't logout on refresh failure, just log the error
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticatedSignal();
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    return this.storage.getToken();
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      errorMessage = error.error?.detail || error.error?.message || error.message;

      // Handle 401 Unauthorized
      if (error.status === 401) {
        this.logout();
        errorMessage = 'Session expired. Please login again.';
      }
    }

    this.errorSignal.set(errorMessage);
    console.error('Auth Error:', errorMessage);
    return throwError(() => error);
  }
}
