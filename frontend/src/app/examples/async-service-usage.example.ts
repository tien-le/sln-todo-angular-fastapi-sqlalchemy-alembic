/**
 * Example Component: Async Service Usage
 *
 * This file demonstrates best practices for using the updated async services.
 * DO NOT include this in production builds - it's for reference only.
 */

import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { TaskService } from '../features/tasks/services/task.service';
import { Task, TaskCreate, TaskPriority, TaskStatus } from '../models/task.model';

/**
 * Example 1: Using Async/Await Pattern
 */
@Component({
  selector: 'app-async-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <!-- Loading state from service signal -->
      @if (taskService.isLoading()) {
        <div class="spinner">Loading...</div>
      }

      <!-- Error state from service signal -->
      @if (taskService.error()) {
        <div class="error">
          {{ taskService.error() }}
          <button (click)="taskService.clearError()">Dismiss</button>
        </div>
      }

      <!-- Task list -->
      @for (task of tasks(); track task.id) {
        <div class="task-card">
          <h3>{{ task.title }}</h3>
          <p>{{ task.description }}</p>
          <button (click)="handleCompleteTask(task.id)">Complete</button>
          <button (click)="handleDeleteTask(task.id)">Delete</button>
        </div>
      }

      <!-- Create task form -->
      <button (click)="handleCreateTask()">Create New Task</button>
    </div>
  `
})
export class AsyncExampleComponent implements OnInit {
  protected taskService = inject(TaskService);
  private router = inject(Router);

  // Local state using signals
  tasks = signal<Task[]>([]);
  selectedTask = signal<Task | null>(null);

  // Computed values
  completedCount = computed(() =>
    this.tasks().filter(t => t.status === 'completed').length
  );

  async ngOnInit(): Promise<void> {
    await this.loadTasks();
  }

  /**
   * Load tasks using async/await
   */
  async loadTasks(): Promise<void> {
    try {
      const result = await this.taskService.listTasksAsync(1, 20, {
        sort_by: 'created_at'
      });
      this.tasks.set(result.items);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Error is already captured in taskService.error()
    }
  }

  /**
   * Create task using async/await
   */
  async handleCreateTask(): Promise<void> {
    const newTaskData: TaskCreate = {
      title: 'New Task',
      description: 'Task created from example',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING
    };

    try {
      const createdTask = await this.taskService.createTaskAsync(newTaskData);

      // Update local state optimistically
      this.tasks.update(tasks => [...tasks, createdTask]);

      console.log('Task created successfully:', createdTask);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  /**
   * Complete task using async/await
   */
  async handleCompleteTask(taskId: string): Promise<void> {
    try {
      const updatedTask = await this.taskService.completeTaskAsync(taskId);

      // Update local state
      this.tasks.update(tasks =>
        tasks.map(t => t.id === taskId ? updatedTask : t)
      );

      console.log('Task completed:', updatedTask);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }

  /**
   * Delete task using async/await
   */
  async handleDeleteTask(taskId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await this.taskService.deleteTaskAsync(taskId);

      // Update local state
      this.tasks.update(tasks => tasks.filter(t => t.id !== taskId));

      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  /**
   * Example: Multiple async operations in parallel
   */
  async loadMultipleResources(): Promise<void> {
    try {
      const [tasks, completedTasks] = await Promise.all([
        this.taskService.listTasksAsync(1, 10, { status: TaskStatus.PENDING }),
        this.taskService.listTasksAsync(1, 10, { status: TaskStatus.COMPLETED })
      ]);

      console.log('Pending tasks:', tasks.items);
      console.log('Completed tasks:', completedTasks.items);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  }
}

/**
 * Example 2: Using Observable Pattern with Async Pipe
 */
@Component({
  selector: 'app-observable-example',
  imports: [AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <!-- Using async pipe for automatic subscription management -->
      @if (tasks$ | async; as tasks) {
        @for (task of tasks.items; track task.id) {
          <div>{{ task.title }}</div>
        }
      }
    </div>
  `
})
export class ObservableExampleComponent {
  private taskService = inject(TaskService);

  // Observable that can be used with async pipe
  protected tasks$ = this.taskService.listTasks(1, 20);
}

/**
 * Example 3: Auth Service Usage
 */
@Component({
  selector: 'app-auth-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <!-- Auth state from signals -->
      @if (authService.isAuthenticated()) {
        <div>
          <p>Welcome, {{ authService.currentUser()?.full_name }}!</p>
          <button (click)="handleLogout()">Logout</button>
        </div>
      } @else {
        <div>
          @if (authService.isLoading()) {
            <p>Logging in...</p>
          }
          @if (authService.error()) {
            <div class="error">{{ authService.error() }}</div>
          }
          <button (click)="handleLogin()">Login</button>
        </div>
      }
    </div>
  `
})
export class AuthExampleComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // Effect runs automatically when auth state changes
    effect(() => {
      if (this.authService.isAuthenticated()) {
        console.log('User authenticated:', this.authService.currentUser());
      } else {
        console.log('User not authenticated');
      }
    });
  }

  /**
   * Login using async/await
   */
  async handleLogin(): Promise<void> {
    try {
      await this.authService.loginAsync({
        email: 'user@example.com',
        password: 'password123'
      });

      // Navigate on success
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login failed:', error);
      // Error is available in authService.error()
    }
  }

  /**
   * Logout
   */
  async handleLogout(): Promise<void> {
    await this.authService.logoutAsync();
  }

  /**
   * Register new user
   */
  async handleRegister(): Promise<void> {
    try {
      const user = await this.authService.registerAsync({
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User'
      });

      console.log('User registered:', user);

      // Auto-login after registration
      await this.handleLogin();
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }

  /**
   * Refresh user data
   */
  async refreshProfile(): Promise<void> {
    try {
      await this.authService.refreshUserData();
      console.log('Profile refreshed');
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }
}

/**
 * Example 4: Advanced Pattern - Combining Multiple Services
 */
@Component({
  selector: 'app-advanced-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      @if (isInitializing()) {
        <div>Initializing...</div>
      } @else {
        <div>
          <h2>My Tasks ({{ userTasks().length }})</h2>
          @for (task of userTasks(); track task.id) {
            <div>{{ task.title }}</div>
          }
        </div>
      }
    </div>
  `
})
export class AdvancedExampleComponent implements OnInit {
  private authService = inject(AuthService);
  private taskService = inject(TaskService);

  // Local state
  isInitializing = signal(true);
  userTasks = signal<Task[]>([]);

  // Computed loading state from multiple services
  isLoading = computed(() =>
    this.authService.isLoading() || this.taskService.isLoading()
  );

  async ngOnInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize component with multiple async operations
   */
  async initialize(): Promise<void> {
    this.isInitializing.set(true);

    try {
      // Ensure user is authenticated
      if (!this.authService.isAuthenticated()) {
        await this.authService.getMeAsync();
      }

      // Load user's tasks
      const result = await this.taskService.listTasksAsync(1, 50);
      this.userTasks.set(result.items);
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      this.isInitializing.set(false);
    }
  }

  /**
   * Example: Error recovery pattern
   */
  async createTaskWithRetry(taskData: TaskCreate, maxRetries = 3): Promise<Task | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.taskService.createTaskAsync(taskData);
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          console.error('Max retries reached');
          return null;
        }

        // Wait before retrying (exponential backoff)
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    return null;
  }

  /**
   * Utility: Delay helper for async operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Example: Batch operations
   */
  async completeMultipleTasks(taskIds: string[]): Promise<void> {
    try {
      // Execute all completions in parallel
      const results = await Promise.all(
        taskIds.map(id => this.taskService.completeTaskAsync(id))
      );

      // Update local state
      this.userTasks.update(tasks =>
        tasks.map(task => {
          const updated = results.find(r => r.id === task.id);
          return updated || task;
        })
      );

      console.log(`Completed ${results.length} tasks`);
    } catch (error) {
      console.error('Failed to complete tasks:', error);
    }
  }

  /**
   * Example: Sequential operations with error handling
   */
  async processTasksSequentially(taskIds: string[]): Promise<void> {
    const results = {
      successful: [] as string[],
      failed: [] as string[]
    };

    for (const taskId of taskIds) {
      try {
        await this.taskService.completeTaskAsync(taskId);
        results.successful.push(taskId);
      } catch (error) {
        console.error(`Failed to process task ${taskId}:`, error);
        results.failed.push(taskId);
      }
    }

    console.log('Processing complete:', results);
  }
}

/**
 * Example 5: Form Integration with Async Services
 */
@Component({
  selector: 'app-form-example',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form (ngSubmit)="handleSubmit()">
      <input [(ngModel)]="taskTitle" name="taskTitle" placeholder="Task title" required />
      <textarea [(ngModel)]="taskDescription" name="taskDescription" placeholder="Description"></textarea>

      <button type="submit" [disabled]="taskService.isLoading()">
        @if (taskService.isLoading()) {
          Saving...
        } @else {
          Create Task
        }
      </button>

      @if (taskService.error()) {
        <div class="error">{{ taskService.error() }}</div>
      }
    </form>
  `
})
export class FormExampleComponent {
  protected taskService = inject(TaskService);
  private router = inject(Router);

  taskTitle = '';
  taskDescription = '';

  async handleSubmit(): Promise<void> {
    if (!this.taskTitle.trim()) {
      return;
    }

    const taskData: TaskCreate = {
      title: this.taskTitle,
      description: this.taskDescription,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING
    };

    try {
      const created = await this.taskService.createTaskAsync(taskData);

      // Reset form
      this.taskTitle = '';
      this.taskDescription = '';

      // Navigate to task detail
      await this.router.navigate(['/tasks', created.id]);
    } catch (error) {
      // Error is already in taskService.error()
      console.error('Failed to create task:', error);
    }
  }
}
