import { HttpParams } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get', () => {
    it('should make GET request to correct URL', () => {
      const path = '/test';
      const mockResponse = { data: 'test' };

      service.get(path).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include query parameters in GET request', () => {
      const path = '/test';
      const params = new HttpParams()
        .set('page', '1')
        .set('limit', '10');
      const mockResponse = { data: 'test' };

      service.get(path, params).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        req => req.url === `${baseUrl}${path}` &&
        req.params.get('page') === '1' &&
        req.params.get('limit') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle GET errors', () => {
      const path = '/test';

      service.get(path).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('post', () => {
    it('should make POST request with body', () => {
      const path = '/test';
      const body = { name: 'test', value: 123 };
      const mockResponse = { id: '1', ...body };

      service.post(path, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle POST errors', () => {
      const path = '/test';
      const body = { name: 'test' };

      service.post(path, body).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      req.flush(
        { detail: 'Bad Request' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('put', () => {
    it('should make PUT request with body', () => {
      const path = '/test/1';
      const body = { name: 'updated', value: 456 };
      const mockResponse = { id: '1', ...body };

      service.put(path, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should handle PUT errors', () => {
      const path = '/test/1';
      const body = { name: 'updated' };

      service.put(path, body).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('patch', () => {
    it('should make PATCH request with body', () => {
      const path = '/test/1';
      const body = { status: 'active' };
      const mockResponse = { id: '1', name: 'test', ...body };

      service.patch(path, body).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should make PATCH request without body', () => {
      const path = '/test/1/activate';
      const mockResponse = { id: '1', active: true };

      service.patch(path).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mockResponse);
    });

    it('should handle PATCH errors', () => {
      const path = '/test/1';
      const body = { status: 'active' };

      service.patch(path, body).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(422);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      req.flush(
        { detail: 'Validation error' },
        { status: 422, statusText: 'Unprocessable Entity' }
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', () => {
      const path = '/test/1';
      const mockResponse = { success: true };

      service.delete(path).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle DELETE with no response body', () => {
      const path = '/test/1';

      service.delete(path).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle DELETE errors', () => {
      const path = '/test/1';

      service.delete(path).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      req.flush(
        { detail: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );
    });
  });

  describe('baseUrl configuration', () => {
    it('should use environment baseUrl', () => {
      const path = '/test';

      service.get(path).subscribe();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}${path}`);
      expect(req.request.url).toBe(`${environment.apiBaseUrl}${path}`);
      req.flush({});
    });

    it('should handle paths with leading slash', () => {
      const path = '/api/v1/test';

      service.get(path).subscribe();

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.url).toBe(`${baseUrl}${path}`);
      req.flush({});
    });

    it('should handle paths without leading slash', () => {
      const path = 'api/v1/test';

      service.get(path).subscribe();

      const req = httpMock.expectOne(`${baseUrl}${path}`);
      expect(req.request.url).toBe(`${baseUrl}${path}`);
      req.flush({});
    });
  });
});
