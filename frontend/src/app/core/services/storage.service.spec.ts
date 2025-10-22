import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StorageService]
    });

    service = TestBed.inject(StorageService);

    // Mock localStorage
    mockLocalStorage = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return mockLocalStorage[key] || null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('token management', () => {
    it('should save token to localStorage', () => {
      const token = 'test-token-123';

      service.saveToken(token);

      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', token);
      expect(mockLocalStorage['access_token']).toBe(token);
    });

    it('should retrieve token from localStorage', () => {
      mockLocalStorage['access_token'] = 'test-token-456';

      const token = service.getToken();

      expect(localStorage.getItem).toHaveBeenCalledWith('access_token');
      expect(token).toBe('test-token-456');
    });

    it('should return null when token does not exist', () => {
      const token = service.getToken();

      expect(token).toBeNull();
    });

    it('should remove token from localStorage', () => {
      mockLocalStorage['access_token'] = 'test-token';

      service.removeToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockLocalStorage['access_token']).toBeUndefined();
    });
  });

  describe('user management', () => {
    it('should save user to localStorage as JSON', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      service.saveUser(user);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'current_user',
        JSON.stringify(user)
      );
      expect(mockLocalStorage['current_user']).toBe(JSON.stringify(user));
    });

    it('should retrieve and parse user from localStorage', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockLocalStorage['current_user'] = JSON.stringify(user);

      const retrievedUser = service.getUser();

      expect(localStorage.getItem).toHaveBeenCalledWith('current_user');
      expect(retrievedUser).toEqual(user);
    });

    it('should return null when user does not exist', () => {
      const user = service.getUser();

      expect(user).toBeNull();
    });

    it('should handle invalid JSON when retrieving user', () => {
      mockLocalStorage['current_user'] = 'invalid-json';

      expect(() => service.getUser()).toThrow();
    });

    it('should remove user from localStorage', () => {
      mockLocalStorage['current_user'] = JSON.stringify({ id: '123' });

      service.removeUser();

      expect(localStorage.removeItem).toHaveBeenCalledWith('current_user');
      expect(mockLocalStorage['current_user']).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove both token and user from localStorage', () => {
      mockLocalStorage['access_token'] = 'test-token';
      mockLocalStorage['current_user'] = JSON.stringify({ id: '123' });

      service.clear();

      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('current_user');
      expect(mockLocalStorage['access_token']).toBeUndefined();
      expect(mockLocalStorage['current_user']).toBeUndefined();
    });

    it('should work even if items do not exist', () => {
      service.clear();

      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('current_user');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete authentication flow', () => {
      const token = 'auth-token-xyz';
      const user = {
        id: '456',
        email: 'user@example.com',
        full_name: 'John Doe',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save credentials
      service.saveToken(token);
      service.saveUser(user);

      // Verify storage
      expect(service.getToken()).toBe(token);
      expect(service.getUser()).toEqual(user);

      // Logout
      service.clear();

      // Verify cleared
      expect(service.getToken()).toBeNull();
      expect(service.getUser()).toBeNull();
    });

    it('should overwrite existing token', () => {
      service.saveToken('old-token');
      service.saveToken('new-token');

      expect(service.getToken()).toBe('new-token');
    });

    it('should overwrite existing user', () => {
      const oldUser = {
        id: '1',
        email: 'old@example.com',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const newUser = {
        id: '2',
        email: 'new@example.com',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      service.saveUser(oldUser);
      service.saveUser(newUser);

      expect(service.getUser()).toEqual(newUser);
    });
  });

  describe('edge cases', () => {
    it('should handle saving empty string token', () => {
      service.saveToken('');

      // localStorage stores empty string, but we check that it was called correctly
      expect(localStorage.setItem).toHaveBeenCalledWith('access_token', '');
      // Mock returns what was stored
      expect(mockLocalStorage['access_token']).toBe('');
    });

    it('should handle saving null-like user objects', () => {
      const user: any = {
        id: null,
        email: null,
        full_name: null,
        is_active: null,
        is_superuser: null,
        created_at: null,
        updated_at: null
      };

      service.saveUser(user);

      expect(service.getUser()).toEqual(user);
    });

    it('should handle complex nested user objects', () => {
      const user: any = {
        id: '123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          firstName: 'Test',
          lastName: 'User',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        }
      };

      service.saveUser(user);

      expect(service.getUser()).toEqual(user);
    });
  });
});
