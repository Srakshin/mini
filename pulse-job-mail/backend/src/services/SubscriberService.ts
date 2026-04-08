import UserModel from "../models/UserSchema";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const inferNameFromEmail = (email: string) => {
    const localPart = normalizeEmail(email).split('@')[0] || 'Subscriber';

    return localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ') || 'Subscriber';
};

class SubscriberService {

    static isValidEmail(email?: string | null) {
        if (!email) {
            return false;
        }

        return EMAIL_REGEX.test(normalizeEmail(email));
    }

    static async findOrCreateSubscriberByEmail(email: string) {
        const normalizedEmail = normalizeEmail(email);

        let user = await UserModel.findOne({email: normalizedEmail});
        if (!user) {
            user = await UserModel.create({
                authProvider: 'email',
                isVerified: true,
                email: normalizedEmail,
                name: inferNameFromEmail(normalizedEmail),
            });
        }

        return user;
    }
}

export default SubscriberService;
