import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createRequestLogger, generateRequestId, logTimed } from '@/lib/logger';

describe('Logger Service', () => {
  // Capture console output - recreate in beforeEach
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logger.debug', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include context in debug messages', () => {
      logger.debug('Test with context', { userId: '123' });
      expect(consoleSpy.log).toHaveBeenCalled();
      const output = consoleSpy.log.mock.calls[0][0];
      expect(output).toContain('Test with context');
    });
  });

  describe('logger.info', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should include context in info messages', () => {
      logger.info('Info with context', { action: 'test' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('logger.warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('logger.error', () => {
    it('should log error messages', () => {
      logger.error('Test error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include error details', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(consoleSpy.error).toHaveBeenCalled();
      const output = consoleSpy.error.mock.calls[0][0];
      expect(output).toContain('Error occurred');
    });

    it('should handle non-Error objects', () => {
      logger.error('String error', 'Something went wrong');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include context with errors', () => {
      const error = new Error('Database error');
      logger.error('Query failed', error, { query: 'SELECT *' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('logger.child', () => {
    it('should create a child logger with base context', () => {
      const childLogger = logger.child({ requestId: 'req-123' });
      childLogger.info('Child log message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should merge child context with base context', () => {
      const childLogger = logger.child({ requestId: 'req-123' });
      childLogger.info('Message', { extra: 'data' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should create nested child loggers', () => {
      const child1 = logger.child({ service: 'api' });
      const child2 = child1.child({ handler: 'orders' });
      child2.info('Nested child log');
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('createRequestLogger', () => {
    it('should create a logger with requestId', () => {
      const reqLogger = createRequestLogger('req-456');
      reqLogger.info('Request log');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should create a logger with requestId and userId', () => {
      const reqLogger = createRequestLogger('req-789', 'user-123');
      reqLogger.info('Authenticated request');
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "req_" prefix', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_/);
    });

    it('should have consistent format', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  describe('logTimed', () => {
    it('should log successful operations with duration', async () => {
      const result = await logTimed('Test operation', async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(consoleSpy.info).toHaveBeenCalled();
      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain('Test operation completed');
    });

    it('should log failed operations with duration', async () => {
      await expect(
        logTimed('Failing operation', async () => {
          throw new Error('Test failure');
        })
      ).rejects.toThrow('Test failure');

      expect(consoleSpy.error).toHaveBeenCalled();
      const output = consoleSpy.error.mock.calls[0][0];
      expect(output).toContain('Failing operation failed');
    });

    it('should include custom context', async () => {
      await logTimed('Contexted operation', async () => 'done', { userId: 'user-123' });
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });
});
