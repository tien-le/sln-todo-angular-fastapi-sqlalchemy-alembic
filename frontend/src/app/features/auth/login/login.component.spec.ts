import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoginResponse } from '../../../models/user.model';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockLoginResponse: LoginResponse = {
    access_token: 'test-token',
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id: '123',
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      is_superuser: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as any); // Return empty object for RouterLink
    routerSpy.serializeUrl.and.returnValue(''); // Return empty string for RouterLink

    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: { params: {} }
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize login form with empty values', () => {
      expect(component.loginForm.value).toEqual({
        email: '',
        password: ''
      });
    });

    it('should have invalid form initially', () => {
      expect(component.loginForm.invalid).toBe(true);
    });
  });

  describe('form validation', () => {
    it('should require email field', () => {
      const emailControl = component.loginForm.get('email');

      emailControl?.setValue('');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.hasError('required')).toBe(true);

      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.loginForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should require password field', () => {
      const passwordControl = component.loginForm.get('password');

      passwordControl?.setValue('');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.hasError('required')).toBe(true);

      passwordControl?.setValue('password123');
      expect(passwordControl?.valid).toBe(true);
    });

    it('should have valid form when all fields are filled correctly', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(component.loginForm.valid).toBe(true);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should call authService.login with form values', () => {
      authService.login.and.returnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should navigate to tasks page on successful login', () => {
      authService.login.and.returnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
      expect(component.loading()).toBe(false);
    });

    it('should not submit when form is invalid', () => {
      component.loginForm.patchValue({
        email: '',
        password: ''
      });

      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should set loading state during login', () => {
      authService.login.and.returnValue(of(mockLoginResponse));

      expect(component.loading()).toBe(false);
      component.onSubmit();

      // After successful login, loading should be false
      expect(component.loading()).toBe(false);
    });

    it('should handle login error', () => {
      const errorMessage = 'Invalid credentials';
      authService.login.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.onSubmit();

      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle generic error when no message provided', () => {
      authService.login.and.returnValue(
        throwError(() => new Error())
      );

      component.onSubmit();

      expect(component.error()).toBe('Login failed. Please try again.');
      expect(component.loading()).toBe(false);
    });

    it('should clear previous error on new submission', () => {
      component.error.set('Previous error');
      authService.login.and.returnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(component.error()).toBeNull();
    });
  });

  describe('template rendering', () => {
    it('should display login form', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#email');
      const passwordInput = compiled.querySelector('#password');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });

    it('should display "Sign in to your account" heading', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h2');

      expect(heading?.textContent).toContain('Sign in to your account');
    });

    it('should display link to register page', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const registerLink = compiled.querySelector('a[routerLink="/auth/register"]');

      expect(registerLink).toBeTruthy();
      expect(registerLink?.textContent).toContain('create a new account');
    });

    it('should display error message when error exists', () => {
      component.error.set('Login failed');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorDiv = compiled.querySelector('.bg-red-50');

      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.textContent).toContain('Login failed');
    });

    it('should not display error message when error is null', () => {
      component.error.set(null);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorDiv = compiled.querySelector('.bg-red-50');

      expect(errorDiv).toBeFalsy();
    });

    it('should display email validation error when touched and invalid', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessage = compiled.querySelector('.text-red-600');

      expect(errorMessage?.textContent).toContain('Please enter a valid email address');
    });

    it('should display password validation error when touched and empty', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('');
      passwordControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessages = Array.from(compiled.querySelectorAll('.text-red-600'));
      const passwordError = errorMessages.find(el => el.textContent?.includes('Password is required'));

      expect(passwordError).toBeTruthy();
    });

    it('should disable submit button when form is invalid', () => {
      component.loginForm.patchValue({
        email: '',
        password: ''
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });

    it('should disable submit button when loading', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });

    it('should enable submit button when form is valid and not loading', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      component.loading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(false);
    });

    it('should show "Sign in" text when not loading', () => {
      component.loading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');

      expect(submitButton?.textContent).toContain('Sign in');
    });

    it('should show "Signing in..." text when loading', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');

      expect(submitButton?.textContent).toContain('Signing in...');
    });

    it('should show loading spinner when loading', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const spinner = compiled.querySelector('.animate-spin');

      expect(spinner).toBeTruthy();
    });
  });

  describe('form interaction', () => {
    it('should update form value when user types in email', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#email') as HTMLInputElement;

      emailInput.value = 'user@example.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.loginForm.get('email')?.value).toBe('user@example.com');
    });

    it('should update form value when user types in password', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const passwordInput = compiled.querySelector('#password') as HTMLInputElement;

      passwordInput.value = 'mypassword';
      passwordInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.loginForm.get('password')?.value).toBe('mypassword');
    });

    it('should mark field as touched on blur', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#email') as HTMLInputElement;

      emailInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      const emailControl = component.loginForm.get('email');
      expect(emailControl?.touched).toBe(true);
    });
  });

  describe('signal reactivity', () => {
    it('should react to loading signal changes', () => {
      component.loading.set(false);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.animate-spin')).toBeFalsy();

      component.loading.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.animate-spin')).toBeTruthy();
    });

    it('should react to error signal changes', () => {
      component.error.set(null);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-50')).toBeFalsy();

      component.error.set('Test error');
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-50')).toBeTruthy();
    });
  });
});
