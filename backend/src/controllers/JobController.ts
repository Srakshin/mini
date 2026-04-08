import "colors";
import {Request, Response} from "express";
import JobAlertModel from "../models/JobAlertSchema";
import UserPreferencesService from "../services/UserPreferencesService";
import {ApiResponse} from "../utils/ApiResponse";
import {generateInvalidCode, generateMissingCode, generateNotFoundCode} from "../utils/generateErrorCodes";
import {IAuthRequest, JOB_ALERT_STATUSES} from "../types/auth";
import JobParserService from "../services/JobParserService";
import {crawlJobsForPreferences} from "../utils/jobCrawlers";

const getJobAlertsController = async (req: Request, res: Response) => {
    console.info('Controller: getJobAlertsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const search = (req.query.search as string) || '';
        const status = req.query.status as string;
        const source = req.query.source as string;

        const query: Record<string, any> = {userId};
        if (search) {
            query.$text = {$search: search};
        }
        if (status) {
            query.status = status;
        }
        if (source) {
            query.source = source;
        }

        const [jobs, total] = await Promise.all([
            JobAlertModel.find(query)
                .sort({postedAt: -1, emailReceivedAt: -1, createdAt: -1})
                .skip((page - 1) * limit)
                .limit(limit),
            JobAlertModel.countDocuments(query),
        ]);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Job alerts fetched successfully',
            jobs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        }));
    } catch (error: any) {
        console.error('Controller Error: getJobAlertsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to fetch job alerts',
        }));
    }
};

const getJobStatsController = async (req: Request, res: Response) => {
    console.info('Controller: getJobStatsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const [totalJobs, newJobs, appliedJobs, archivedJobs, gmailJobs, crawledJobs] = await Promise.all([
            JobAlertModel.countDocuments({userId}),
            JobAlertModel.countDocuments({userId, status: 'new'}),
            JobAlertModel.countDocuments({userId, status: 'applied'}),
            JobAlertModel.countDocuments({userId, status: 'archived'}),
            JobAlertModel.countDocuments({userId, source: 'gmail'}),
            JobAlertModel.countDocuments({userId, source: 'crawled'}),
        ]);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Job stats fetched successfully',
            stats: {
                totalJobs,
                newJobs,
                appliedJobs,
                archivedJobs,
                gmailJobs,
                crawledJobs,
            },
        }));
    } catch (error: any) {
        console.error('Controller Error: getJobStatsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to fetch job stats',
        }));
    }
};

const crawlJobsController = async (req: Request, res: Response) => {
    console.info('Controller: crawlJobsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(userId);

        const crawledJobs = await crawlJobsForPreferences(preferences);
        const {jobs} = await JobParserService.upsertCrawledJobs(userId, crawledJobs);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Job crawl completed successfully',
            jobs,
            crawledCount: crawledJobs.length,
            storedCount: jobs.length,
        }));
    } catch (error: any) {
        console.error('Controller Error: crawlJobsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to crawl jobs',
        }));
    }
};

const updateJobStatusController = async (req: Request, res: Response) => {
    console.info('Controller: updateJobStatusController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {jobId} = req.params;
        const {status} = req.body as {status?: string};

        if (!jobId) {
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateMissingCode('job_id'),
                errorMsg: 'Job id is missing',
            }));
            return;
        }

        if (!status) {
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateMissingCode('status'),
                errorMsg: 'Job status is missing',
            }));
            return;
        }

        if (!JOB_ALERT_STATUSES.includes(status as any)) {
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateInvalidCode('job_status'),
                errorMsg: `Invalid job status. Valid options: ${JOB_ALERT_STATUSES.join(', ')}`,
            }));
            return;
        }

        const job = await JobAlertModel.findOne({_id: jobId, userId});
        if (!job) {
            res.status(404).send(new ApiResponse({
                success: false,
                errorCode: generateNotFoundCode('job_alert'),
                errorMsg: 'Job alert not found',
            }));
            return;
        }

        job.status = status as any;
        await job.save();

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Job status updated successfully',
            job,
        }));
    } catch (error: any) {
        console.error('Controller Error: updateJobStatusController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to update job status',
        }));
    }
};

export {
    getJobAlertsController,
    getJobStatsController,
    crawlJobsController,
    updateJobStatusController,
};
