import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('Auth Guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('authGuard', () => {
    it('should allow access when user is authenticated', () => {
      authService.isLoggedIn.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access and redirect to login when user is not authenticated', () => {
      authService.isLoggedIn.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should call isLoggedIn to check authentication status', () => {
      authService.isLoggedIn.and.returnValue(true);

      TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

      expect(authService.isLoggedIn).toHaveBeenCalled();
    });
  });

  describe('guestGuard', () => {
    it('should allow access when user is not authenticated', () => {
      authService.isLoggedIn.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access and redirect to tasks when user is authenticated', () => {
      authService.isLoggedIn.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });

    it('should call isLoggedIn to check authentication status', () => {
      authService.isLoggedIn.and.returnValue(false);

      TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

      expect(authService.isLoggedIn).toHaveBeenCalled();
    });
  });

  describe('guard integration scenarios', () => {
    it('should protect authenticated routes from unauthenticated users', () => {
      authService.isLoggedIn.and.returnValue(false);

      const authResult = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

      expect(authResult).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should prevent authenticated users from accessing guest-only pages', () => {
      authService.isLoggedIn.and.returnValue(true);

      const guestResult = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

      expect(guestResult).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });

    it('should allow authenticated users to access protected routes', () => {
      authService.isLoggedIn.and.returnValue(true);

      const authResult = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

      expect(authResult).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should allow unauthenticated users to access guest pages', () => {
      authService.isLoggedIn.and.returnValue(false);

      const guestResult = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

      expect(guestResult).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('guard behavior consistency', () => {
    it('authGuard and guestGuard should have opposite behavior', () => {
      // When authenticated
      authService.isLoggedIn.and.returnValue(true);

      const authResultWhenLoggedIn = TestBed.runInInjectionContext(() =>
        authGuard({} as any, {} as any)
      );
      const guestResultWhenLoggedIn = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, {} as any)
      );

      expect(authResultWhenLoggedIn).toBe(true);
      expect(guestResultWhenLoggedIn).toBe(false);

      // Reset router spy
      router.navigate.calls.reset();

      // When not authenticated
      authService.isLoggedIn.and.returnValue(false);

      const authResultWhenLoggedOut = TestBed.runInInjectionContext(() =>
        authGuard({} as any, {} as any)
      );
      const guestResultWhenLoggedOut = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, {} as any)
      );

      expect(authResultWhenLoggedOut).toBe(false);
      expect(guestResultWhenLoggedOut).toBe(true);
    });

    it('should always redirect to appropriate page on denial', () => {
      // AuthGuard redirects to login
      authService.isLoggedIn.and.returnValue(false);
      TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);

      router.navigate.calls.reset();

      // GuestGuard redirects to tasks
      authService.isLoggedIn.and.returnValue(true);
      TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple consecutive authGuard calls', () => {
      authService.isLoggedIn.and.returnValue(true);

      const result1 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      const result2 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      const result3 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(authService.isLoggedIn).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple consecutive guestGuard calls', () => {
      authService.isLoggedIn.and.returnValue(false);

      const result1 = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      const result2 = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      const result3 = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(authService.isLoggedIn).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid authentication state changes', () => {
      // Start authenticated
      authService.isLoggedIn.and.returnValue(true);
      const result1 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result1).toBe(true);

      // Become unauthenticated
      authService.isLoggedIn.and.returnValue(false);
      const result2 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result2).toBe(false);

      // Become authenticated again
      authService.isLoggedIn.and.returnValue(true);
      const result3 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result3).toBe(true);
    });
  });

  describe('typical use cases', () => {
    it('should protect /tasks route from unauthenticated users', () => {
      authService.isLoggedIn.and.returnValue(false);

      const canAccessTasks = TestBed.runInInjectionContext(() =>
        authGuard({} as any, {} as any)
      );

      expect(canAccessTasks).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should prevent authenticated users from accessing /auth/login', () => {
      authService.isLoggedIn.and.returnValue(true);

      const canAccessLogin = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, {} as any)
      );

      expect(canAccessLogin).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });

    it('should prevent authenticated users from accessing /auth/register', () => {
      authService.isLoggedIn.and.returnValue(true);

      const canAccessRegister = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, {} as any)
      );

      expect(canAccessRegister).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });

    it('should allow unauthenticated users to access login and register', () => {
      authService.isLoggedIn.and.returnValue(false);

      const canAccessLogin = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, {} as any)
      );
      const canAccessRegister = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, {} as any)
      );

      expect(canAccessLogin).toBe(true);
      expect(canAccessRegister).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
