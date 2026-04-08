import {Document, Model, model, Schema} from "mongoose";
import generateNanoIdWithAlphabet from "../utils/generateUUID";
import {SUPPORTED_AUTH_PROVIDERS, TSupportedAuthProvider} from "../types/auth";

/** User document interface */
export interface IUser extends Document {
    userId: string;
    userExternalId: string;
    authProvider: TSupportedAuthProvider;
    googleId?: string;
    isVerified: boolean;
    name?: string;
    email: string;
    password?: string;
    profilePicture?: string;
    refreshToken?: string;
    magicLinkToken?: string;
    magicLinkExpiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface IUserModel extends Model<IUser> {
}

const UserSchema = new Schema<IUser>({
    userExternalId: {
        type: String,
        unique: true,
        required: true,
        default: () => generateNanoIdWithAlphabet(),
    },
    authProvider: {
        type: String,
        required: true,
        enum: SUPPORTED_AUTH_PROVIDERS,
    },
    googleId: {
        type: String,
        sparse: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        trim: true,
        select: false,
    },
    profilePicture: {
        type: String,
        trim: true,
    },
    refreshToken: {
        type: String,
        select: false,
    },
    magicLinkToken: {
        type: String,
        select: false,
    },
    magicLinkExpiresAt: {
        type: Date,
        select: false,
    },
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.userId = String(ret._id);
            (ret as any)._id = undefined;
            (ret as any).__v = undefined;
            (ret as any).password = undefined;
            (ret as any).refreshToken = undefined;
            (ret as any).magicLinkToken = undefined;
            (ret as any).magicLinkExpiresAt = undefined;
            return ret;
        },
    }
});

const UserModel: IUserModel = model<IUser, IUserModel>('User', UserSchema);

export default UserModel;
