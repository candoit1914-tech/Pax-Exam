import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';
import { SchoolModel } from '../models/school.model.js';
import pool from '../config/database.js';

const loginAttempts = new Map();

function cleanupLoginAttempts() {
  const now = Date.now();
  for (const [key, data] of loginAttempts) {
    if (now - data.lastAttempt > 15 * 60 * 1000) loginAttempts.delete(key);
  }
}
setInterval(cleanupLoginAttempts, 60 * 1000);

function checkLoginRateLimit(email) {
  const data = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  const now = Date.now();
  if (now - data.lastAttempt > 15 * 60 * 1000) {
    data.count = 0;
  }
  data.count++;
  data.lastAttempt = now;
  loginAttempts.set(email, data);
  return data.count <= 5;
}

function recordLoginFailure(email) {
  // Already tracked in checkLoginRateLimit
}

function clearLoginAttempts(email) {
  loginAttempts.delete(email);
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, schoolId: user.school_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
}

export const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const sanitizedEmail = email.toLowerCase().trim();

      if (!checkLoginRateLimit(sanitizedEmail)) {
        return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
      }

      const user = await UserModel.findByEmail(sanitizedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated.' });
      }

      await UserModel.updateLastLogin(user.id);
      clearLoginAttempts(sanitizedEmail);

      const school = await SchoolModel.findById(user.school_id);
      const tokens = generateTokens(user);

      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
        [user.id, tokens.refreshToken]
      );

      res.json({
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          school_id: user.school_id,
          school_name: school?.name || ''
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async register(req, res, next) {
    try {
      const { email, password, name, role, school_name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required.' });
      }

      const sanitizedEmail = email.toLowerCase().trim();

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const existing = await UserModel.findByEmail(sanitizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered.' });
      }

      let schoolId;
      if (role === 'super_admin') {
        const school = await SchoolModel.create({ name: school_name || 'Default School' });
        schoolId = school.id;
      } else {
        schoolId = req.body.school_id || req.user?.school_id;
        if (!schoolId) {
          return res.status(400).json({ error: 'School ID is required for non-admin registration.' });
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserModel.create({
        school_id: schoolId,
        email: sanitizedEmail,
        password_hash: passwordHash,
        role: role || 'teacher',
        name
      });

      res.status(201).json({ message: 'User created successfully.', user });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);
        } catch { }
      }
      res.json({ message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required.' });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const stored = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
        [refreshToken, decoded.userId]
      );
      if (stored.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found.' });
      }

      const tokens = generateTokens(user);
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
        [user.id, tokens.refreshToken]
      );

      res.json(tokens);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
  },

  async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      const school = await SchoolModel.findById(user.school_id);
      res.json({ ...user, school_name: school?.name || '' });
    } catch (err) {
      next(err);
    }
  },

  async createTeacher(req, res, next) {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
      }

      const sanitizedEmail = email.toLowerCase().trim();

      const existing = await UserModel.findByEmail(sanitizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered.' });
      }

      const password = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await UserModel.create({
        school_id: req.user.school_id,
        email: sanitizedEmail,
        password_hash: passwordHash,
        role: 'teacher',
        name
      });

      await pool.query(
        'INSERT INTO teachers (school_id, user_id, name, email) VALUES ($1, $2, $3, $4)',
        [req.user.school_id, user.id, name, sanitizedEmail]
      );

      res.status(201).json({
        message: 'Teacher created successfully.',
        credentials: { email: sanitizedEmail, password },
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      next(err);
    }
  },

  async resetTeacherPassword(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      if (!user || user.role !== 'teacher') {
        return res.status(404).json({ error: 'Teacher not found.' });
      }
      if (user.school_id !== req.user.school_id && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden.' });
      }

      const password = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
      const passwordHash = await bcrypt.hash(password, 12);

      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

      res.json({ message: 'Password reset successfully.', credentials: { email: user.email, password } });
    } catch (err) {
      next(err);
    }
  },

  async listTeacherUsers(req, res, next) {
    try {
      const result = await pool.query(
        'SELECT id, email, name, role, is_active, created_at FROM users WHERE school_id = $1 AND role = $2 ORDER BY name',
        [req.user.school_id, 'teacher']
      );
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, email } = req.body;
      if (!name && !email) {
        return res.status(400).json({ error: 'Nothing to update.' });
      }

      if (email) {
        const existing = await UserModel.findByEmail(email);
        if (existing && existing.id !== req.user.id) {
          return res.status(409).json({ error: 'Email already in use.' });
        }
      }

      const fields = [];
      const values = [];
      let idx = 1;
      if (name) { fields.push(`name = $${idx++}`); values.push(name); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      values.push(req.user.id);

      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      res.json({ message: 'Profile updated.' });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required.' });
      }

      const user = await UserModel.findById(req.user.id);
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
      res.json({ message: 'Password changed successfully.' });
    } catch (err) {
      next(err);
    }
  }
};
