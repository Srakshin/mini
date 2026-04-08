import {Document, Model, model, Schema, Types} from "mongoose";
import generateNanoIdWithAlphabet from "../utils/generateUUID";
import {GMAIL_ACCOUNT_STATUS, TGmailAccountStatus} from "../types/auth";

/** Gmail account document interface — stores encrypted OAuth tokens */
export interface IGmailAccount extends Document {
    gmailAccountId: string;
    gmailExternalId: string;
    userId: Types.ObjectId;
    email: string;
    isPrimary: boolean;
    status: TGmailAccountStatus;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    tokenExpiresAt?: Date;
    lastSyncAt?: Date;
    syncCursor?: string;
    labels?: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface IGmailAccountModel extends Model<IGmailAccount> {
}

const GmailAccountSchema = new Schema<IGmailAccount>({
    gmailExternalId: {
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
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    isPrimary: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: GMAIL_ACCOUNT_STATUS,
        default: 'connected',
    },
    accessTokenEncrypted: {
        type: String,
        required: true,
        select: false,
    },
    refreshTokenEncrypted: {
        type: String,
        required: true,
        select: false,
    },
    tokenExpiresAt: {
        type: Date,
    },
    lastSyncAt: {
        type: Date,
    },
    syncCursor: {
        type: String,
        select: false,
    },
    labels: {
        type: [String],
        default: ['INBOX'],
    },
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.gmailAccountId = String(ret._id);
            (ret as any)._id = undefined;
            (ret as any).__v = undefined;
            (ret as any).accessTokenEncrypted = undefined;
            (ret as any).refreshTokenEncrypted = undefined;
            (ret as any).syncCursor = undefined;
            return ret;
        },
    }
});

/** Compound index: one user cannot connect the same email twice */
GmailAccountSchema.index({userId: 1, email: 1}, {unique: true});

const GmailAccountModel: IGmailAccountModel = model<IGmailAccount, IGmailAccountModel>('GmailAccount', GmailAccountSchema);

export default GmailAccountModel;
