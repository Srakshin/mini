import "colors";
import bcrypt from "bcryptjs";
import UserModel, {IUser} from "../models/UserSchema";
import UserPreferenceModel from "../models/UserPreferenceSchema";
import {generateAccessToken, generateRefreshToken, verifyRefreshToken} from "../utils/jwt.utils";
import {getTokensFromCode, getGoogleUserInfo} from "../utils/gmailOAuth.helper";
import {generateInvalidCode, generateMissingCode, generateNotFoundCode} from "../utils/generateErrorCodes";
import {IRegisterParams, ILoginParams, IResetPasswordParams, IGoogleOAuthParams} from "../types/auth";

/** Password validation regex: min 6 chars, lowercase, uppercase, special char */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~]).{6,}$/;

class AuthService {

    /**
     * Register a new user with email/password
     */
    static async registerUser({name, email, password, confirmPassword}: IRegisterParams) {
        try {
            console.info('Service: registerUser started'.bgMagenta.white.bold, {email});

            if (!name) return {error: generateMissingCode('name')};
            if (!password) return {error: generateMissingCode('password')};
            if (!confirmPassword) return {error: generateMissingCode('confirm_password')};

            if (!PASSWORD_REGEX.test(password)) {
                return {error: generateInvalidCode('password')};
            }

            if (password !== confirmPassword) {
                return {error: 'PASSWORD_MISMATCH'};
            }

            const existingUser = await UserModel.findOne({email: email.toLowerCase()});
            if (existingUser) {
                return {error: 'ALREADY_REGISTERED'};
            }

            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await UserModel.create({
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                authProvider: 'email',
                isVerified: true, // Auto-verify for now; magic link flow verifies later
            });

            // Create default preferences for the new user
            try {
                await UserPreferenceModel.create({userId: user._id});
            } catch (prefError) {
                console.error('Service Error: Failed to create user preference'.red.bold, prefError);
                // Clean up: remove the user if preference creation fails
                await UserModel.findByIdAndDelete(user._id);
                return {error: 'CREATE_USER_PREFERENCE_FAILED'};
            }

            console.log('SUCCESS: User registered'.bgGreen.bold, {userId: user._id});
            return {user};
        } catch (error: any) {
            console.error('Service Error: registerUser failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Login with email/password — returns access + refresh tokens
     */
    static async loginUser({email, password}: ILoginParams) {
        try {
            console.info('Service: loginUser started'.bgMagenta.white.bold, {email});

            const user = await UserModel.findOne({email: email.toLowerCase()}).select('+password +refreshToken');
            if (!user) {
                return {error: generateNotFoundCode('user')};
            }

            if (!user.isVerified) {
                return {error: 'USER_NOT_VERIFIED'};
            }

            if (user.authProvider === 'google') {
                return {error: 'GOOGLE_OAUTH_USER'};
            }

            if (user.authProvider === 'magic_link') {
                return {error: 'MAGIC_LINK_USER'};
            }

            if (!user.password) {
                return {error: generateInvalidCode('credentials')};
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return {error: generateInvalidCode('credentials')};
            }

            const tokenPayload = {userId: String(user._id), email: user.email};
            const accessToken = generateAccessToken(tokenPayload);
            const refreshToken = generateRefreshToken(tokenPayload);

            // Store refresh token
            user.refreshToken = refreshToken;
            await user.save();

            console.log('SUCCESS: User logged in'.bgGreen.bold, {userId: user._id});
            return {user: user.toJSON(), accessToken, refreshToken};
        } catch (error: any) {
            console.error('Service Error: loginUser failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Reset password for authenticated user
     */
    static async resetPassword({email, currentPassword, newPassword}: IResetPasswordParams) {
        try {
            console.info('Service: resetPassword started'.bgMagenta.white.bold, {email});

            const user = await UserModel.findOne({email}).select('+password');
            if (!user) return {error: generateNotFoundCode('user')};
            if (!user.password) return {error: 'NO_PASSWORD_SET'};
            if (!currentPassword) return {error: generateMissingCode('current_password')};
            if (!newPassword) return {error: generateMissingCode('new_password')};

            const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentValid) return {error: generateInvalidCode('credentials')};

            if (currentPassword === newPassword) return {error: 'SAME_PASSWORD'};

            if (!PASSWORD_REGEX.test(newPassword)) {
                return {error: generateInvalidCode('new_password')};
            }

            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();

            console.log('SUCCESS: Password reset'.bgGreen.bold, {userId: user._id});
            return {user};
        } catch (error: any) {
            console.error('Service Error: resetPassword failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Refresh an expired access token using a valid refresh token
     */
    static async refreshToken({refreshToken}: {refreshToken: string}) {
        try {
            console.info('Service: refreshToken started'.bgMagenta.white.bold);

            if (!refreshToken) return {error: generateMissingCode('refresh_token')};

            const decoded = verifyRefreshToken(refreshToken);

            const user = await UserModel.findOne({email: decoded.email}).select('+refreshToken');
            if (!user) return {error: generateNotFoundCode('user')};

            // Verify token matches stored token (token rotation)
            if (user.refreshToken !== refreshToken) {
                return {error: generateInvalidCode('refresh_token')};
            }

            const tokenPayload = {userId: String(user._id), email: user.email};
            const newAccessToken = generateAccessToken(tokenPayload);

            console.log('SUCCESS: Token refreshed'.bgGreen.bold, {userId: user._id});
            return {accessToken: newAccessToken};
        } catch (error: any) {
            console.error('Service Error: refreshToken failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Login/register with Google OAuth
     */
    static async loginWithGoogle({code}: IGoogleOAuthParams) {
        try {
            console.info('Service: loginWithGoogle started'.bgMagenta.white.bold);

            const {oauth2Client} = await getTokensFromCode(code);
            const googleUser = await getGoogleUserInfo(oauth2Client);

            if (!googleUser.email) {
                return {error: generateInvalidCode('email_address')};
            }

            let user = await UserModel.findOne({email: googleUser.email.toLowerCase()});

            if (!user) {
                // Register new Google user
                user = await UserModel.create({
                    name: googleUser.name || googleUser.email.split('@')[0],
                    email: googleUser.email.toLowerCase(),
                    googleId: googleUser.id,
                    profilePicture: googleUser.picture || undefined,
                    authProvider: 'google',
                    isVerified: true,
                });

                // Create default preferences
                await UserPreferenceModel.create({userId: user._id});
            } else if (!user.googleId) {
                // Link Google ID to existing account
                user.googleId = googleUser.id || user.googleId;
                if (googleUser.picture && !user.profilePicture) {
                    user.profilePicture = googleUser.picture;
                }
                await user.save();
            }

            const tokenPayload = {userId: String(user._id), email: user.email};
            const accessToken = generateAccessToken(tokenPayload);
            const refreshToken = generateRefreshToken(tokenPayload);

            user.refreshToken = refreshToken;
            await user.save();

            console.log('SUCCESS: Google login completed'.bgGreen.bold, {userId: user._id});
            return {user: user.toJSON(), accessToken, refreshToken};
        } catch (error: any) {
            console.error('Service Error: loginWithGoogle failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Get user by email
     */
    static async getUserByEmail({email}: {email: string}) {
        try {
            const user = await UserModel.findOne({email});
            return {user};
        } catch (error: any) {
            console.error('Service Error: getUserByEmail failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    static async updateUser({email, name, password, profilePicture}: {email: string; name?: string; password?: string; profilePicture?: string}) {
        try {
            console.info('Service: updateUser started'.bgMagenta.white.bold, {email});

            const user = await UserModel.findOne({email}).select('+password');
            if (!user) return {error: generateNotFoundCode('user')};

            if (name !== undefined) user.name = name;
            if (profilePicture !== undefined) user.profilePicture = profilePicture;

            if (password !== undefined) {
                if (!PASSWORD_REGEX.test(password)) {
                    return {error: generateInvalidCode('password')};
                }
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(password, salt);
            }

            await user.save();
            console.log('SUCCESS: User updated'.bgGreen.bold, {userId: user._id});
            return {user: user.toJSON()};
        } catch (error: any) {
            console.error('Service Error: updateUser failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Delete user account and all associated data
     */
    static async deleteAccount({email}: {email: string}) {
        try {
            console.info('Service: deleteAccount started'.bgMagenta.white.bold, {email});

            const user = await UserModel.findOne({email});
            if (!user) return {error: generateNotFoundCode('user')};

            // Remove user preferences
            await UserPreferenceModel.deleteMany({userId: user._id});

            // Remove the user
            await UserModel.findByIdAndDelete(user._id);

            console.log('SUCCESS: Account deleted'.bgGreen.bold, {userId: user._id});
            return {isDeleted: true};
        } catch (error: any) {
            console.error('Service Error: deleteAccount failed'.red.bold, error);
            throw error;
        }
    }
}

export default AuthService;
