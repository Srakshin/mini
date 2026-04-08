import {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {gmailRateLimiter} from "../middlewares/rateLimiter";
import {
    connectGmailCallbackController,
    disconnectGmailAccountController,
    getGmailConnectUrlController,
    listGmailAccountsController,
    sendDigestPreviewController,
    setPrimaryGmailAccountController,
    syncGmailAccountsController,
} from "../controllers/EmailController";

const emailRouter = Router();

emailRouter.get('/callback', connectGmailCallbackController);
emailRouter.get('/connect/callback', connectGmailCallbackController);

emailRouter.use(authMiddleware);

emailRouter.get('/connect', gmailRateLimiter, getGmailConnectUrlController);
emailRouter.post('/connect', gmailRateLimiter, getGmailConnectUrlController);
emailRouter.get('/accounts', listGmailAccountsController);
emailRouter.post('/sync', gmailRateLimiter, syncGmailAccountsController);
emailRouter.post('/digest/preview', gmailRateLimiter, sendDigestPreviewController);
emailRouter.post('/preview-digest', gmailRateLimiter, sendDigestPreviewController);
emailRouter.patch('/accounts/:gmailAccountId/primary', gmailRateLimiter, setPrimaryGmailAccountController);
emailRouter.post('/accounts/:gmailAccountId/primary', gmailRateLimiter, setPrimaryGmailAccountController);
emailRouter.delete('/accounts/:gmailAccountId', gmailRateLimiter, disconnectGmailAccountController);

export default emailRouter;
