import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';
import { SchoolModel } from '../models/school.model.js';
import pool from '../config/database.js';

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

      const user = await UserModel.findByEmail(email);
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

      const existing = await UserModel.findByEmail(email);
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
        email,
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
  }
};
