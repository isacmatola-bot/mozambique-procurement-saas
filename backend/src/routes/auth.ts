import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { one } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthedRequest, AuthUser } from '../types.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await one<any>(
    `select id, organization_id, name, email, role, password_hash, is_active from users where lower(email) = lower($1)`,
    [body.email]
  );
  if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(body.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const payload: AuthUser = {
    id: user.id,
    organization_id: user.organization_id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
  res.json({ token, user: payload });
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
