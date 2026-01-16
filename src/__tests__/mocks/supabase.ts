import { vi } from 'vitest';

/**
 * Supabase Mock for Unit Tests
 *
 * Includes:
 * - Client mock
 * - Auth mock
 * - Database query mock
 * - Realtime channel mock
 * - Storage mock
 */

// ============================================
// Types
// ============================================

export type MockQueryResult<T = unknown> = {
  data: T | null;
  error: Error | null;
  count?: number;
};

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimePayload<T = unknown> {
  eventType: RealtimeEventType;
  new: T;
  old: T | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// ============================================
// Realtime Channel Mock
// ============================================

export const createRealtimeChannelMock = () => {
  const subscribers: Map<string, ((payload: RealtimePayload) => void)[]> = new Map();
  let subscribeCallback: (() => void) | null = null;
  let status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' = 'CLOSED';

  const channelMock = {
    on: vi.fn((event: string, filter: unknown, callback: (payload: RealtimePayload) => void) => {
      const key = typeof filter === 'object' ? JSON.stringify(filter) : String(filter);
      if (!subscribers.has(key)) {
        subscribers.set(key, []);
      }
      subscribers.get(key)!.push(callback);
      return channelMock;
    }),

    subscribe: vi.fn((callback?: (status: string) => void) => {
      status = 'SUBSCRIBED';
      if (callback) {
        subscribeCallback = () => callback('SUBSCRIBED');
        // Simulate async subscription
        setTimeout(() => subscribeCallback?.(), 0);
      }
      return channelMock;
    }),

    unsubscribe: vi.fn(() => {
      status = 'CLOSED';
      subscribers.clear();
      return Promise.resolve();
    }),

    // Helper to simulate receiving an event
    _emit: (payload: RealtimePayload) => {
      subscribers.forEach((callbacks) => {
        callbacks.forEach((cb) => cb(payload));
      });
    },

    // Helper to simulate connection error
    _simulateError: () => {
      status = 'CHANNEL_ERROR';
    },

    // Helper to get current status
    _getStatus: () => status,
  };

  return channelMock;
};

// ============================================
// Database Query Builder Mock
// ============================================

export const createQueryBuilderMock = <T = unknown>(defaultData: T | null = null) => {
  let result: MockQueryResult<T> = { data: defaultData, error: null };

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(result)),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(result)),
    then: vi.fn().mockImplementation((resolve) => resolve(result)),

    // Helper to set mock result
    _setResult: (data: T | null, error: Error | null = null) => {
      result = { data, error };
    },

    // Helper to set error
    _setError: (error: Error) => {
      result = { data: null, error };
    },
  };

  return queryBuilder;
};

// ============================================
// Auth Mock
// ============================================

export const createAuthMock = () => {
  let currentUser: { id: string; email: string; role?: string } | null = null;
  let currentSession: { access_token: string; refresh_token: string } | null = null;

  return {
    getUser: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data: { user: currentUser },
        error: null,
      })
    ),

    getSession: vi.fn().mockImplementation(() =>
      Promise.resolve({
        data: { session: currentSession },
        error: null,
      })
    ),

    signInWithPassword: vi.fn().mockImplementation(({ email }: { email: string }) => {
      currentUser = { id: 'mock-user-id', email };
      currentSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' };
      return Promise.resolve({
        data: { user: currentUser, session: currentSession },
        error: null,
      });
    }),

    signUp: vi.fn().mockImplementation(({ email }: { email: string }) => {
      currentUser = { id: 'new-user-id', email };
      return Promise.resolve({
        data: { user: currentUser, session: null },
        error: null,
      });
    }),

    signOut: vi.fn().mockImplementation(() => {
      currentUser = null;
      currentSession = null;
      return Promise.resolve({ error: null });
    }),

    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),

    // Helpers
    _setUser: (user: { id: string; email: string; role?: string } | null) => {
      currentUser = user;
    },

    _setSession: (session: { access_token: string; refresh_token: string } | null) => {
      currentSession = session;
    },
  };
};

// ============================================
// Storage Mock
// ============================================

export const createStorageMock = () => {
  const files: Map<string, { data: Blob; contentType: string }> = new Map();

  return {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn().mockImplementation((path: string, file: Blob) => {
        files.set(`${bucket}/${path}`, { data: file, contentType: 'application/octet-stream' });
        return Promise.resolve({ data: { path }, error: null });
      }),

      download: vi.fn().mockImplementation((path: string) => {
        const file = files.get(`${bucket}/${path}`);
        if (file) {
          return Promise.resolve({ data: file.data, error: null });
        }
        return Promise.resolve({ data: null, error: new Error('File not found') });
      }),

      remove: vi.fn().mockImplementation((paths: string[]) => {
        paths.forEach((path) => files.delete(`${bucket}/${path}`));
        return Promise.resolve({ data: paths, error: null });
      }),

      getPublicUrl: vi.fn().mockImplementation((path: string) => ({
        data: { publicUrl: `https://mock-storage.supabase.co/${bucket}/${path}` },
      })),

      createSignedUrl: vi.fn().mockImplementation((path: string) =>
        Promise.resolve({
          data: { signedUrl: `https://mock-storage.supabase.co/${bucket}/${path}?token=mock` },
          error: null,
        })
      ),

      list: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: Array.from(files.keys())
            .filter((key) => key.startsWith(bucket))
            .map((key) => ({ name: key.replace(`${bucket}/`, '') })),
          error: null,
        })
      ),
    })),

    // Helper to clear all files
    _clear: () => files.clear(),
  };
};

// ============================================
// Complete Supabase Client Mock
// ============================================

export const createSupabaseMock = () => {
  const authMock = createAuthMock();
  const storageMock = createStorageMock();
  const channelMocks: Map<string, ReturnType<typeof createRealtimeChannelMock>> = new Map();

  return {
    auth: authMock,
    storage: storageMock,

    from: vi.fn((table: string) => createQueryBuilderMock()),

    rpc: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),

    channel: vi.fn((name: string) => {
      if (!channelMocks.has(name)) {
        channelMocks.set(name, createRealtimeChannelMock());
      }
      return channelMocks.get(name)!;
    }),

    removeChannel: vi.fn((channel: ReturnType<typeof createRealtimeChannelMock>) => {
      channel.unsubscribe();
      return Promise.resolve();
    }),

    // Helper to get a specific channel mock
    _getChannel: (name: string) => channelMocks.get(name),

    // Helper to emit event to a channel
    _emitToChannel: (name: string, payload: RealtimePayload) => {
      const channel = channelMocks.get(name);
      if (channel) {
        channel._emit(payload);
      }
    },
  };
};

// ============================================
// Mock Helper Functions
// ============================================

/**
 * Create a mock Realtime event payload
 */
export const createRealtimePayload = <T>(
  table: string,
  eventType: RealtimeEventType,
  newData: T,
  oldData: T | null = null
): RealtimePayload<T> => ({
  eventType,
  new: newData,
  old: oldData,
  schema: 'public',
  table,
  commit_timestamp: new Date().toISOString(),
});

/**
 * Mock user factory
 */
export const createMockUser = (
  overrides?: Partial<{ id: string; email: string; role: string }>
) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'customer',
  ...overrides,
});

/**
 * Mock session factory
 */
export const createMockSession = () => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
});
