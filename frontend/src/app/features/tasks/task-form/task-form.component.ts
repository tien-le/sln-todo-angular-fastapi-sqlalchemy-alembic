import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskPriority, TaskStatus } from '../../../models/task.model';
import { TaskService } from '../services/task.service';

@Component({
  selector: 'app-task-form',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css']
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Expose enums to template
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  taskForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  taskId = signal<string | null>(null);

  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(2000)],
      status: [TaskStatus.PENDING, Validators.required],
      priority: [TaskPriority.MEDIUM, Validators.required],
      due_date: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.taskId.set(id);
      this.loadTask(id);
    }
  }

  loadTask(taskId: string): void {
    this.loading.set(true);
    this.taskService.getTask(taskId).subscribe({
      next: (task) => {
        this.taskForm.patchValue({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load task');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.taskForm.value;
    const taskData = {
      ...formValue,
      due_date: formValue.due_date ? new Date(formValue.due_date).toISOString() : undefined
    };

    const request = this.isEditMode()
      ? this.taskService.updateTask(this.taskId()!, taskData)
      : this.taskService.createTask(taskData);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Failed to save task');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/tasks']);
  }
}
