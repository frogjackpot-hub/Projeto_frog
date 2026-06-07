const crypto = require('crypto');

class Admin2FAService {
  constructor() {
    this.challenges = new Map();
    this.ttlMs = 5 * 60 * 1000; // 5 minutos
    this.maxAttempts = 5;
  }

  generateNumericCode(length = 6) {
    const min = 10 ** (length - 1);
    const max = (10 ** length) - 1;
    return String(crypto.randomInt(min, max + 1));
  }

  hashCode(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
  }

  createChallenge({ userId, email, ip, userAgent }) {
    const challengeId = crypto.randomUUID();
    const code = this.generateNumericCode(6);
    const codeHash = this.hashCode(code);
    const expiresAt = Date.now() + this.ttlMs;

    this.challenges.set(challengeId, {
      userId,
      email,
      ip,
      userAgent,
      codeHash,
      attempts: 0,
      expiresAt,
    });

    return {
      challengeId,
      code,
      expiresIn: Math.floor(this.ttlMs / 1000),
    };
  }

  verifyChallenge({ challengeId, code }) {
    const challenge = this.challenges.get(challengeId);

    if (!challenge) {
      return { valid: false, reason: 'CHALLENGE_NOT_FOUND' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return { valid: false, reason: 'CHALLENGE_EXPIRED' };
    }

    if (challenge.attempts >= this.maxAttempts) {
      this.challenges.delete(challengeId);
      return { valid: false, reason: 'MAX_ATTEMPTS_REACHED' };
    }

    challenge.attempts += 1;

    const incomingHash = this.hashCode(String(code || ''));
    if (incomingHash !== challenge.codeHash) {
      this.challenges.set(challengeId, challenge);
      return {
        valid: false,
        reason: 'INVALID_CODE',
        attemptsRemaining: Math.max(0, this.maxAttempts - challenge.attempts),
      };
    }

    this.challenges.delete(challengeId);
    return {
      valid: true,
      userId: challenge.userId,
      email: challenge.email,
      ip: challenge.ip,
      userAgent: challenge.userAgent,
    };
  }
}

module.exports = new Admin2FAService();