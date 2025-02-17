import { LightningElement } from 'lwc';

export default class Cryptojs extends LightningElement {
    inputString = '';
    secretKey = 'your-secret-key'; // Replace with your secure key
    encryptedString = '';
    decryptedString = '';

    // Store the generated IV for reuse during decryption
    iv = null;

    // Handle input change
    handleInputChange(event) {
        this.inputString = event.target.value;
    }

    // Encrypt the string
    async handleEncrypt() {
        if (!this.inputString || !this.secretKey) {
            alert('Input string and secret key are required');
            return;
        }

        try {
            const { encryptedData, iv } = await this.encrypt(this.inputString, this.secretKey);
            this.encryptedString = encryptedData;
            this.iv = iv; // Store IV for decryption
        } catch (error) {
            console.error('Encryption failed', error);
        }
    }

    // Decrypt the string
    async handleDecrypt() {
        if (!this.encryptedString || !this.secretKey || !this.iv) {
            alert('Encrypted string, secret key, and IV are required');
            return;
        }

        try {
            const decryptedData = await this.decrypt(this.encryptedString, this.secretKey, this.iv);
            this.decryptedString = decryptedData;
        } catch (error) {
            console.error('Decryption failed', error);
        }
    }

    // AES Encryption
    async encrypt(data, secretKey) {
        // Convert secretKey to cryptographic key
        const keyMaterial = await this.getKeyMaterial(secretKey);
        const key = await this.deriveKey(keyMaterial);

        // Encode data to Uint8Array
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);

        // Generate a random IV
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // Encrypt the data
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedData
        );

        // Convert encrypted data to Base64
        const encryptedData = this.arrayBufferToBase64(encrypted);

        return { encryptedData, iv: Array.from(iv) }; // Return IV as array
    }

    // AES Decryption
    async decrypt(encryptedData, secretKey, iv) {
        // Convert secretKey to cryptographic key
        const keyMaterial = await this.getKeyMaterial(secretKey);
        const key = await this.deriveKey(keyMaterial);

        // Decode Base64 encrypted data back to ArrayBuffer
        const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);

        // Convert IV back to Uint8Array
        const ivArray = new Uint8Array(iv);

        // Decrypt the data
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            key,
            encryptedBuffer
        );

        // Decode the decrypted ArrayBuffer back to a string
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    // Convert the secret key to key material
    async getKeyMaterial(secretKey) {
        const encoder = new TextEncoder();
        return crypto.subtle.importKey(
            'raw',
            encoder.encode(secretKey),
            'PBKDF2',
            false,
            ['deriveKey']
        );
    }

    // Derive a cryptographic key from key material
    async deriveKey(keyMaterial) {
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('salt-value'), // Use a fixed salt or securely store it
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Convert ArrayBuffer to Base64 string
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
        return btoa(binary);
    }

    // Convert Base64 string to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}