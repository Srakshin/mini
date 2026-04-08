import {Document, Model, model, Schema, Types} from "mongoose";
import generateNanoIdWithAlphabet from "../utils/generateUUID";

/** News article document interface */
export interface INewsArticle extends Document {
    newsArticleId: string;
    newsExternalId: string;
    userId?: Types.ObjectId;
    title: string;
    source: string;
    author?: string;
    description?: string;
    content?: string;
    url: string;
    imageUrl?: string;
    publishedAt?: Date;
    category?: string;
    tags?: string[];
    aiSummary?: string;
    sentiment?: {
        type: string;
        confidence: number;
        emoji: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

interface INewsArticleModel extends Model<INewsArticle> {
}

const NewsArticleSchema = new Schema<INewsArticle>({
    newsExternalId: {
        type: String,
        unique: true,
        required: true,
        default: () => generateNanoIdWithAlphabet(),
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    source: {
        type: String,
        required: true,
        trim: true,
    },
    author: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
    },
    content: {
        type: String,
        select: false,
    },
    url: {
        type: String,
        required: true,
        trim: true,
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    publishedAt: {
        type: Date,
    },
    category: {
        type: String,
        trim: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    aiSummary: {
        type: String,
    },
    sentiment: {
        type: {
            type: String,
        },
        confidence: {
            type: Number,
        },
        emoji: {
            type: String,
        },
    },
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.newsArticleId = String(ret._id);
            (ret as any)._id = undefined;
            (ret as any).__v = undefined;
            (ret as any).content = undefined;
            return ret;
        },
    }
});

/** URL-based deduplication */
NewsArticleSchema.index({url: 1}, {unique: true});

/** Full text search */
NewsArticleSchema.index({title: 'text', description: 'text'});

const NewsArticleModel: INewsArticleModel = model<INewsArticle, INewsArticleModel>('NewsArticle', NewsArticleSchema);

export default NewsArticleModel;
