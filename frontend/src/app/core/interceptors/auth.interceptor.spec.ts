import { HttpEvent, HttpHandlerFn, HttpHeaders, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let mockNext: jasmine.Spy<HttpHandlerFn>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Create a mock next handler that returns an observable
    mockNext = jasmine.createSpy('HttpHandlerFn').and.returnValue(
      of({} as HttpEvent<any>)
    );
  });

  it('should add Authorization header when token exists', () => {
    const token = 'test-token-123';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('GET', '/api/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    expect(mockNext).toHaveBeenCalled();
    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('should not add Authorization header when token does not exist', () => {
    authService.getToken.and.returnValue(null);

    const request = new HttpRequest('GET', '/api/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    expect(mockNext).toHaveBeenCalled();
    const passedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(passedRequest.headers.has('Authorization')).toBe(false);
  });

  it('should not modify request when no token', () => {
    authService.getToken.and.returnValue(null);

    const request = new HttpRequest('GET', '/api/test');
    const originalHeaders = request.headers;

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const passedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(passedRequest).toBe(request);
    expect(passedRequest.headers).toBe(originalHeaders);
  });

  it('should clone request when adding token', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('GET', '/api/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest).not.toBe(request);
  });

  it('should preserve other headers when adding Authorization', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const request = new HttpRequest('GET', '/api/test', { headers });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(modifiedRequest.headers.get('Content-Type')).toBe('application/json');
  });

  it('should handle POST requests with token', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('POST', '/api/test', { data: 'test' });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(modifiedRequest.body).toEqual({ data: 'test' });
  });

  it('should handle PUT requests with token', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('PUT', '/api/test/1', { data: 'updated' });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('should handle DELETE requests with token', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('DELETE', '/api/test/1');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('should handle PATCH requests with token', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('PATCH', '/api/test/1', { status: 'active' });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('should format Bearer token correctly', () => {
    const token = 'abc123xyz';
    authService.getToken.and.returnValue(token);

    const request = new HttpRequest('GET', '/api/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    const authHeader = modifiedRequest.headers.get('Authorization');
    expect(authHeader).toMatch(/^Bearer /);
    expect(authHeader).toBe('Bearer abc123xyz');
  });

  it('should call authService.getToken once per request', () => {
    authService.getToken.and.returnValue('token');

    const request = new HttpRequest('GET', '/api/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    expect(authService.getToken).toHaveBeenCalledTimes(1);
  });

  it('should handle empty string token as falsy', () => {
    authService.getToken.and.returnValue('');

    const request = new HttpRequest('GET', '/api/test');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const passedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(passedRequest.headers.has('Authorization')).toBe(false);
  });

  it('should handle multiple consecutive requests', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const request1 = new HttpRequest('GET', '/api/test1');
    const request2 = new HttpRequest('GET', '/api/test2');
    const request3 = new HttpRequest('POST', '/api/test3', {});

    TestBed.runInInjectionContext(() => {
      authInterceptor(request1, mockNext);
      authInterceptor(request2, mockNext);
      authInterceptor(request3, mockNext);
    });

    expect(mockNext).toHaveBeenCalledTimes(3);
    expect(authService.getToken).toHaveBeenCalledTimes(3);

    // Check all requests have Authorization header
    mockNext.calls.all().forEach(call => {
      const modifiedRequest = call.args[0] as HttpRequest<any>;
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
    });
  });

  it('should handle requests with different URLs', () => {
    const token = 'test-token';
    authService.getToken.and.returnValue(token);

    const requests = [
      new HttpRequest('GET', '/api/tasks'),
      new HttpRequest('GET', '/api/users'),
      new HttpRequest('GET', 'https://external-api.com/data')
    ];

    requests.forEach(request => {
      TestBed.runInInjectionContext(() => {
        authInterceptor(request, mockNext);
      });

      const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
      expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
    });
  });

  it('should not interfere with existing Authorization header if no token', () => {
    authService.getToken.and.returnValue(null);

    const headers = new HttpHeaders().set('Authorization', 'Basic abc123');
    const request = new HttpRequest('GET', '/api/test', { headers });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockNext);
    });

    const passedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
    expect(passedRequest.headers.get('Authorization')).toBe('Basic abc123');
  });

  describe('integration scenarios', () => {
    it('should work with typical authenticated API calls', () => {
      const token = 'user-session-token';
      authService.getToken.and.returnValue(token);

      // Simulate typical API calls
      const getTasks = new HttpRequest('GET', '/api/v1/tasks');
      const createTask = new HttpRequest('POST', '/api/v1/tasks', { title: 'New Task' });
      const updateTask = new HttpRequest('PUT', '/api/v1/tasks/123', { title: 'Updated' });
      const deleteTask = new HttpRequest('DELETE', '/api/v1/tasks/123');

      [getTasks, createTask, updateTask, deleteTask].forEach(request => {
        TestBed.runInInjectionContext(() => {
          authInterceptor(request, mockNext);
        });

        const modifiedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
        expect(modifiedRequest.headers.get('Authorization')).toBe(`Bearer ${token}`);
      });
    });

    it('should handle unauthenticated API calls', () => {
      authService.getToken.and.returnValue(null);

      // Simulate public API calls
      const login = new HttpRequest('POST', '/api/auth/login', { email: 'test@test.com' });
      const register = new HttpRequest('POST', '/api/auth/register', { email: 'test@test.com' });

      [login, register].forEach(request => {
        TestBed.runInInjectionContext(() => {
          authInterceptor(request, mockNext);
        });

        const passedRequest = mockNext.calls.mostRecent().args[0] as HttpRequest<any>;
        expect(passedRequest.headers.has('Authorization')).toBe(false);
      });
    });
  });
});
