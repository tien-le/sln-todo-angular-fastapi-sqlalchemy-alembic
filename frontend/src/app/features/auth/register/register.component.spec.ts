import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../models/user.model';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    full_name: 'Test User',
    is_active: true,
    is_superuser: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as any); // Return empty object for RouterLink
    routerSpy.serializeUrl.and.returnValue(''); // Return empty string for RouterLink

    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: { params: {} }
    });

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize register form with empty values', () => {
      expect(component.registerForm.value).toEqual({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: ''
      });
    });

    it('should have invalid form initially', () => {
      expect(component.registerForm.invalid).toBe(true);
    });
  });

  describe('form validation', () => {
    it('should require email field', () => {
      const emailControl = component.registerForm.get('email');

      emailControl?.setValue('');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.hasError('required')).toBe(true);

      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.registerForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should require password field', () => {
      const passwordControl = component.registerForm.get('password');

      passwordControl?.setValue('');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.hasError('required')).toBe(true);
    });

    it('should enforce minimum password length', () => {
      const passwordControl = component.registerForm.get('password');

      passwordControl?.setValue('short');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.hasError('minlength')).toBe(true);

      passwordControl?.setValue('validpassword');
      expect(passwordControl?.valid).toBe(true);
    });

    it('should require confirmPassword field', () => {
      const confirmControl = component.registerForm.get('confirmPassword');

      confirmControl?.setValue('');
      expect(confirmControl?.invalid).toBe(true);
      expect(confirmControl?.hasError('required')).toBe(true);
    });

    it('should validate password match', () => {
      component.registerForm.patchValue({
        password: 'password123',
        confirmPassword: 'different'
      });

      expect(component.registerForm.hasError('mismatch')).toBe(true);
    });

    it('should pass validation when passwords match', () => {
      component.registerForm.patchValue({
        password: 'password123',
        confirmPassword: 'password123'
      });

      expect(component.registerForm.hasError('mismatch')).toBe(false);
    });

    it('should allow empty full_name (optional field)', () => {
      const fullNameControl = component.registerForm.get('full_name');

      fullNameControl?.setValue('');
      expect(fullNameControl?.valid).toBe(true);
    });

    it('should have valid form when all required fields are filled correctly', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        full_name: 'Test User'
      });

      expect(component.registerForm.valid).toBe(true);
    });
  });

  describe('passwordMatchValidator', () => {
    it('should return null when passwords match', () => {
      component.registerForm.patchValue({
        password: 'password123',
        confirmPassword: 'password123'
      });

      expect(component.registerForm.hasError('mismatch')).toBe(false);
    });

    it('should return mismatch error when passwords do not match', () => {
      component.registerForm.patchValue({
        password: 'password123',
        confirmPassword: 'different123'
      });

      expect(component.registerForm.hasError('mismatch')).toBe(true);
    });

    it('should validate on confirmPassword change', () => {
      component.registerForm.patchValue({
        password: 'password123',
        confirmPassword: 'wrong'
      });
      expect(component.registerForm.hasError('mismatch')).toBe(true);

      component.registerForm.patchValue({
        confirmPassword: 'password123'
      });
      expect(component.registerForm.hasError('mismatch')).toBe(false);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        full_name: 'Test User'
      });
    });

    it('should call authService.register with correct data', () => {
      authService.register.and.returnValue(of(mockUser));

      component.onSubmit();

      expect(authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User'
      });
    });

    it('should not include confirmPassword in registration data', () => {
      authService.register.and.returnValue(of(mockUser));

      component.onSubmit();

      const callArgs = authService.register.calls.mostRecent().args[0];
      expect('confirmPassword' in callArgs).toBe(false);
    });

    it('should navigate to login page after successful registration', fakeAsync(() => {
      authService.register.and.returnValue(of(mockUser));

      component.onSubmit();
      tick(2000);

      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
      expect(component.loading()).toBe(false);
    }));

    it('should show success message after registration', () => {
      authService.register.and.returnValue(of(mockUser));

      component.onSubmit();

      expect(component.success()).toBe('Registration successful! Redirecting to login...');
    });

    it('should not submit when form is invalid', () => {
      component.registerForm.patchValue({
        email: '',
        password: '',
        confirmPassword: ''
      });

      component.onSubmit();

      expect(authService.register).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should set loading state during registration', () => {
      authService.register.and.returnValue(of(mockUser));

      expect(component.loading()).toBe(false);
      component.onSubmit();

      // After successful registration, loading should be false
      expect(component.loading()).toBe(false);
    });

    it('should handle registration error', () => {
      const errorMessage = 'Email already exists';
      authService.register.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.onSubmit();

      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBe(false);
      expect(component.success()).toBeNull();
    });

    it('should handle generic error when no message provided', () => {
      authService.register.and.returnValue(
        throwError(() => new Error())
      );

      component.onSubmit();

      expect(component.error()).toBe('Registration failed. Please try again.');
      expect(component.loading()).toBe(false);
    });

    it('should clear previous errors on new submission', () => {
      component.error.set('Previous error');
      component.success.set('Previous success');
      authService.register.and.returnValue(of(mockUser));

      component.onSubmit();

      expect(component.error()).toBeNull();
      expect(component.success()).toBe('Registration successful! Redirecting to login...');
    });
  });

  describe('template rendering', () => {
    it('should display registration form', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#email');
      const passwordInput = compiled.querySelector('#password');
      const confirmPasswordInput = compiled.querySelector('#confirmPassword');
      const fullNameInput = compiled.querySelector('#full_name');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(confirmPasswordInput).toBeTruthy();
      expect(fullNameInput).toBeTruthy();
    });

    it('should display "Create your account" heading', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h2');

      expect(heading?.textContent).toContain('Create your account');
    });

    it('should display link to login page', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const loginLink = compiled.querySelector('a[routerLink="/auth/login"]');

      expect(loginLink).toBeTruthy();
      expect(loginLink?.textContent).toContain('sign in to existing account');
    });

    it('should display error message when error exists', () => {
      component.error.set('Registration failed');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorDiv = compiled.querySelector('.bg-red-50');

      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.textContent).toContain('Registration failed');
    });

    it('should display success message when success exists', () => {
      component.success.set('Registration successful!');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const successDiv = compiled.querySelector('.bg-green-50');

      expect(successDiv).toBeTruthy();
      expect(successDiv?.textContent).toContain('Registration successful!');
    });

    it('should display email validation error when touched and invalid', () => {
      const emailControl = component.registerForm.get('email');
      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessage = compiled.querySelector('.text-red-600');

      expect(errorMessage?.textContent).toContain('Please enter a valid email address');
    });

    it('should display password validation error when too short', () => {
      const passwordControl = component.registerForm.get('password');
      passwordControl?.setValue('short');
      passwordControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessages = Array.from(compiled.querySelectorAll('.text-red-600'));
      const passwordError = errorMessages.find(el =>
        el.textContent?.includes('Password must be at least 8 characters')
      );

      expect(passwordError).toBeTruthy();
    });

    it('should display password mismatch error', () => {
      component.registerForm.patchValue({
        password: 'password123',
        confirmPassword: 'different'
      });
      const confirmControl = component.registerForm.get('confirmPassword');
      confirmControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessages = Array.from(compiled.querySelectorAll('.text-red-600'));
      const mismatchError = errorMessages.find(el =>
        el.textContent?.includes('Passwords do not match')
      );

      expect(mismatchError).toBeTruthy();
    });

    it('should disable submit button when form is invalid', () => {
      component.registerForm.patchValue({
        email: '',
        password: ''
      });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });

    it('should disable submit button when loading', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });

    it('should enable submit button when form is valid and not loading', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });
      component.loading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(false);
    });

    it('should show "Create account" text when not loading', () => {
      component.loading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');

      expect(submitButton?.textContent).toContain('Create account');
    });

    it('should show "Creating account..." text when loading', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');

      expect(submitButton?.textContent).toContain('Creating account...');
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
    it('should update form value when user types in fields', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#email') as HTMLInputElement;

      emailInput.value = 'user@example.com';
      emailInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.registerForm.get('email')?.value).toBe('user@example.com');
    });

    it('should validate password match in real-time', () => {
      component.registerForm.patchValue({
        password: 'password123'
      });

      component.registerForm.patchValue({
        confirmPassword: 'password'
      });
      expect(component.registerForm.hasError('mismatch')).toBe(true);

      component.registerForm.patchValue({
        confirmPassword: 'password123'
      });
      expect(component.registerForm.hasError('mismatch')).toBe(false);
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

    it('should react to success signal changes', () => {
      component.success.set(null);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-green-50')).toBeFalsy();

      component.success.set('Success!');
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-green-50')).toBeTruthy();
    });
  });
});
