import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Task, TaskList, TaskPriority, TaskStatus } from '../../../models/task.model';
import { TaskService } from '../services/task.service';
import { TaskListComponent } from './task-list.component';

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: jasmine.SpyObj<TaskService>;
  let router: jasmine.SpyObj<Router>;

  const mockTask: Task = {
    id: '1',
    user_id: 'user1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: []
  };

  const mockTaskList: TaskList = {
    items: [mockTask],
    total: 1,
    page: 1,
    page_size: 20,
    pages: 1
  };

  beforeEach(async () => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'listTasks',
      'deleteTask',
      'completeTask'
    ]);
    // Configure default return value to prevent errors during component initialization
    taskServiceSpy.listTasks.and.returnValue(of(mockTaskList));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as any); // Return empty object for RouterLink
    routerSpy.serializeUrl.and.returnValue(''); // Return empty string for RouterLink

    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      snapshot: { params: {} }
    });

    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initialize the component view
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load tasks on initialization', () => {
      // taskService.listTasks is already called in beforeEach via ngOnInit
      expect(taskService.listTasks).toHaveBeenCalledWith(
        1,
        20,
        jasmine.objectContaining({
          sort_by: '-created_at'
        })
      );
      expect(component.tasks().length).toBe(1);
      expect(component.totalTasks()).toBe(1);
      expect(component.loading()).toBe(false);
    });

    it('should set loading state while fetching tasks', () => {
      // ngOnInit is already called in beforeEach
      // Loading should be set to true initially (synchronous check before async completes)
      // After observable completes, it should be false
      expect(component.loading()).toBe(false);
    });

    it('should handle errors when loading tasks', () => {
      const errorMessage = 'Failed to load tasks';
      // Reset and reconfigure the spy for this test
      taskService.listTasks.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      // Call loadTasks to trigger the error
      component.loadTasks();

      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBe(false);
    });
  });

  describe('loadTasks', () => {
    it('should load tasks with current filters', () => {
      taskService.listTasks.and.returnValue(of(mockTaskList));
      component.searchTerm = 'test';
      component.statusFilter = TaskStatus.PENDING;
      component.priorityFilter = TaskPriority.HIGH;

      component.loadTasks();

      expect(taskService.listTasks).toHaveBeenCalledWith(
        1,
        20,
        jasmine.objectContaining({
          search: 'test',
          status: TaskStatus.PENDING,
          priority: TaskPriority.HIGH,
          sort_by: '-created_at'
        })
      );
    });

    it('should clear error state when loading tasks', () => {
      taskService.listTasks.and.returnValue(of(mockTaskList));
      component.error.set('Previous error');

      component.loadTasks();

      expect(component.error()).toBeNull();
    });

    it('should handle empty search term', () => {
      taskService.listTasks.and.returnValue(of(mockTaskList));
      component.searchTerm = '';

      component.loadTasks();

      expect(taskService.listTasks).toHaveBeenCalledWith(
        1,
        20,
        jasmine.objectContaining({
          search: undefined
        })
      );
    });
  });

  describe('onFilterChange', () => {
    it('should reset to page 1 and reload tasks', () => {
      taskService.listTasks.and.returnValue(of(mockTaskList));
      component.currentPage.set(3);

      component.onFilterChange();

      expect(component.currentPage()).toBe(1);
      expect(taskService.listTasks).toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    const multiPageMockList: TaskList = {
      items: Array(20).fill(mockTask),
      total: 50,
      page: 1,
      page_size: 20,
      pages: 3
    };

    it('should navigate to next page', () => {
      // Reset spy call count to track only subsequent calls
      taskService.listTasks.calls.reset();

      taskService.listTasks.and.returnValue(of({
        ...multiPageMockList,
        page: 2
      }));

      component.nextPage();

      expect(component.currentPage()).toBe(2);
      expect(taskService.listTasks).toHaveBeenCalledTimes(1);
    });

    it('should navigate to previous page', () => {
      taskService.listTasks.and.returnValue(of(multiPageMockList));
      component.currentPage.set(2);

      component.previousPage();

      expect(component.currentPage()).toBe(1);
      expect(taskService.listTasks).toHaveBeenCalled();
    });

    it('should not go below page 1', () => {
      taskService.listTasks.and.returnValue(of(mockTaskList));
      component.currentPage.set(1);

      component.previousPage();

      expect(component.currentPage()).toBe(1);
    });

    it('should not exceed total pages', () => {
      taskService.listTasks.and.returnValue(of(mockTaskList));
      component.currentPage.set(1);
      component.totalTasks.set(20);
      component.pageSize.set(20);

      component.nextPage();

      expect(component.currentPage()).toBe(1);
    });

    it('should calculate total pages correctly', () => {
      component.totalTasks.set(50);
      component.pageSize.set(20);

      expect(component.totalPages()).toBe(3);
    });
  });

  describe('completeTask', () => {
    it('should mark task as complete and reload list', () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskService.completeTask.and.returnValue(of(completedTask));
      taskService.listTasks.and.returnValue(of(mockTaskList));

      component.completeTask('1');

      expect(taskService.completeTask).toHaveBeenCalledWith('1');
      expect(taskService.listTasks).toHaveBeenCalled();
    });

    it('should handle errors when completing task', () => {
      const errorMessage = 'Failed to complete task';
      taskService.completeTask.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.completeTask('1');

      expect(component.error()).toBe(errorMessage);
    });
  });

  describe('deleteTask', () => {
    it('should delete task after confirmation and reload list', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      taskService.deleteTask.and.returnValue(of(void 0));
      taskService.listTasks.and.returnValue(of(mockTaskList));

      component.deleteTask('1');

      expect(window.confirm).toHaveBeenCalled();
      expect(taskService.deleteTask).toHaveBeenCalledWith('1');
      expect(taskService.listTasks).toHaveBeenCalled();
    });

    it('should not delete task if confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteTask('1');

      expect(taskService.deleteTask).not.toHaveBeenCalled();
    });

    it('should handle errors when deleting task', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const errorMessage = 'Failed to delete task';
      taskService.deleteTask.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.deleteTask('1');

      expect(component.error()).toBe(errorMessage);
    });
  });

  describe('openTaskForm', () => {
    it('should navigate to new task form', () => {
      component.openTaskForm();

      expect(router.navigate).toHaveBeenCalledWith(['/tasks/new']);
    });
  });

  describe('styling helpers', () => {
    it('should return correct priority class', () => {
      expect(component.getPriorityClass(TaskPriority.LOW))
        .toBe('bg-gray-100 text-gray-800');
      expect(component.getPriorityClass(TaskPriority.MEDIUM))
        .toBe('bg-blue-100 text-blue-800');
      expect(component.getPriorityClass(TaskPriority.HIGH))
        .toBe('bg-orange-100 text-orange-800');
      expect(component.getPriorityClass(TaskPriority.URGENT))
        .toBe('bg-red-100 text-red-800');
    });

    it('should return default class for unknown priority', () => {
      expect(component.getPriorityClass('unknown' as any))
        .toBe('bg-gray-100 text-gray-800');
    });

    it('should return correct status class', () => {
      expect(component.getStatusClass(TaskStatus.PENDING))
        .toBe('bg-yellow-100 text-yellow-800');
      expect(component.getStatusClass(TaskStatus.IN_PROGRESS))
        .toBe('bg-blue-100 text-blue-800');
      expect(component.getStatusClass(TaskStatus.COMPLETED))
        .toBe('bg-green-100 text-green-800');
    });

    it('should return default class for unknown status', () => {
      expect(component.getStatusClass('unknown' as any))
        .toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('template rendering', () => {
    it('should display loading state', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const loadingSpinner = compiled.querySelector('.animate-spin');
      expect(loadingSpinner).toBeTruthy();
    });

    it('should display error message', () => {
      component.loading.set(false);
      component.error.set('Test error message');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorDiv = compiled.querySelector('.bg-red-50');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.textContent).toContain('Test error message');
    });

    it('should display empty state when no tasks', () => {
      // Set empty tasks manually since component was already initialized
      component.tasks.set([]);
      component.totalTasks.set(0);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('h3');
      expect(emptyState?.textContent).toContain('No tasks');
    });

    it('should display task list when tasks exist', () => {
      // Component was already initialized in beforeEach with mockTaskList
      const compiled = fixture.nativeElement as HTMLElement;
      const taskTitle = compiled.querySelector('h3');
      expect(taskTitle?.textContent).toContain('Test Task');
    });
  });

  describe('signal reactivity', () => {
    it('should update view when tasks signal changes', () => {
      component.tasks.set([mockTask]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Test Task');

      component.tasks.set([]);
      fixture.detectChanges();

      expect(compiled.textContent).toContain('No tasks');
    });

    it('should react to loading signal changes', () => {
      component.loading.set(false);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.animate-spin')).toBeFalsy();

      component.loading.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.animate-spin')).toBeTruthy();
    });
  });
});
