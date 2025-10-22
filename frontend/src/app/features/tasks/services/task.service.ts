import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Task, TaskCreate, TaskFilters, TaskList, TaskUpdate } from '../../../models/task.model';

/**
 * Service for task-related operations.
 * Provides both Observable and Promise-based (async/await) methods.
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/tasks`;

  // Signals for state management
  private isLoadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  isLoading = this.isLoadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  /**
   * List tasks with optional filters and pagination - Observable version
   */
  listTasks(
    page: number = 1,
    pageSize: number = 20,
    filters?: TaskFilters
  ): Observable<TaskList> {
    this.errorSignal.set(null);
    const params = this.buildQueryParams(page, pageSize, filters);
    return this.http.get<TaskList>(this.apiUrl, { params })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * List tasks with optional filters and pagination - Async version
   */
  async listTasksAsync(
    page: number = 1,
    pageSize: number = 20,
    filters?: TaskFilters
  ): Promise<TaskList> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      return await firstValueFrom(this.listTasks(page, pageSize, filters));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Get a specific task by ID - Observable version
   */
  getTask(taskId: string): Observable<Task> {
    this.errorSignal.set(null);
    return this.http.get<Task>(`${this.apiUrl}/${taskId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Get a specific task by ID - Async version
   */
  async getTaskAsync(taskId: string): Promise<Task> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      return await firstValueFrom(this.getTask(taskId));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Create a new task - Observable version
   */
  createTask(task: TaskCreate): Observable<Task> {
    this.errorSignal.set(null);
    return this.http.post<Task>(this.apiUrl, task)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Create a new task - Async version
   */
  async createTaskAsync(task: TaskCreate): Promise<Task> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      return await firstValueFrom(this.createTask(task));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Update an existing task - Observable version
   */
  updateTask(taskId: string, task: TaskUpdate): Observable<Task> {
    this.errorSignal.set(null);
    return this.http.put<Task>(`${this.apiUrl}/${taskId}`, task)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Update an existing task - Async version
   */
  async updateTaskAsync(taskId: string, task: TaskUpdate): Promise<Task> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      return await firstValueFrom(this.updateTask(taskId, task));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Delete a task - Observable version
   */
  deleteTask(taskId: string): Observable<void> {
    this.errorSignal.set(null);
    return this.http.delete<void>(`${this.apiUrl}/${taskId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Delete a task - Async version
   */
  async deleteTaskAsync(taskId: string): Promise<void> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      await firstValueFrom(this.deleteTask(taskId));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Mark a task as completed - Observable version
   */
  completeTask(taskId: string): Observable<Task> {
    this.errorSignal.set(null);
    return this.http.patch<Task>(`${this.apiUrl}/${taskId}/complete`, {})
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Mark a task as completed - Async version
   */
  async completeTaskAsync(taskId: string): Promise<Task> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      return await firstValueFrom(this.completeTask(taskId));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Reopen a completed task - Observable version
   */
  reopenTask(taskId: string): Observable<Task> {
    this.errorSignal.set(null);
    return this.http.patch<Task>(`${this.apiUrl}/${taskId}/reopen`, {})
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Reopen a completed task - Async version
   */
  async reopenTaskAsync(taskId: string): Promise<Task> {
    this.errorSignal.set(null);
    this.isLoadingSignal.set(true);

    try {
      return await firstValueFrom(this.reopenTask(taskId));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Build query parameters for list tasks request
   */
  private buildQueryParams(
    page: number,
    pageSize: number,
    filters?: TaskFilters
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.priority) {
        params = params.set('priority', filters.priority);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.sort_by) {
        params = params.set('sort_by', filters.sort_by);
      }
      if (filters.tag_ids && filters.tag_ids.length > 0) {
        filters.tag_ids.forEach(tagId => {
          params = params.append('tag_ids', tagId);
        });
      }
    }

    return params;
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

    this.errorSignal.set(errorMessage);
    console.error('Task Service Error:', errorMessage);
    return throwError(() => error);
  }
}
