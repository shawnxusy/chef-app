import { Request, Response, NextFunction } from 'express';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '请先登录'
      }
    });
  }
};

export const verifyPassword = (password: string): boolean => {
  const appPassword = process.env.APP_PSWD;
  if (!appPassword) {
    console.warn('APP_PSWD not set, authentication disabled');
    return true;
  }
  return password === appPassword;
};
