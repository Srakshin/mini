import {Document, Model, model, Schema, Types} from "mongoose";
import generateNanoIdWithAlphabet from "../utils/generateUUID";
import {CONTENT_FILTERS, DELIVERY_MODES, TContentFilter, TDeliveryMode} from "../types/auth";

/** User preferences document interface */
export interface IUserPreference extends Document {
    preferenceId: string;
    preferenceExternalId: string;
    userId: Types.ObjectId;
    contentFilters: TContentFilter[];
    deliveryMode: TDeliveryMode;
    keywords: string[];
    companies: string[];
    jobTitles: string[];
    locations: string[];
    notificationSchedule: string;
    timezone: string;
    maxJobsInEmail: number;
    maxNewsInEmail: number;
    maxTimeDateItemsInEmail: number;
    emailDigestEnabled: boolean;
    aiSummaryEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface IUserPreferenceModel extends Model<IUserPreference> {
}

const UserPreferenceSchema = new Schema<IUserPreference>({
    preferenceExternalId: {
        type: String,
        unique: true,
        required: true,
        default: () => generateNanoIdWithAlphabet(),
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    contentFilters: {
        type: [String],
        enum: CONTENT_FILTERS,
        default: ['job_updates'],
    },
    deliveryMode: {
        type: String,
        enum: DELIVERY_MODES,
        default: 'smart_summary',
    },
    keywords: {
        type: [String],
        default: [],
    },
    companies: {
        type: [String],
        default: [],
    },
    jobTitles: {
        type: [String],
        default: [],
    },
    locations: {
        type: [String],
        default: [],
    },
    notificationSchedule: {
        type: String,
        default: '0 9 * * *',
    },
    timezone: {
        type: String,
        default: 'UTC',
    },
    maxJobsInEmail: {
        type: Number,
        default: 6,
        min: 0,
    },
    maxNewsInEmail: {
        type: Number,
        default: 6,
        min: 0,
    },
    maxTimeDateItemsInEmail: {
        type: Number,
        default: 4,
        min: 0,
    },
    emailDigestEnabled: {
        type: Boolean,
        default: true,
    },
    aiSummaryEnabled: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.preferenceId = String(ret._id);
            (ret as any)._id = undefined;
            (ret as any).__v = undefined;
            return ret;
        },
    }
});

const UserPreferenceModel: IUserPreferenceModel = model<IUserPreference, IUserPreferenceModel>('UserPreference', UserPreferenceSchema);

export default UserPreferenceModel;
