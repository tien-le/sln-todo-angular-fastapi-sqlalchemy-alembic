import { HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let mockNext: jasmine.Spy<HttpHandlerFn>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);
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

  it('should pass through successful responses', (done) => {
    const request = new HttpRequest('GET', '/api/test');
    const successResponse = new HttpResponse({ status: 200, body: { data: 'test' } });

    mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(of(successResponse));

    TestBed.runInInjectionContext(() => {
      errorInterceptor(request, mockNext).subscribe({
        next: (response) => {
          expect(response).toBe(successResponse);
          done();
        },
        error: () => {
          fail('Should not error on successful response');
          done();
        }
      });
    });
  });

  describe('401 Unauthorized', () => {
    it('should logout user and redirect to login on 401 error', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          next: () => {
            fail('Should not succeed');
            done();
          },
          error: (err) => {
            expect(authService.logout).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
            expect(err.message).toBe('Session expired. Please login again.');
            done();
          }
        });
      });
    });

    it('should handle 401 error message', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { detail: 'Token expired' }
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Session expired. Please login again.');
            done();
          }
        });
      });
    });
  });

  describe('403 Forbidden', () => {
    it('should handle 403 error', (done) => {
      const request = new HttpRequest('GET', '/api/admin');
      const error = new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('You do not have permission to access this resource.');
            expect(authService.logout).not.toHaveBeenCalled();
            done();
          }
        });
      });
    });
  });

  describe('404 Not Found', () => {
    it('should handle 404 error', (done) => {
      const request = new HttpRequest('GET', '/api/test/999');
      const error = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Resource not found.');
            done();
          }
        });
      });
    });
  });

  describe('422 Unprocessable Entity', () => {
    it('should handle 422 error with detail message', (done) => {
      const request = new HttpRequest('POST', '/api/test', {});
      const error = new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity',
        error: { detail: 'Validation failed for field: email' }
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Validation failed for field: email');
            done();
          }
        });
      });
    });

    it('should handle 422 error without detail message', (done) => {
      const request = new HttpRequest('POST', '/api/test', {});
      const error = new HttpErrorResponse({
        status: 422,
        statusText: 'Unprocessable Entity'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Validation error occurred.');
            done();
          }
        });
      });
    });
  });

  describe('500 Internal Server Error', () => {
    it('should handle 500 error', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Internal server error. Please try again later.');
            done();
          }
        });
      });
    });
  });

  describe('Client-side errors', () => {
    it('should handle client-side errors', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const errorEvent = new ErrorEvent('Network error', {
        message: 'Connection refused'
      });
      const error = new HttpErrorResponse({
        error: errorEvent,
        status: 0,
        statusText: 'Unknown Error'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Error: Connection refused');
            done();
          }
        });
      });
    });
  });

  describe('Generic errors', () => {
    it('should handle generic HTTP errors with detail', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { detail: 'Invalid request parameters' }
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Invalid request parameters');
            done();
          }
        });
      });
    });

    it('should handle generic HTTP errors without detail', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toContain('Error:');
            done();
          }
        });
      });
    });
  });

  describe('console logging', () => {
    it('should log errors to console', (done) => {
      spyOn(console, 'error');

      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'HTTP Error:',
              'Resource not found.',
              error
            );
            done();
          }
        });
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle authentication flow error', (done) => {
      const request = new HttpRequest('GET', '/api/tasks');
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(authService.logout).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
            expect(err.message).toBe('Session expired. Please login again.');
            done();
          }
        });
      });
    });

    it('should handle validation errors from form submissions', (done) => {
      const request = new HttpRequest('POST', '/api/tasks', { title: '' });
      const error = new HttpErrorResponse({
        status: 422,
        error: { detail: 'Title is required' }
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Title is required');
            expect(authService.logout).not.toHaveBeenCalled();
            done();
          }
        });
      });
    });

    it('should handle multiple consecutive errors', (done) => {
      const request1 = new HttpRequest('GET', '/api/test1');
      const request2 = new HttpRequest('GET', '/api/test2');

      const error1 = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      const error2 = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });

      let completedCalls = 0;

      TestBed.runInInjectionContext(() => {
        // First error
        mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error1));
        errorInterceptor(request1, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Resource not found.');
            completedCalls++;
            if (completedCalls === 2) done();
          }
        });

        // Second error
        mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error2));
        errorInterceptor(request2, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Internal server error. Please try again later.');
            completedCalls++;
            if (completedCalls === 2) done();
          }
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle error without status code', (done) => {
      const request = new HttpRequest('GET', '/api/test');
      const error = new HttpErrorResponse({
        status: 0,
        statusText: '',
        error: new ErrorEvent('Unknown', { message: 'Network error' })
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            expect(err.message).toBe('Error: Network error');
            done();
          }
        });
      });
    });

    it('should handle errors with nested detail objects', (done) => {
      const request = new HttpRequest('POST', '/api/test', {});
      const error = new HttpErrorResponse({
        status: 422,
        error: {
          detail: [
            { field: 'email', message: 'Invalid email' },
            { field: 'password', message: 'Too short' }
          ]
        }
      });

      mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(throwError(() => error));

      TestBed.runInInjectionContext(() => {
        errorInterceptor(request, mockNext).subscribe({
          error: (err) => {
            // Should handle array detail as string
            expect(err.message).toBeTruthy();
            done();
          }
        });
      });
    });
  });
});
