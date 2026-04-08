import "colors";
import cors from "cors";
import morgan from "morgan";
import express from "express";
import {ApiResponse} from "./utils/ApiResponse";
import {PORT, NODE_ENV} from "./config/config";
import {connectDB} from "./config/connectDB";
import {startCronJobs} from "./utils/cronJobs";
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import emailRouter from "./routes/email.routes";
import jobRouter from "./routes/job.routes";
import newsRouter from "./routes/news.routes";
import preferencesRouter from "./routes/preferences.routes";

const app = express();

app.use(cors({
    origin: NODE_ENV === 'production'
        ? ['https://pulsejobmail.com']
        : (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            const isAllowedLocalOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
            callback(null, isAllowedLocalOrigin);
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/email', emailRouter);
app.use('/api/v1/gmail', emailRouter);
app.use('/api/v1/jobs', jobRouter);
app.use('/api/v1/news', newsRouter);
app.use('/api/v1/preferences', preferencesRouter);

app.get('/api/v1/health', (req, res) => {
    res.status(200).send(new ApiResponse({
        success: true,
        message: 'PulseJobMail API is running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: NODE_ENV || 'development',
    }));
});

app.get('/', (req, res) => {
    res.status(200).send('<h1>Welcome to PulseJobMail Server</h1>');
});

app.use((req, res) => {
    res.status(404).send(new ApiResponse({
        success: false,
        errorCode: 'ROUTE_NOT_FOUND',
        errorMsg: `Route ${req.originalUrl} not found`,
    }));
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error: Unhandled error'.red.bold, error);

    res.status(error?.status || 500).send(new ApiResponse({
        success: false,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMsg: NODE_ENV === 'production' ? 'Internal server error' : error?.message || 'Internal server error',
    }));
});

const port = Number(PORT) || 4000;

const start = async () => {
    try {
        await connectDB();
        startCronJobs();

        app.listen(port, '0.0.0.0', (error?: Error) => {
            if (error) {
                console.error('Service Error: Failed to start server'.red.bold, error);
                process.exit(1);
            }

            console.log(`Server started on ${port}`.blue.italic.bold);
            console.log(`\t- Local:   http://localhost:${port}`.green.bold);
            console.log(`\t- Health:  http://localhost:${port}/api/v1/health`.green.bold);
        });
    } catch (error: any) {
        console.error('Service Error: Server setup failed'.red.bold, error);
        process.exit(1);
    }
};

start();

export default app;
