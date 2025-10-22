// Based on app/api/schemas/tag.py
export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
}
