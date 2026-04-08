import {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {authRateLimiter} from "../middlewares/rateLimiter";
import {
    checkAuthStatusController,
    deleteAccountController,
    generateMagicLinkController,
    getUserProfileController,
    loginController,
    loginWithGoogleController,
    redirectToGoogle,
    refreshTokenController,
    registerUserController,
    resetPasswordController,
    updateUserController,
    verifyMagicLinkController,
} from "../controllers/AuthController";

const authRouter = Router();

authRouter.post('/register', authRateLimiter, registerUserController);                          // /api/v1/auth/register
authRouter.post('/login', authRateLimiter, loginController);                                    // /api/v1/auth/login
authRouter.post('/refresh-token', authRateLimiter, refreshTokenController);                     // /api/v1/auth/refresh-token
authRouter.post('/refresh', authRateLimiter, refreshTokenController);                           // Legacy alias

authRouter.get('/google', authRateLimiter, redirectToGoogle);                                   // /api/v1/auth/google
authRouter.get('/oauth2callback', authRateLimiter, loginWithGoogleController);                  // /api/v1/auth/oauth2callback
authRouter.get('/google/callback', authRateLimiter, loginWithGoogleController);                 // Legacy alias

authRouter.post('/magic-link', authRateLimiter, generateMagicLinkController);                   // /api/v1/auth/magic-link
authRouter.post('/magic-link/generate', authRateLimiter, generateMagicLinkController);          // Legacy alias
authRouter.get('/verify-magic-link', authRateLimiter, verifyMagicLinkController);               // /api/v1/auth/verify-magic-link
authRouter.get('/magic-link/verify', authRateLimiter, verifyMagicLinkController);               // Legacy alias
authRouter.post('/check-auth-status', authRateLimiter, checkAuthStatusController);              // /api/v1/auth/check-auth-status
authRouter.post('/magic-link/status', authRateLimiter, checkAuthStatusController);              // Legacy alias

authRouter.post('/reset-password', authMiddleware, authRateLimiter, resetPasswordController);   // /api/v1/auth/reset-password
authRouter.get('/profile', authMiddleware, authRateLimiter, getUserProfileController);          // /api/v1/auth/profile
authRouter.put('/profile', authMiddleware, authRateLimiter, updateUserController);              // /api/v1/auth/profile
authRouter.delete('/profile', authMiddleware, authRateLimiter, deleteAccountController);        // /api/v1/auth/profile
authRouter.delete('/account', authMiddleware, authRateLimiter, deleteAccountController);        // Legacy alias

export default authRouter;
