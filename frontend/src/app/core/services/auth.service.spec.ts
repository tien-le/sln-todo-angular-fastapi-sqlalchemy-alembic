import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, User, UserCreate } from '../../models/user.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let storageService: jasmine.SpyObj<StorageService>;
  let router: jasmine.SpyObj<Router>;
  const apiUrl = `${environment.apiBaseUrl}/auth`;

  beforeEach(() => {
    const storageServiceSpy = jasmine.createSpyObj('StorageService', [
      'saveToken',
      'getToken',
      'saveUser',
      'getUser',
      'clear'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StorageService, useValue: storageServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    storageService = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize auth state from storage on creation', () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Reset and reconfigure TestBed with pre-configured spy
      TestBed.resetTestingModule();

      const storageServiceSpy = jasmine.createSpyObj('StorageService', [
        'saveToken',
        'getToken',
        'saveUser',
        'getUser',
        'clear'
      ]);
      storageServiceSpy.getToken.and.returnValue('test-token');
      storageServiceSpy.getUser.and.returnValue(mockUser);

      const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: StorageService, useValue: storageServiceSpy },
          { provide: Router, useValue: routerSpy }
        ]
      });

      // Create new service instance with configured spy
      const newService = TestBed.inject(AuthService);

      expect(newService.currentUser()).toEqual(mockUser);
      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should not set auth state when no token in storage', () => {
      // Reset mocks and create fresh TestBed
      storageService.getToken.and.returnValue(null);
      storageService.getUser.and.returnValue(null);

      // Reset TestBed to create fresh instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: StorageService, useValue: storageService },
          { provide: Router, useValue: router }
        ]
      });

      const newService = TestBed.inject(AuthService);

      expect(newService.currentUser()).toBeNull();
      expect(newService.isAuthenticated()).toBe(false);
    });
  });

  describe('register', () => {
    it('should register a new user', () => {
      const userData: UserCreate = {
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User'
      };

      const mockResponse: User = {
        id: '123',
        email: 'newuser@example.com',
        full_name: 'New User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      service.register(userData).subscribe(user => {
        expect(user.email).toBe('newuser@example.com');
        expect(user.id).toBe('123');
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush(mockResponse);
    });

    it('should handle registration errors', () => {
      const userData: UserCreate = {
        email: 'existing@example.com',
        password: 'password123'
      };

      service.register(userData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush(
        { detail: 'Email already registered' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('login', () => {
    it('should login user and store credentials', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse: LoginResponse = {
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

      service.login(credentials).subscribe(response => {
        expect(response.access_token).toBe('test-token');
        expect(response.user.email).toBe('test@example.com');
        expect(storageService.saveToken).toHaveBeenCalledWith('test-token');
        expect(storageService.saveUser).toHaveBeenCalledWith(mockResponse.user);
        expect(service.currentUser()).toEqual(mockResponse.user);
        expect(service.isAuthenticated()).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });

    it('should handle invalid credentials', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      service.login(credentials).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(
        { detail: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });
  });

  describe('logout', () => {
    it('should clear credentials and navigate to login', () => {
      service.logout();

      expect(storageService.clear).toHaveBeenCalled();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('getMe', () => {
    it('should fetch and update current user', () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User Updated',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      service.getMe().subscribe(user => {
        expect(user.full_name).toBe('Test User Updated');
        expect(storageService.saveUser).toHaveBeenCalledWith(mockUser);
        expect(service.currentUser()).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should handle unauthorized error', () => {
      service.getMe().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/me`);
      req.flush(
        { detail: 'Not authenticated' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is authenticated', () => {
      // Set authenticated state
      const mockResponse: LoginResponse = {
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

      service.login({ email: 'test@example.com', password: 'password123' }).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);

      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return token from storage', () => {
      storageService.getToken.and.returnValue('test-token');

      const token = service.getToken();

      expect(token).toBe('test-token');
      expect(storageService.getToken).toHaveBeenCalled();
    });

    it('should return null when no token', () => {
      storageService.getToken.and.returnValue(null);

      const token = service.getToken();

      expect(token).toBeNull();
    });
  });

  describe('signals', () => {
    it('should update currentUser signal on login', () => {
      const mockResponse: LoginResponse = {
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

      expect(service.currentUser()).toBeNull();

      service.login({ email: 'test@example.com', password: 'password123' }).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);

      expect(service.currentUser()).toEqual(mockResponse.user);
    });

    it('should update isAuthenticated computed signal', () => {
      const mockResponse: LoginResponse = {
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

      expect(service.isAuthenticated()).toBe(false);

      service.login({ email: 'test@example.com', password: 'password123' }).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);

      expect(service.isAuthenticated()).toBe(true);

      service.logout();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should track loading state', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should track error state', () => {
      expect(service.error()).toBeNull();
    });

    it('should clear error when clearError is called', () => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      service.login(credentials).subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(service.error()).toBeTruthy();
          service.clearError();
          expect(service.error()).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(
        { detail: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });
  });

  describe('async methods', () => {
    describe('registerAsync', () => {
      it('should register user using async/await', async () => {
        const userData: UserCreate = {
          email: 'newuser@example.com',
          password: 'password123',
          full_name: 'New User'
        };

        const mockResponse: User = {
          id: '123',
          email: 'newuser@example.com',
          full_name: 'New User',
          is_active: true,
          is_superuser: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const promise = service.registerAsync(userData);
        const req = httpMock.expectOne(`${apiUrl}/register`);
        req.flush(mockResponse);

        const user = await promise;
        expect(user.email).toBe('newuser@example.com');
      });

      it('should handle errors in async register', async () => {
        const userData: UserCreate = {
          email: 'existing@example.com',
          password: 'password123'
        };

        const promise = service.registerAsync(userData);
        const req = httpMock.expectOne(`${apiUrl}/register`);
        req.flush(
          { detail: 'Email already registered' },
          { status: 400, statusText: 'Bad Request' }
        );

        await expectAsync(promise).toBeRejected();
        expect(service.error()).toBeTruthy();
      });
    });

    describe('loginAsync', () => {
      it('should login user using async/await', async () => {
        const credentials: LoginRequest = {
          email: 'test@example.com',
          password: 'password123'
        };

        const mockResponse: LoginResponse = {
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

        const promise = service.loginAsync(credentials);
        const req = httpMock.expectOne(`${apiUrl}/login`);
        req.flush(mockResponse);

        const response = await promise;
        expect(response.access_token).toBe('test-token');
        expect(service.currentUser()).toEqual(mockResponse.user);
        expect(service.isAuthenticated()).toBe(true);
      });

      it('should handle errors in async login', async () => {
        const credentials: LoginRequest = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        const promise = service.loginAsync(credentials);
        const req = httpMock.expectOne(`${apiUrl}/login`);
        req.flush(
          { detail: 'Invalid credentials' },
          { status: 401, statusText: 'Unauthorized' }
        );

        await expectAsync(promise).toBeRejected();
        expect(service.error()).toBeTruthy();
      });
    });

    describe('getMeAsync', () => {
      it('should fetch user profile using async/await', async () => {
        const mockUser: User = {
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          is_active: true,
          is_superuser: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const promise = service.getMeAsync();
        const req = httpMock.expectOne(`${apiUrl}/me`);
        req.flush(mockUser);

        const user = await promise;
        expect(user.email).toBe('test@example.com');
        expect(service.currentUser()).toEqual(mockUser);
      });
    });

    describe('logoutAsync', () => {
      it('should logout using async/await', async () => {
        await service.logoutAsync();

        expect(storageService.clear).toHaveBeenCalled();
        expect(service.currentUser()).toBeNull();
        expect(service.isAuthenticated()).toBe(false);
      });
    });

    describe('refreshUserData', () => {
      it('should refresh user data when authenticated', async () => {
        // First login
        const loginResponse: LoginResponse = {
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

        const loginPromise = service.loginAsync({ email: 'test@example.com', password: 'password123' });
        const loginReq = httpMock.expectOne(`${apiUrl}/login`);
        loginReq.flush(loginResponse);
        await loginPromise;

        // Now refresh
        const updatedUser: User = {
          ...loginResponse.user,
          full_name: 'Updated Name'
        };

        const refreshPromise = service.refreshUserData();
        const refreshReq = httpMock.expectOne(`${apiUrl}/me`);
        refreshReq.flush(updatedUser);
        await refreshPromise;

        expect(service.currentUser()?.full_name).toBe('Updated Name');
      });

      it('should not refresh when not authenticated', async () => {
        await service.refreshUserData();
        httpMock.expectNone(`${apiUrl}/me`);
      });
    });
  });
});
