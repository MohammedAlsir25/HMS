import { describe, it, expect } from '@jest/globals';
import { encrypt, decrypt } from '../src/utils/encryption.js';

describe('AES-256-GCM Encryption', () => {
  it('should encrypt and decrypt text correctly', () => {
    const original = 'Patient sensitive data: SSN 123-45-6789';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':').length).toBe(3);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertexts for same input', () => {
    const text = 'repeated value';
    const a = encrypt(text);
    const b = encrypt(text);
    expect(a).not.toBe(b);
  });

  it('should handle empty string', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle unicode characters', () => {
    const text = 'Arabic: مرحبا, Chinese: 你好, Emoji: 🏥';
    const encrypted = encrypt(text);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it('should reject tampered ciphertext', () => {
    const encrypted = encrypt('valid data');
    const tampered = encrypted.replace(':', 'X');
    expect(() => decrypt(tampered)).toThrow();
  });
});
