import {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {preferencesRateLimiter} from "../middlewares/rateLimiter";
import {CONTENT_FILTERS, DELIVERY_MODES} from "../types/auth";
import {ApiResponse} from "../utils/ApiResponse";
import {
    getUserPreferencesController,
    resetUserPreferencesController,
    updateUserPreferencesController,
} from "../controllers/UserPreferencesController";

const preferencesRouter = Router();

preferencesRouter.use(authMiddleware);

preferencesRouter.get('/', getUserPreferencesController);
preferencesRouter.get('/meta', (req, res) => {
    res.status(200).send(new ApiResponse({
        success: true,
        message: 'Preferences metadata fetched successfully',
        contentFilters: CONTENT_FILTERS,
        deliveryModes: DELIVERY_MODES,
    }));
});
preferencesRouter.put('/', preferencesRateLimiter, updateUserPreferencesController);
preferencesRouter.post('/reset', preferencesRateLimiter, resetUserPreferencesController);

export default preferencesRouter;
