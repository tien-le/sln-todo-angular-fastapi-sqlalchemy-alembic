import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OAuth2Service } from '../../../core/services/oauth.service';

/**
 * OAuth2 callback component.
 * Handles the callback from OAuth providers and completes the authentication flow.
 */
@Component({
  selector: 'app-oauth-callback',
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full space-y-8 p-8">
        <div class="text-center">
          @if (isProcessing()) {
            <div class="space-y-4">
              <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <h2 class="text-2xl font-bold text-gray-900">Processing Authentication...</h2>
              <p class="text-gray-600">Please wait while we complete your sign in.</p>
            </div>
          }

          @if (error()) {
            <div class="space-y-4">
              <div class="text-red-600 text-6xl">⚠️</div>
              <h2 class="text-2xl font-bold text-gray-900">Authentication Failed</h2>
              <p class="text-red-600">{{ error() }}</p>
              <button
                (click)="goToLogin()"
                class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Return to Login
              </button>
            </div>
          }

          @if (success()) {
            <div class="space-y-4">
              <div class="text-green-600 text-6xl">✓</div>
              <h2 class="text-2xl font-bold text-gray-900">Authentication Successful</h2>
              <p class="text-gray-600">Redirecting to dashboard...</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private oauth2Service = inject(OAuth2Service);
  private authService = inject(AuthService);

  isProcessing = signal(true);
  success = signal(false);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      // Get query parameters
      const queryParams = this.route.snapshot.queryParams;
      const code = queryParams['code'];
      const state = queryParams['state'];
      const errorParam = queryParams['error'];
      const errorDescription = queryParams['error_description'];

      // Check for OAuth provider in the route
      const provider = this.route.snapshot.paramMap.get('provider');

      if (!provider) {
        throw new Error('OAuth provider not specified');
      }

      // Check if OAuth provider returned an error
      if (errorParam) {
        throw new Error(errorDescription || `OAuth error: ${errorParam}`);
      }

      // Validate required parameters
      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      // Check if this is a link account flow or login flow
      const isLinkAccount = sessionStorage.getItem('oauth_link_account') === 'true';

      if (isLinkAccount) {
        // Link account flow
        sessionStorage.removeItem('oauth_link_account');
        await this.oauth2Service.linkAccountAsync(code, state, provider);
        this.success.set(true);

        // Redirect to profile or settings
        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 1500);
      } else {
        // Login flow
        const response = await this.oauth2Service.handleCallbackAsync(code, state, provider);
        this.success.set(true);

        // Redirect to dashboard
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1500);
      }
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      this.error.set(err.message || 'An unknown error occurred');
      this.success.set(false);
    } finally {
      this.isProcessing.set(false);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
