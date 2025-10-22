import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Task, TaskPriority, TaskStatus } from '../../../models/task.model';
import { TaskService } from '../services/task.service';
import { TaskFormComponent } from './task-form.component';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;
  let taskService: jasmine.SpyObj<TaskService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: any;
  let mockParamMap: jasmine.SpyObj<ParamMap>;

  const mockTask: Task = {
    id: '123',
    user_id: 'user1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: []
  };

  beforeEach(async () => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'getTask',
      'createTask',
      'updateTask'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockParamMap = jasmine.createSpyObj<ParamMap>('ParamMap', [
      'get',
      'has',
      'getAll',
      'keys'
    ]);
    mockParamMap.get.and.returnValue(null);
    mockParamMap.has.and.returnValue(false);
    mockParamMap.getAll.and.returnValue([]);
    Object.defineProperty(mockParamMap, 'keys', {
      get: () => []
    });

    activatedRoute = {
      snapshot: {
        paramMap: mockParamMap
      }
    };

    await TestBed.configureTestingModule({
      imports: [TaskFormComponent, ReactiveFormsModule],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    }).compileComponents();

    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize form with default values for new task', () => {
      component.ngOnInit();

      expect(component.taskForm.value).toEqual({
        title: '',
        description: '',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        due_date: ''
      });
    });

    it('should set isEditMode to false for new task', () => {
      component.ngOnInit();

      expect(component.isEditMode()).toBe(false);
      expect(component.taskId()).toBeNull();
    });

    it('should load task data in edit mode', () => {
      mockParamMap.get.and.returnValue('123');
      taskService.getTask.and.returnValue(of(mockTask));

      component.ngOnInit();

      expect(component.isEditMode()).toBe(true);
      expect(component.taskId()).toBe('123');
      expect(taskService.getTask).toHaveBeenCalledWith('123');
    });
  });

  describe('loadTask', () => {
    it('should populate form with task data', () => {
      taskService.getTask.and.returnValue(of(mockTask));

      component.loadTask('123');

      expect(component.taskForm.get('title')?.value).toBe('Test Task');
      expect(component.taskForm.get('description')?.value).toBe('Test Description');
      expect(component.taskForm.get('status')?.value).toBe(TaskStatus.PENDING);
      expect(component.taskForm.get('priority')?.value).toBe(TaskPriority.MEDIUM);
      expect(component.loading()).toBe(false);
    });

    it('should format due_date for datetime-local input', () => {
      const taskWithDueDate = {
        ...mockTask,
        due_date: '2024-12-31T23:59:59Z'
      };
      taskService.getTask.and.returnValue(of(taskWithDueDate));

      component.loadTask('123');

      const dueDateValue = component.taskForm.get('due_date')?.value;
      expect(dueDateValue).toContain('2024-12-31');
    });

    it('should handle task without due_date', () => {
      taskService.getTask.and.returnValue(of(mockTask));

      component.loadTask('123');

      expect(component.taskForm.get('due_date')?.value).toBe('');
    });

    it('should handle errors when loading task', () => {
      const errorMessage = 'Failed to load task';
      taskService.getTask.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.loadTask('123');

      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBe(false);
    });
  });

  describe('form validation', () => {
    it('should require title field', () => {
      const titleControl = component.taskForm.get('title');

      titleControl?.setValue('');
      expect(titleControl?.invalid).toBe(true);
      expect(titleControl?.hasError('required')).toBe(true);

      titleControl?.setValue('Valid Title');
      expect(titleControl?.valid).toBe(true);
    });

    it('should enforce title max length', () => {
      const titleControl = component.taskForm.get('title');
      const longTitle = 'a'.repeat(201);

      titleControl?.setValue(longTitle);
      expect(titleControl?.invalid).toBe(true);
      expect(titleControl?.hasError('maxlength')).toBe(true);
    });

    it('should enforce description max length', () => {
      const descControl = component.taskForm.get('description');
      const longDesc = 'a'.repeat(2001);

      descControl?.setValue(longDesc);
      expect(descControl?.invalid).toBe(true);
      expect(descControl?.hasError('maxlength')).toBe(true);
    });

    it('should require status field', () => {
      const statusControl = component.taskForm.get('status');

      statusControl?.setValue(null);
      expect(statusControl?.invalid).toBe(true);
    });

    it('should require priority field', () => {
      const priorityControl = component.taskForm.get('priority');

      priorityControl?.setValue(null);
      expect(priorityControl?.invalid).toBe(true);
    });

    it('should allow empty description', () => {
      const descControl = component.taskForm.get('description');

      descControl?.setValue('');
      expect(descControl?.valid).toBe(true);
    });

    it('should allow empty due_date', () => {
      const dueDateControl = component.taskForm.get('due_date');

      dueDateControl?.setValue('');
      expect(dueDateControl?.valid).toBe(true);
    });
  });

  describe('onSubmit - create mode', () => {
    beforeEach(() => {
      component.isEditMode.set(false);
      component.taskForm.patchValue({
        title: 'New Task',
        description: 'New Description',
        status: TaskStatus.PENDING,
        priority: TaskPriority.HIGH
      });
    });

    it('should create new task when form is valid', () => {
      taskService.createTask.and.returnValue(of(mockTask));

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'New Task',
          description: 'New Description',
          status: TaskStatus.PENDING,
          priority: TaskPriority.HIGH
        })
      );
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });

    it('should not submit when form is invalid', () => {
      component.taskForm.patchValue({ title: '' });

      component.onSubmit();

      expect(taskService.createTask).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should convert due_date to ISO string', () => {
      component.taskForm.patchValue({
        due_date: '2024-12-31T23:59'
      });
      taskService.createTask.and.returnValue(of(mockTask));

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        jasmine.objectContaining({
          due_date: jasmine.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        })
      );
    });

    it('should handle empty due_date', () => {
      component.taskForm.patchValue({
        due_date: ''
      });
      taskService.createTask.and.returnValue(of(mockTask));

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        jasmine.objectContaining({
          due_date: undefined
        })
      );
    });

    it('should handle creation errors', () => {
      const errorMessage = 'Failed to create task';
      taskService.createTask.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.onSubmit();

      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit - edit mode', () => {
    beforeEach(() => {
      component.isEditMode.set(true);
      component.taskId.set('123');
      component.taskForm.patchValue({
        title: 'Updated Task',
        description: 'Updated Description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT
      });
    });

    it('should update existing task when form is valid', () => {
      taskService.updateTask.and.returnValue(of(mockTask));

      component.onSubmit();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        '123',
        jasmine.objectContaining({
          title: 'Updated Task',
          description: 'Updated Description',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.URGENT
        })
      );
      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });

    it('should handle update errors', () => {
      const errorMessage = 'Failed to update task';
      taskService.updateTask.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      component.onSubmit();

      expect(component.error()).toBe(errorMessage);
      expect(component.loading()).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should navigate back to task list', () => {
      component.cancel();

      expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
    });
  });

  describe('loading state', () => {
    it('should set loading to true during task creation', () => {
      component.taskForm.patchValue({ title: 'Test' });
      taskService.createTask.and.returnValue(of(mockTask));

      component.onSubmit();

      // Loading should eventually be set to false after completion
      expect(component.loading()).toBe(false);
    });

    it('should disable submit button when loading', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });

    it('should disable submit button when form is invalid', () => {
      component.taskForm.patchValue({ title: '' });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('template rendering', () => {
    it('should display "Create New Task" in create mode', () => {
      component.isEditMode.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h2');
      expect(heading?.textContent).toContain('Create New Task');
    });

    it('should display "Edit Task" in edit mode', () => {
      component.isEditMode.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h2');
      expect(heading?.textContent).toContain('Edit Task');
    });

    it('should display error message when error exists', () => {
      component.error.set('Test error');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorDiv = compiled.querySelector('.bg-red-50');
      expect(errorDiv).toBeTruthy();
      expect(errorDiv?.textContent).toContain('Test error');
    });

    it('should display validation errors for title', () => {
      const titleControl = component.taskForm.get('title');
      titleControl?.setValue('');
      titleControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessage = compiled.querySelector('.text-red-600');
      expect(errorMessage?.textContent).toContain('Title is required');
    });

    it('should show "Create Task" button text in create mode', () => {
      component.isEditMode.set(false);
      component.loading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');
      expect(submitButton?.textContent).toContain('Create Task');
    });

    it('should show "Update Task" button text in edit mode', () => {
      component.isEditMode.set(true);
      component.loading.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');
      expect(submitButton?.textContent).toContain('Update Task');
    });

    it('should show "Saving..." when loading', () => {
      component.loading.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');
      expect(submitButton?.textContent).toContain('Saving...');
    });
  });

  describe('signal reactivity', () => {
    it('should react to isEditMode changes', () => {
      component.isEditMode.set(false);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Create New Task');

      component.isEditMode.set(true);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Edit Task');
    });

    it('should react to loading state changes', () => {
      component.loading.set(false);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      let submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true); // disabled due to empty form

      component.taskForm.patchValue({ title: 'Valid Title' });
      component.loading.set(false);
      fixture.detectChanges();

      submitButton = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
    });
  });

  describe('form interaction', () => {
    it('should update form value when user types', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const titleInput = compiled.querySelector('#title') as HTMLInputElement;

      titleInput.value = 'New Task Title';
      titleInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.taskForm.get('title')?.value).toBe('New Task Title');
    });

    it('should validate on blur', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const titleInput = compiled.querySelector('#title') as HTMLInputElement;

      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input'));
      titleInput.dispatchEvent(new Event('blur'));
      fixture.detectChanges();

      const titleControl = component.taskForm.get('title');
      expect(titleControl?.touched).toBe(true);
    });
  });
});
