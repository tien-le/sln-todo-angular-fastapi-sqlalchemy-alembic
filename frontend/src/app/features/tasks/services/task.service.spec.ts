import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Task, TaskCreate, TaskList, TaskPriority, TaskStatus, TaskUpdate } from '../../../models/task.model';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiBaseUrl}/tasks`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TaskService]
    });

    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listTasks', () => {
    it('should return a list of tasks with default pagination', () => {
      const mockResponse: TaskList = {
        items: [
          {
            id: '123',
            user_id: 'user123',
            title: 'Test Task',
            status: TaskStatus.PENDING,
            priority: TaskPriority.MEDIUM,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: []
          }
        ],
        total: 1,
        page: 1,
        page_size: 20,
        pages: 1
      };

      service.listTasks().subscribe(response => {
        expect(response.total).toBe(1);
        expect(response.items.length).toBe(1);
        expect(response.items[0].title).toBe('Test Task');
      });

      const req = httpMock.expectOne(`${apiUrl}?page=1&page_size=20`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should apply status filter', () => {
      const mockResponse: TaskList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        pages: 0
      };

      const filters = {
        status: TaskStatus.PENDING
      };

      service.listTasks(1, 20, filters).subscribe();

      const req = httpMock.expectOne(
        req => req.url === apiUrl &&
        req.params.has('status') &&
        req.params.get('status') === 'pending'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should apply priority filter', () => {
      const mockResponse: TaskList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        pages: 0
      };

      const filters = {
        priority: TaskPriority.HIGH
      };

      service.listTasks(1, 20, filters).subscribe();

      const req = httpMock.expectOne(
        req => req.url === apiUrl &&
        req.params.has('priority') &&
        req.params.get('priority') === 'high'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should apply search filter', () => {
      const mockResponse: TaskList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        pages: 0
      };

      const filters = {
        search: 'test query'
      };

      service.listTasks(1, 20, filters).subscribe();

      const req = httpMock.expectOne(
        req => req.url === apiUrl &&
        req.params.has('search') &&
        req.params.get('search') === 'test query'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should apply sort_by filter', () => {
      const mockResponse: TaskList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        pages: 0
      };

      const filters = {
        sort_by: '-created_at'
      };

      service.listTasks(1, 20, filters).subscribe();

      const req = httpMock.expectOne(
        req => req.url === apiUrl &&
        req.params.has('sort_by') &&
        req.params.get('sort_by') === '-created_at'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should apply multiple filters', () => {
      const mockResponse: TaskList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        pages: 0
      };

      const filters = {
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
        search: 'test'
      };

      service.listTasks(1, 20, filters).subscribe();

      const req = httpMock.expectOne(
        req => req.url === apiUrl &&
        req.params.has('status') &&
        req.params.has('priority') &&
        req.params.has('search')
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('pending');
      expect(req.request.params.get('priority')).toBe('high');
      expect(req.request.params.get('search')).toBe('test');
      req.flush(mockResponse);
    });

    it('should apply tag_ids filter', () => {
      const mockResponse: TaskList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        pages: 0
      };

      const filters = {
        tag_ids: ['tag1', 'tag2']
      };

      service.listTasks(1, 20, filters).subscribe();

      const req = httpMock.expectOne(
        req => req.url === apiUrl && (req.params?.getAll('tag_ids')?.length === 2 || false)
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.getAll('tag_ids')).toEqual(['tag1', 'tag2']);
      req.flush(mockResponse);
    });
  });

  describe('getTask', () => {
    it('should retrieve a specific task by ID', () => {
      const taskId = '123';
      const mockTask: Task = {
        id: taskId,
        user_id: 'user123',
        title: 'Test Task',
        description: 'Task description',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
      };

      service.getTask(taskId).subscribe(task => {
        expect(task.id).toBe(taskId);
        expect(task.title).toBe('Test Task');
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTask);
    });

    it('should handle 404 error when task not found', () => {
      const taskId = '999';

      service.getTask(taskId).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createTask', () => {
    it('should create a new task', () => {
      const newTask: TaskCreate = {
        title: 'New Task',
        description: 'Task description',
        priority: TaskPriority.HIGH
      };

      const mockResponse: Task = {
        id: '123',
        user_id: 'user123',
        title: 'New Task',
        description: 'Task description',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
      };

      service.createTask(newTask).subscribe(task => {
        expect(task.title).toBe('New Task');
        expect(task.priority).toBe(TaskPriority.HIGH);
        expect(task.id).toBe('123');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newTask);
      req.flush(mockResponse);
    });

    it('should create a task with minimal data', () => {
      const newTask: TaskCreate = {
        title: 'Minimal Task'
      };

      const mockResponse: Task = {
        id: '456',
        user_id: 'user123',
        title: 'Minimal Task',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
      };

      service.createTask(newTask).subscribe(task => {
        expect(task.title).toBe('Minimal Task');
        expect(task.status).toBe(TaskStatus.PENDING);
        expect(task.priority).toBe(TaskPriority.MEDIUM);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle validation errors', () => {
      const newTask: TaskCreate = {
        title: '' // Empty title should fail
      };

      service.createTask(newTask).subscribe({
        next: () => fail('should have failed with validation error'),
        error: (error) => {
          expect(error.status).toBe(422);
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ detail: 'Validation error' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', () => {
      const taskId = '123';
      const updates: TaskUpdate = {
        title: 'Updated Title',
        status: TaskStatus.IN_PROGRESS
      };

      const mockResponse: Task = {
        id: taskId,
        user_id: 'user123',
        title: 'Updated Title',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
      };

      service.updateTask(taskId, updates).subscribe(task => {
        expect(task.title).toBe('Updated Title');
        expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush(mockResponse);
    });

    it('should update only specified fields', () => {
      const taskId = '123';
      const updates: TaskUpdate = {
        status: TaskStatus.COMPLETED
      };

      const mockResponse: Task = {
        id: taskId,
        user_id: 'user123',
        title: 'Original Title',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
      };

      service.updateTask(taskId, updates).subscribe(task => {
        expect(task.status).toBe(TaskStatus.COMPLETED);
        expect(task.title).toBe('Original Title');
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });

    it('should handle 404 when updating non-existent task', () => {
      const taskId = '999';
      const updates: TaskUpdate = {
        title: 'Updated'
      };

      service.updateTask(taskId, updates).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', () => {
      const taskId = '123';

      service.deleteTask(taskId).subscribe(response => {
        // DELETE typically returns null or undefined
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle 404 when deleting non-existent task', () => {
      const taskId = '999';

      service.deleteTask(taskId).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('completeTask', () => {
    it('should mark a task as completed', () => {
      const taskId = '123';
      const mockResponse: Task = {
        id: taskId,
        user_id: 'user123',
        title: 'Test Task',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        tags: []
      };

      service.completeTask(taskId).subscribe(task => {
        expect(task.status).toBe(TaskStatus.COMPLETED);
        expect(task.completed_at).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}/complete`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle errors when completing task', () => {
      const taskId = '999';

      service.completeTask(taskId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}/complete`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('reopenTask', () => {
    it('should reopen a completed task', () => {
      const taskId = '123';
      const mockResponse: Task = {
        id: taskId,
        user_id: 'user123',
        title: 'Test Task',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: []
      };

      service.reopenTask(taskId).subscribe(task => {
        expect(task.status).toBe(TaskStatus.PENDING);
        expect(task.completed_at).toBeUndefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}/reopen`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle errors when reopening task', () => {
      const taskId = '999';

      service.reopenTask(taskId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}/reopen`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('signals', () => {
    it('should track loading state', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should track error state', () => {
      expect(service.error()).toBeNull();
    });

    it('should clear error when clearError is called', () => {
      const taskId = '999';

      service.getTask(taskId).subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(service.error()).toBeTruthy();
          service.clearError();
          expect(service.error()).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
      req.flush(
        { detail: 'Task not found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('async methods', () => {
    describe('listTasksAsync', () => {
      it('should list tasks using async/await', async () => {
        const mockResponse: TaskList = {
          items: [
            {
              id: '123',
              user_id: 'user123',
              title: 'Test Task',
              status: TaskStatus.PENDING,
              priority: TaskPriority.HIGH,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tags: []
            }
          ],
          total: 1,
          page: 1,
          page_size: 20,
          pages: 1
        };

        const promise = service.listTasksAsync(1, 20, { priority: TaskPriority.HIGH });
        const req = httpMock.expectOne(req =>
          req.url === apiUrl && req.params.get('priority') === 'high'
        );
        req.flush(mockResponse);

        const result = await promise;
        expect(result.items.length).toBe(1);
        expect(result.items[0].priority).toBe(TaskPriority.HIGH);
      });

      it('should handle errors in async list tasks', async () => {
        const promise = service.listTasksAsync();
        const req = httpMock.expectOne(`${apiUrl}?page=1&page_size=20`);
        req.flush(
          { detail: 'Server error' },
          { status: 500, statusText: 'Internal Server Error' }
        );

        await expectAsync(promise).toBeRejected();
        expect(service.error()).toBeTruthy();
      });
    });

    describe('getTaskAsync', () => {
      it('should get task using async/await', async () => {
        const taskId = '123';
        const mockTask: Task = {
          id: taskId,
          user_id: 'user123',
          title: 'Test Task',
          description: 'Description',
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: []
        };

        const promise = service.getTaskAsync(taskId);
        const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
        req.flush(mockTask);

        const task = await promise;
        expect(task.id).toBe(taskId);
        expect(task.title).toBe('Test Task');
      });
    });

    describe('createTaskAsync', () => {
      it('should create task using async/await', async () => {
        const taskData: TaskCreate = {
          title: 'New Task',
          description: 'Task description',
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING
        };

        const mockResponse: Task = {
          id: '123',
          user_id: 'user123',
          title: taskData.title,
          description: taskData.description,
          status: TaskStatus.PENDING,
          priority: TaskPriority.HIGH,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: []
        };

        const promise = service.createTaskAsync(taskData);
        const req = httpMock.expectOne(apiUrl);
        req.flush(mockResponse);

        const task = await promise;
        expect(task.title).toBe('New Task');
        expect(task.priority).toBe(TaskPriority.HIGH);
      });
    });

    describe('updateTaskAsync', () => {
      it('should update task using async/await', async () => {
        const taskId = '123';
        const updateData: TaskUpdate = {
          title: 'Updated Title',
          priority: TaskPriority.LOW
        };

        const mockResponse: Task = {
          id: taskId,
          user_id: 'user123',
          title: updateData.title!,
          status: TaskStatus.PENDING,
          priority: TaskPriority.LOW,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: []
        };

        const promise = service.updateTaskAsync(taskId, updateData);
        const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
        req.flush(mockResponse);

        const task = await promise;
        expect(task.title).toBe('Updated Title');
        expect(task.priority).toBe(TaskPriority.LOW);
      });
    });

    describe('deleteTaskAsync', () => {
      it('should delete task using async/await', async () => {
        const taskId = '123';

        const promise = service.deleteTaskAsync(taskId);
        const req = httpMock.expectOne(`${apiUrl}/${taskId}`);
        req.flush(null);

        await promise;
        // Should complete without error
        expect(true).toBe(true);
      });
    });

    describe('completeTaskAsync', () => {
      it('should complete task using async/await', async () => {
        const taskId = '123';
        const mockResponse: Task = {
          id: taskId,
          user_id: 'user123',
          title: 'Test Task',
          status: TaskStatus.COMPLETED,
          priority: TaskPriority.MEDIUM,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          tags: []
        };

        const promise = service.completeTaskAsync(taskId);
        const req = httpMock.expectOne(`${apiUrl}/${taskId}/complete`);
        req.flush(mockResponse);

        const task = await promise;
        expect(task.status).toBe(TaskStatus.COMPLETED);
        expect(task.completed_at).toBeDefined();
      });
    });

    describe('reopenTaskAsync', () => {
      it('should reopen task using async/await', async () => {
        const taskId = '123';
        const mockResponse: Task = {
          id: taskId,
          user_id: 'user123',
          title: 'Test Task',
          status: TaskStatus.PENDING,
          priority: TaskPriority.MEDIUM,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: []
        };

        const promise = service.reopenTaskAsync(taskId);
        const req = httpMock.expectOne(`${apiUrl}/${taskId}/reopen`);
        req.flush(mockResponse);

        const task = await promise;
        expect(task.status).toBe(TaskStatus.PENDING);
      });
    });
  });
});
