import { Router } from 'express';
import { verifyPassword } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

// POST /api/auth/verify - Verify password and set session
router.post('/verify', asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PASSWORD',
        message: '请输入密码'
      }
    });
  }

  if (verifyPassword(password)) {
    req.session.authenticated = true;
    // Explicitly save session before responding to ensure cookie is set
    return new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          reject(err);
        } else {
          res.json({
            success: true,
            data: { authenticated: true }
          });
          resolve();
        }
      });
    });
  }

  return res.status(401).json({
    success: false,
    error: {
      code: 'INVALID_PASSWORD',
      message: '密码错误'
    }
  });
}));

// GET /api/auth/status - Check authentication status
router.get('/status', asyncHandler(async (req, res) => {
  return res.json({
    success: true,
    data: {
      authenticated: !!req.session.authenticated
    }
  });
}));

// POST /api/auth/logout - Clear session
router.post('/logout', asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: '退出登录失败'
        }
      });
    }
    return res.json({
      success: true,
      data: { authenticated: false }
    });
  });
}));

export default router;
