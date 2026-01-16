import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  unescapeHtml,
  stripHtml,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeObject,
  sanitizeInput,
  containsDangerousContent,
} from '@/lib/security/xss';

describe('XSS Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's fine")).toBe('It&#x27;s fine');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null as unknown as string)).toBe('');
      expect(escapeHtml(undefined as unknown as string)).toBe('');
      expect(escapeHtml(123 as unknown as string)).toBe('');
    });

    it('should escape backticks and equals', () => {
      expect(escapeHtml('`onclick=alert(1)`')).toBe('&#x60;onclick&#x3D;alert(1)&#x60;');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
    });

    it('should be reversible with escapeHtml', () => {
      const original = '<script>alert("test")</script>';
      const escaped = escapeHtml(original);
      expect(unescapeHtml(escaped)).toBe(original);
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should handle script tags', () => {
      expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
    });

    it('should handle self-closing tags', () => {
      expect(stripHtml('Line 1<br/>Line 2')).toBe('Line 1Line 2');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(stripHtml(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should keep allowed tags', () => {
      expect(sanitizeHtml('<p>Hello</p>')).toBe('<p>Hello</p>');
      expect(sanitizeHtml('<b>Bold</b>')).toBe('<b>Bold</b>');
      expect(sanitizeHtml('<i>Italic</i>')).toBe('<i>Italic</i>');
    });

    it('should remove script tags and their content', () => {
      // Script tags AND their content are completely removed for security
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
    });

    it('should remove onclick handlers', () => {
      expect(sanitizeHtml('<p onclick="alert(1)">Click</p>')).toBe('<p>Click</p>');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">Link</a>')).toBe('Link');
    });

    it('should remove style expressions', () => {
      const input = '<div style="background: expression(alert(1))">Test</div>';
      expect(sanitizeHtml(input)).not.toContain('expression');
    });

    it('should strip attributes from allowed tags', () => {
      expect(sanitizeHtml('<p class="danger" id="hack">Safe</p>')).toBe('<p>Safe</p>');
    });

    it('should handle nested dangerous content', () => {
      // Script tags and content are completely removed for security
      const input = '<p><script>alert(1)</script>Safe</p>';
      expect(sanitizeHtml(input)).toBe('<p>Safe</p>');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
      expect(sanitizeUrl('path/to/page')).toBe('path/to/page');
    });

    it('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should allow tel URLs', () => {
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
      expect(sanitizeUrl('  javascript:alert(1)  ')).toBeNull();
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBeNull();
    });

    it('should block file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBeNull();
      expect(sanitizeUrl(undefined as unknown as string)).toBeNull();
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('sanitizeObject', () => {
    it('should escape string properties', () => {
      const input = { name: '<script>alert(1)</script>' };
      const result = sanitizeObject(input);
      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          email: 'test@example.com',
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('&lt;b&gt;John&lt;&#x2F;b&gt;');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>', 'safe', '<img src=x>'],
      };
      const result = sanitizeObject(input);
      expect(result.tags[0]).toBe('&lt;script&gt;');
      expect(result.tags[1]).toBe('safe');
      expect(result.tags[2]).toBe('&lt;img src&#x3D;x&gt;');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        data: null,
      };
      const result = sanitizeObject(input);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle null input', () => {
      expect(sanitizeObject(null as unknown as Record<string, unknown>)).toBeNull();
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should remove null bytes', () => {
      expect(sanitizeInput('hello\0world')).toBe('helloworld');
    });

    it('should escape HTML by default', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;'
      );
    });

    it('should optionally skip HTML escaping', () => {
      expect(sanitizeInput('<b>bold</b>', { escapeHtml: false })).toBe('<b>bold</b>');
    });

    it('should truncate to maxLength', () => {
      expect(sanitizeInput('hello world', { maxLength: 5 })).toBe('hello');
    });

    it('should preserve newlines by default', () => {
      expect(sanitizeInput('line1\nline2', { escapeHtml: false })).toBe('line1\nline2');
    });

    it('should optionally remove newlines', () => {
      expect(sanitizeInput('line1\nline2', { allowNewlines: false, escapeHtml: false })).toBe(
        'line1 line2'
      );
    });

    it('should handle carriage returns', () => {
      expect(sanitizeInput('line1\r\nline2', { allowNewlines: false, escapeHtml: false })).toBe(
        'line1  line2'
      );
    });
  });

  describe('containsDangerousContent', () => {
    it('should detect onclick handlers', () => {
      expect(containsDangerousContent('onclick=alert(1)')).toBe(true);
      expect(containsDangerousContent('onmouseover=hack()')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(containsDangerousContent('javascript:void(0)')).toBe(true);
    });

    it('should detect script tags', () => {
      expect(containsDangerousContent('<script>alert(1)</script>')).toBe(true);
      expect(containsDangerousContent('< script >alert(1)')).toBe(true);
    });

    it('should detect expression() in styles', () => {
      expect(containsDangerousContent('style="width: expression(alert())"')).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(containsDangerousContent('Hello World')).toBe(false);
      expect(containsDangerousContent('Price: $100')).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(containsDangerousContent(null as unknown as string)).toBe(false);
      expect(containsDangerousContent(123 as unknown as string)).toBe(false);
    });
  });
});
