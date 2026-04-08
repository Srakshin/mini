import "colors";
import {Request, Response} from "express";
import {ApiResponse} from "../utils/ApiResponse";
import {IAuthRequest} from "../types/auth";
import NewsAggregatorService from "../services/NewsAggregatorService";

const getNewsController = async (req: Request, res: Response) => {
    console.info('Controller: getNewsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string | undefined;
        const category = req.query.category as string | undefined;

        const {articles, pagination} = await NewsAggregatorService.getNewsForUser(userId, {
            page,
            limit,
            search,
            category,
        });

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'News fetched successfully',
            articles,
            pagination,
        }));
    } catch (error: any) {
        console.error('Controller Error: getNewsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to fetch news',
        }));
    }
};

const getNewsStatsController = async (req: Request, res: Response) => {
    console.info('Controller: getNewsStatsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const stats = await NewsAggregatorService.getNewsStatsForUser(userId);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'News stats fetched successfully',
            stats,
        }));
    } catch (error: any) {
        console.error('Controller Error: getNewsStatsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to fetch news stats',
        }));
    }
};

const pullNewsController = async (req: Request, res: Response) => {
    console.info('Controller: pullNewsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {articles} = await NewsAggregatorService.syncNewsForAllUsers();
        await NewsAggregatorService.syncNewsForUserTopics();
        const filteredArticles = await NewsAggregatorService.filterArticlesForUser(userId, articles);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'News pull completed successfully',
            articles: filteredArticles,
            count: filteredArticles.length,
        }));
    } catch (error: any) {
        console.error('Controller Error: pullNewsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to pull news',
        }));
    }
};

export {
    getNewsController,
    getNewsStatsController,
    pullNewsController,
};
