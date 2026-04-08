import {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {jobCrawlerRateLimiter} from "../middlewares/rateLimiter";
import {
    crawlJobsController,
    getJobAlertsController,
    getJobStatsController,
    updateJobStatusController,
} from "../controllers/JobController";

const jobRouter = Router();

jobRouter.use(authMiddleware);

jobRouter.get('/', getJobAlertsController);
jobRouter.get('/alerts', getJobAlertsController);
jobRouter.get('/stats', getJobStatsController);
jobRouter.post('/crawl', jobCrawlerRateLimiter, crawlJobsController);
jobRouter.patch('/:jobId/status', jobCrawlerRateLimiter, updateJobStatusController);
jobRouter.put('/:jobId/status', jobCrawlerRateLimiter, updateJobStatusController);

export default jobRouter;
