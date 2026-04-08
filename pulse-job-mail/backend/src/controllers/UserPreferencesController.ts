import "colors";
import {Request, Response} from "express";
import {ApiResponse} from "../utils/ApiResponse";
import {generateInvalidCode, generateNotFoundCode} from "../utils/generateErrorCodes";
import {CONTENT_FILTERS, DELIVERY_MODES, IAuthRequest, IUpdatePreferencesParams} from "../types/auth";
import UserPreferencesService from "../services/UserPreferencesService";

const getUserPreferencesController = async (req: Request, res: Response) => {
    console.info('Controller: getUserPreferencesController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {preferences} = await UserPreferencesService.getUserPreferences(userId);

        console.log('SUCCESS: Preferences fetched'.bgGreen.bold, {userId});
        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Preferences fetched successfully',
            preferences,
        }));
    } catch (error: any) {
        console.error('Controller Error: getUserPreferencesController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Something went wrong fetching preferences',
        }));
    }
};

const updateUserPreferencesController = async (req: Request, res: Response) => {
    console.info('Controller: updateUserPreferencesController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {
            contentFilters,
            deliveryMode,
            keywords,
            companies,
            jobTitles,
            locations,
            notificationSchedule,
            timezone,
            maxJobsInEmail,
            maxNewsInEmail,
            maxTimeDateItemsInEmail,
        }: Partial<IUpdatePreferencesParams> = req.body;

        const countFields = [
            {key: 'max_jobs_in_email', value: maxJobsInEmail},
            {key: 'max_news_in_email', value: maxNewsInEmail},
            {key: 'max_time_date_items_in_email', value: maxTimeDateItemsInEmail},
        ];

        for (const field of countFields) {
            if (field.value === undefined) {
                continue;
            }

            if (!Number.isInteger(field.value) || field.value < 0) {
                res.status(400).send(new ApiResponse({
                    success: false,
                    errorCode: generateInvalidCode(field.key),
                    errorMsg: `${field.key} must be a whole number greater than or equal to 0`,
                }));
                return;
            }
        }

        if (contentFilters !== undefined) {
            if (!Array.isArray(contentFilters)) {
                res.status(400).send(new ApiResponse({
                    success: false,
                    errorCode: generateInvalidCode('content_filters'),
                    errorMsg: 'Content filters must be an array',
                }));
                return;
            }

            const invalidFilters = contentFilters.filter((filter) => !CONTENT_FILTERS.includes(filter));
            if (invalidFilters.length > 0) {
                res.status(400).send(new ApiResponse({
                    success: false,
                    errorCode: generateInvalidCode('content_filters'),
                    errorMsg: `Invalid content filters: ${invalidFilters.join(', ')}. Valid options: ${CONTENT_FILTERS.join(', ')}`,
                }));
                return;
            }
        }

        if (deliveryMode !== undefined && !DELIVERY_MODES.includes(deliveryMode)) {
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateInvalidCode('delivery_mode'),
                errorMsg: `Invalid delivery mode. Valid options: ${DELIVERY_MODES.join(', ')}`,
            }));
            return;
        }

        const {preferences, error} = await UserPreferencesService.updateUserPreferences(userId, {
            contentFilters,
            deliveryMode,
            keywords,
            companies,
            jobTitles,
            locations,
            notificationSchedule,
            timezone,
            maxJobsInEmail,
            maxNewsInEmail,
            maxTimeDateItemsInEmail,
        });

        if (error) {
            const statusCode = error === generateNotFoundCode('preferences') ? 404 : 400;
            const errorMsg = error === generateNotFoundCode('preferences')
                ? 'User preferences not found'
                : 'Invalid preferences payload';

            res.status(statusCode).send(new ApiResponse({
                success: false,
                errorCode: error,
                errorMsg,
            }));
            return;
        }

        console.log('SUCCESS: Preferences updated'.bgGreen.bold, {userId});
        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Preferences updated successfully',
            preferences,
        }));
    } catch (error: any) {
        console.error('Controller Error: updateUserPreferencesController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Something went wrong updating preferences',
        }));
    }
};

const resetUserPreferencesController = async (req: Request, res: Response) => {
    console.info('Controller: resetUserPreferencesController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {preferences} = await UserPreferencesService.resetUserPreferences(userId);

        console.log('SUCCESS: Preferences reset to defaults'.bgGreen.bold, {userId});
        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Preferences reset to defaults',
            preferences,
        }));
    } catch (error: any) {
        console.error('Controller Error: resetUserPreferencesController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Something went wrong resetting preferences',
        }));
    }
};

export {
    getUserPreferencesController,
    updateUserPreferencesController,
    resetUserPreferencesController,
};
