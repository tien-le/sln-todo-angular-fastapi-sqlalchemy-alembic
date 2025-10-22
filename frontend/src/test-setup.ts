/**
 * Test Setup File
 * This file is loaded before all tests and sets up the testing environment.
 */

// Import zone.js for async operations
import 'zone.js';
import 'zone.js/testing';

// Import Jasmine for testing framework
import { getTestBed } from '@angular/core/testing';
import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Import types for test factories
import { Task, TaskList, TaskPriority, TaskStatus } from './app/models/task.model';
import { User } from './app/models/user.model';

// First, initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

/**
 * Custom matchers for better test assertions
 */
beforeEach(() => {
  jasmine.addMatchers({
    // Add custom matchers here if needed
    toContainText: () => ({
      compare: (actual: unknown, expected: string) => {
        const element = actual as { textContent?: string; innerText?: string };
        const actualText = element.textContent || element.innerText || '';
        const pass = actualText.includes(expected);
        return {
          pass,
          message: pass
            ? `Expected element not to contain text "${expected}"`
            : `Expected element to contain text "${expected}", but got "${actualText}"`
        };
      }
    })
  });
});

/**
 * Global test configuration
 */
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

/**
 * Console error handler for tests
 * Suppress expected console errors from test scenarios
 */
const originalConsoleError = console.error;
console.error = function(...args: unknown[]) {
  // Filter out known Angular warnings and expected test errors
  const message = args[0]?.toString() || '';
  const ignoredMessages = [
    'Navigation triggered outside Angular zone',
    'NG0', // Angular error codes can be inspected separately
    'HTTP Error:', // Expected errors from error interceptor tests
  ];

  const shouldIgnore = ignoredMessages.some(ignored => message.includes(ignored));

  if (!shouldIgnore) {
    originalConsoleError.apply(console, args);
    // Uncomment to fail tests on console.error
    // fail('Console error: ' + message);
  }
};

/**
 * Clean up after each test
 */
afterEach(() => {
  // Clear localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();

  // Reset any global state if needed
});

/**
 * Test utilities
 */
export class TestUtils {
  /**
   * Wait for async operations to complete
   */
  static async waitForAsync(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mock localStorage
   */
  static mockLocalStorage(): Storage {
    const store: { [key: string]: string } = {};
    return {
      length: Object.keys(store).length,
      clear: () => {
        Object.keys(store).forEach(key => delete store[key]);
      },
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      key: (index: number) => Object.keys(store)[index] || null
    };
  }

  /**
   * Create a spy object with specific methods
   */
  static createSpyObj<T>(baseName: string, methods: (keyof T)[]): jasmine.SpyObj<T> {
    return jasmine.createSpyObj(baseName, methods as string[]);
  }

  /**
   * Get element text content
   */
  static getTextContent(element: HTMLElement): string {
    return element.textContent?.trim() || '';
  }

  /**
   * Query selector helper
   */
  static query<T extends HTMLElement>(element: HTMLElement, selector: string): T | null {
    return element.querySelector<T>(selector);
  }

  /**
   * Query selector all helper
   */
  static queryAll<T extends HTMLElement>(element: HTMLElement, selector: string): T[] {
    return Array.from(element.querySelectorAll<T>(selector));
  }
}

/**
 * Test data factories
 */
export class TestDataFactory {
  static createMockUser(overrides?: Partial<User>): User {
    return {
      id: '123',
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      is_superuser: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createMockTask(overrides?: Partial<Task>): Task {
    return {
      id: '1',
      user_id: 'user1',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [],
      ...overrides
    };
  }

  static createMockTaskList(items: Task[] = [], overrides?: Partial<TaskList>): TaskList {
    return {
      items,
      total: items.length,
      page: 1,
      page_size: 20,
      pages: Math.ceil(items.length / 20),
      ...overrides
    };
  }
}

/**
 * Async test helpers
 */
export function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => {
    Promise.resolve().then(() => resolve());
  });
}

/**
 * Component test helpers
 */
export function triggerEvent(element: HTMLElement, eventName: string): void {
  const event = new Event(eventName, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

export function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  triggerEvent(input, 'input');
  triggerEvent(input, 'blur');
}

/**
 * Export commonly used testing utilities
 */
export const testUtils = TestUtils;
export const testDataFactory = TestDataFactory;
