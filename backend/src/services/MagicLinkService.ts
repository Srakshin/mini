import "colors";
import nodemailer from "nodemailer";
import UserModel from "../models/UserSchema";
import UserPreferenceModel from "../models/UserPreferenceSchema";
import {generateAccessToken, generateRefreshToken, generateMagicLinkToken, verifyMagicLinkToken} from "../utils/jwt.utils";
import {generateInvalidCode, generateNotFoundCode} from "../utils/generateErrorCodes";
import {EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, FRONTEND_URL, MAGIC_LINK_EXPIRY} from "../config/config";

/** Nodemailer transporter */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: EMAIL_HOST || 'smtp.gmail.com',
        port: Number(EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
};

class MagicLinkService {

    /**
     * Generate and send a magic link to the user's email
     */
    static async generateMagicLink({email}: {email: string}) {
        try {
            console.info('Service: generateMagicLink started'.bgMagenta.white.bold, {email});

            let user = await UserModel.findOne({email: email.toLowerCase()}).select('+magicLinkToken +magicLinkExpiresAt');

            if (!user) {
                // Auto-register magic link users
                user = await UserModel.create({
                    email: email.toLowerCase(),
                    name: email.split('@')[0],
                    authProvider: 'magic_link',
                    isVerified: false,
                });

                // Create default preferences
                await UserPreferenceModel.create({userId: user._id});
            }

            const tokenPayload = {userId: String(user._id), email: user.email};
            const expiresIn = MAGIC_LINK_EXPIRY || '15m';
            const magicToken = generateMagicLinkToken(tokenPayload, expiresIn);

            // Store in DB to prevent reuse
            user.magicLinkToken = magicToken;
            user.magicLinkExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();

            // Build magic link URL
            const magicLinkUrl = `${FRONTEND_URL || 'http://localhost:5173'}/auth/magic-link?token=${magicToken}`;

            // Send email
            const transporter = createTransporter();
            await transporter.sendMail({
                from: `"PulseJobMail" <${EMAIL_FROM || EMAIL_USER}>`,
                to: email,
                subject: 'Your PulseJobMail Magic Link',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <h1 style="color: #6C63FF; text-align: center;">PulseJobMail</h1>
                        <p style="font-size: 16px; color: #333;">Click the button below to sign in to your account:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${magicLinkUrl}" 
                               style="background: linear-gradient(135deg, #6C63FF, #4ECDC4); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                Sign In to PulseJobMail
                            </a>
                        </div>
                        <p style="font-size: 13px; color: #888;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
                    </div>
                `,
            });

            console.log('SUCCESS: Magic link sent'.bgGreen.bold, {email});
            return {success: true, message: 'Magic link sent to your email inbox'};
        } catch (error: any) {
            console.error('Service Error: generateMagicLink failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Verify a magic link token and return auth tokens
     */
    static async verifyMagicLink({token}: {token: string}) {
        try {
            console.info('Service: verifyMagicLink started'.bgMagenta.white.bold);

            const decoded = verifyMagicLinkToken(token);

            const user = await UserModel.findOne({email: decoded.email}).select('+magicLinkToken');

            if (!user || user.magicLinkToken !== token) {
                return {error: generateInvalidCode('magic_link')};
            }

            // Mark as verified and clear the magic link
            user.isVerified = true;
            user.magicLinkToken = undefined;
            user.magicLinkExpiresAt = undefined;

            const tokenPayload = {userId: String(user._id), email: user.email};
            const accessToken = generateAccessToken(tokenPayload);
            const refreshToken = generateRefreshToken(tokenPayload);

            user.refreshToken = refreshToken;
            await user.save();

            console.log('SUCCESS: Magic link verified'.bgGreen.bold, {userId: user._id});
            return {user: user.toJSON(), accessToken, refreshToken};
        } catch (error: any) {
            console.error('Service Error: verifyMagicLink failed'.red.bold, error.message);
            return {error: generateInvalidCode('magic_link')};
        }
    }

    /**
     * Check authentication status for a magic link user
     */
    static async checkAuthStatus({email}: {email: string}) {
        try {
            console.info('Service: checkAuthStatus started'.bgMagenta.white.bold, {email});

            const user = await UserModel.findOne({email: email.toLowerCase()}).select('+refreshToken');
            if (!user) return {error: generateNotFoundCode('user')};

            if (!user.isVerified) {
                return {authenticated: false};
            }

            const tokenPayload = {userId: String(user._id), email: user.email};
            const accessToken = generateAccessToken(tokenPayload);
            const refreshToken = generateRefreshToken(tokenPayload);

            user.refreshToken = refreshToken;
            await user.save();

            return {authenticated: true, user: user.toJSON(), accessToken, refreshToken};
        } catch (error: any) {
            console.error('Service Error: checkAuthStatus failed'.red.bold, error);
            throw error;
        }
    }
}

export default MagicLinkService;
