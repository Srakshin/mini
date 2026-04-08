import {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {aiRateLimiter} from "../middlewares/rateLimiter";
import {
    getNewsController,
    getNewsStatsController,
    pullNewsController,
} from "../controllers/NewsController";

const newsRouter = Router();

newsRouter.use(authMiddleware);

newsRouter.get('/', getNewsController);
newsRouter.get('/feed', getNewsController);
newsRouter.get('/stats', getNewsStatsController);
newsRouter.post('/pull', aiRateLimiter, pullNewsController);

export default newsRouter;
