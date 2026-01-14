import type { ApiResult, ApiResponse, ApiError } from '@chef-app/shared';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data: ApiResult<T> = await response.json();

    if (!data.success) {
      const error = data as ApiError;
      throw new Error(error.error.message);
    }

    return (data as ApiResponse<T>).data;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // File upload for recipe cover images
  async upload(files: File[]): Promise<{ files: Array<{ id: string; filePath: string; originalName: string }> }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error.message);
    }
    return data.data;
  }

  // File upload for step images (up to 3 images)
  async uploadStepImage(files: File[]): Promise<{ files: Array<{ id: string; filePath: string; originalName: string }> }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_BASE}/upload/step-image`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error.message);
    }
    return data.data;
  }
}

export const api = new ApiClient();
