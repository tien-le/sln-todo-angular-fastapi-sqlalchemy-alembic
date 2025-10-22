import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Task, TaskFilters, TaskPriority, TaskStatus } from '../../../models/task.model';
import { TaskService } from '../services/task.service';

@Component({
  selector: 'app-task-list',
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private router = inject(Router);

  // Expose enums to template
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;
  Math = Math;

  // Signals for state management
  tasks = signal<Task[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(1);
  pageSize = signal(20);
  totalTasks = signal(0);
  totalPages = computed(() => Math.ceil(this.totalTasks() / this.pageSize()));

  // Filter state
  searchTerm = '';
  statusFilter?: TaskStatus;
  priorityFilter?: TaskPriority;
  sortBy = '-created_at';

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: TaskFilters = {
      search: this.searchTerm || undefined,
      status: this.statusFilter,
      priority: this.priorityFilter,
      sort_by: this.sortBy
    };

    this.taskService.listTasks(this.currentPage(), this.pageSize(), filters).subscribe({
      next: (response) => {
        this.tasks.set(response.items);
        this.totalTasks.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load tasks');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadTasks();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadTasks();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadTasks();
    }
  }

  completeTask(taskId: string): void {
    this.taskService.completeTask(taskId).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to complete task');
      }
    });
  }

  deleteTask(taskId: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => {
          this.loadTasks();
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to delete task');
        }
      });
    }
  }

  openTaskForm(): void {
    this.router.navigate(['/tasks/new']);
  }

  getPriorityClass(priority: TaskPriority): string {
    const classes = {
      [TaskPriority.LOW]: 'bg-gray-100 text-gray-800',
      [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
      [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
      [TaskPriority.URGENT]: 'bg-red-100 text-red-800'
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(status: TaskStatus): string {
    const classes = {
      [TaskStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }
}
