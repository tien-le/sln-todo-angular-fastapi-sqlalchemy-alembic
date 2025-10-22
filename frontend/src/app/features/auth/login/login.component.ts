import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OAuth2Service } from '../../../core/services/oauth.service';
import { OAuth2Provider } from '../../../models/user.model';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private oauth2Service = inject(OAuth2Service);
  private router = inject(Router);

  loginForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  // OAuth providers
  oauthProviders = signal<OAuth2Provider[]>([]);
  oauthEnabled = signal(false);
  oauthLoading = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    // Load OAuth providers
    try {
      const providersResponse = await this.oauth2Service.getProvidersAsync();
      this.oauthEnabled.set(providersResponse.oauth2_enabled);
      this.oauthProviders.set(providersResponse.providers);
    } catch (error) {
      console.error('Failed to load OAuth providers:', error);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Login failed. Please try again.');
      }
    });
  }

  async loginWithOAuth(provider: string): Promise<void> {
    try {
      this.oauthLoading.set(true);
      this.error.set(null);
      await this.oauth2Service.loginWithProvider(provider);
    } catch (error: any) {
      this.error.set(error.message || `Failed to login with ${provider}`);
    } finally {
      this.oauthLoading.set(false);
    }
  }

  getProviderIcon(provider: string): string {
    return this.oauth2Service.getProviderIcon(provider);
  }

  getProviderColorClass(provider: string): string {
    return this.oauth2Service.getProviderColorClass(provider);
  }
}
