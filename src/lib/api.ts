const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

interface BillSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  items: BillItem[];
  friends: Friend[];
  splits: BillSplit[];
  status: 'draft' | 'calculated' | 'completed';
  totalAmount?: number;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  sharedWith: string[];
}

interface Friend {
  id: string;
  name: string;
  color?: string;
}

interface BillSplit {
  friendId: string;
  friendName: string;
  amount: number;
}

interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }

  // Bill session management
  async createBillSession(): Promise<ApiResponse<BillSession>> {
    return this.request('/bills/session', {
      method: 'POST',
    });
  }

  async getBillSession(sessionId: string): Promise<ApiResponse<BillSession>> {
    return this.request(`/bills/session/${sessionId}`);
  }

  async updateSessionItems(
    sessionId: string,
    items: BillItem[]
  ): Promise<ApiResponse<BillSession>> {
    return this.request(`/bills/session/${sessionId}/items`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  async updateSessionFriends(
    sessionId: string,
    friends: Friend[]
  ): Promise<ApiResponse<BillSession>> {
    return this.request(`/bills/session/${sessionId}/friends`, {
      method: 'PUT',
      body: JSON.stringify({ friends }),
    });
  }

  async calculateBillSplit(sessionId: string): Promise<ApiResponse<{
    session: BillSession;
    calculation: {
      totalBill: number;
      splits: BillSplit[];
      calculatedAt: string;
    };
  }>> {
    return this.request(`/bills/session/${sessionId}/calculate`, {
      method: 'POST',
    });
  }

  // Bill management
  async saveBill(billData: {
    items: BillItem[];
    friends: Friend[];
    sessionId?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  }

  async getBills(page: number = 1, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request(`/bills?page=${page}&limit=${limit}`);
  }

  async getBill(billId: string): Promise<ApiResponse<any>> {
    return this.request(`/bills/${billId}`);
  }

  async deleteBill(billId: string): Promise<ApiResponse<any>> {
    return this.request(`/bills/${billId}`, {
      method: 'DELETE',
    });
  }

  // File upload
  async uploadReceipt(file: File): Promise<ApiResponse<UploadedFile>> {
    const formData = new FormData();
    formData.append('receipt', file);

    return this.request('/upload/receipt', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async getFileInfo(fileId: string): Promise<ApiResponse<UploadedFile>> {
    return this.request(`/upload/file/${fileId}`);
  }

  async deleteFile(fileId: string): Promise<ApiResponse<any>> {
    return this.request(`/upload/file/${fileId}`, {
      method: 'DELETE',
    });
  }

  async cleanupOldFiles(olderThanDays: number = 7): Promise<ApiResponse<any>> {
    return this.request('/upload/cleanup', {
      method: 'POST',
      body: JSON.stringify({ olderThanDays }),
    });
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type {
  ApiResponse,
  BillSession,
  BillItem,
  Friend,
  BillSplit,
  UploadedFile,
};