/**
 * Base API service for HTTP requests.
 * Provides both Observable and Promise-based (async/await) methods.
 */
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * HTTP GET request - Observable version
   */
  get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP POST request - Observable version
   */
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP PUT request - Observable version
   */
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP PATCH request - Observable version
   */
  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body)
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP DELETE request - Observable version
   */
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * HTTP GET request - Async/await version
   */
  async getAsync<T>(path: string, params?: HttpParams): Promise<T> {
    return firstValueFrom(this.get<T>(path, params));
  }

  /**
   * HTTP POST request - Async/await version
   */
  async postAsync<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.post<T>(path, body));
  }

  /**
   * HTTP PUT request - Async/await version
   */
  async putAsync<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.put<T>(path, body));
  }

  /**
   * HTTP PATCH request - Async/await version
   */
  async patchAsync<T>(path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.patch<T>(path, body));
  }

  /**
   * HTTP DELETE request - Async/await version
   */
  async deleteAsync<T>(path: string): Promise<T> {
    return firstValueFrom(this.delete<T>(path));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      errorMessage = error.error?.detail || error.error?.message || error.message;
    }

    console.error('API Error:', errorMessage);
    return throwError(() => error);
  }
}
