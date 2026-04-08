import {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {preferencesRateLimiter} from "../middlewares/rateLimiter";
import {
    getUserPreferencesController,
    resetUserPreferencesController,
    updateUserPreferencesController,
} from "../controllers/UserPreferencesController";

const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get('/preferences', getUserPreferencesController);                                   // /api/v1/user/preferences
userRouter.put('/preferences', preferencesRateLimiter, updateUserPreferencesController);        // /api/v1/user/preferences
userRouter.post('/preferences/reset', preferencesRateLimiter, resetUserPreferencesController);  // /api/v1/user/preferences/reset

export default userRouter;
