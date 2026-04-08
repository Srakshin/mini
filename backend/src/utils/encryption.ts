import "colors";
import CryptoJS from "crypto-js";
import {ENCRYPTION_SECRET} from "../config/config";

/**
 * Encrypt a string value (e.g. Gmail OAuth tokens) for at-rest storage
 */
const encrypt = (text: string): string => {
    try {
        if (!ENCRYPTION_SECRET) {
            throw new Error('ENCRYPTION_SECRET is not defined');
        }
        return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
    } catch (error: any) {
        console.error('Service Error: Encryption failed'.red.bold, error.message);
        throw error;
    }
};

/**
 * Decrypt an encrypted string value
 */
const decrypt = (ciphertext: string): string => {
    try {
        if (!ENCRYPTION_SECRET) {
            throw new Error('ENCRYPTION_SECRET is not defined');
        }
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_SECRET);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
            throw new Error('Decryption resulted in empty string — possible key mismatch');
        }
        return decrypted;
    } catch (error: any) {
        console.error('Service Error: Decryption failed'.red.bold, error.message);
        throw error;
    }
};

export {encrypt, decrypt};
