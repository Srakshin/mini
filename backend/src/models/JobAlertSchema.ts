import {Document, Model, model, Schema, Types} from "mongoose";
import generateNanoIdWithAlphabet from "../utils/generateUUID";
import {JOB_ALERT_SOURCES, JOB_ALERT_STATUSES, TJobAlertSource, TJobAlertStatus} from "../types/auth";

/** Job alert document interface — individual job listing */
export interface IJobAlert extends Document {
    jobAlertId: string;
    jobExternalId: string;
    userId: Types.ObjectId;
    gmailAccountId?: Types.ObjectId;
    source: TJobAlertSource;
    status: TJobAlertStatus;
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
    salary?: string;
    jobType?: string;
    postedAt?: Date;
    emailSubject?: string;
    emailFrom?: string;
    emailReceivedAt?: Date;
    gmailMessageId?: string;
    tags?: string[];
    aiSummary?: string;
    rawContent?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface IJobAlertModel extends Model<IJobAlert> {
}

const JobAlertSchema = new Schema<IJobAlert>({
    jobExternalId: {
        type: String,
        unique: true,
        required: true,
        default: () => generateNanoIdWithAlphabet(),
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    gmailAccountId: {
        type: Schema.Types.ObjectId,
        ref: 'GmailAccount',
    },
    source: {
        type: String,
        required: true,
        enum: JOB_ALERT_SOURCES,
    },
    status: {
        type: String,
        enum: JOB_ALERT_STATUSES,
        default: 'new',
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    company: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
    },
    url: {
        type: String,
        trim: true,
    },
    salary: {
        type: String,
        trim: true,
    },
    jobType: {
        type: String,
        trim: true,
    },
    postedAt: {
        type: Date,
    },
    emailSubject: {
        type: String,
    },
    emailFrom: {
        type: String,
    },
    emailReceivedAt: {
        type: Date,
    },
    gmailMessageId: {
        type: String,
        sparse: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    aiSummary: {
        type: String,
    },
    rawContent: {
        type: String,
        select: false,
    },
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.jobAlertId = String(ret._id);
            (ret as any)._id = undefined;
            (ret as any).__v = undefined;
            (ret as any).rawContent = undefined;
            return ret;
        },
    }
});

/** Prevent duplicate Gmail messages from being stored without blocking crawler jobs */
JobAlertSchema.index(
    {userId: 1, gmailMessageId: 1},
    {
        unique: true,
        partialFilterExpression: {
            gmailMessageId: {$exists: true, $type: 'string'},
        },
    },
);

/** Full text search on title, company, description */
JobAlertSchema.index({title: 'text', company: 'text', description: 'text'});

const JobAlertModel: IJobAlertModel = model<IJobAlert, IJobAlertModel>('JobAlert', JobAlertSchema);

export default JobAlertModel;
