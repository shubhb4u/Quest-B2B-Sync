public with sharing class EncryptionUtil {
    private static String SECRET_KEY = '';  // 32 chars = 256 bits
    private static String INIT_VECTOR = '';  // 16 chars for AES-128 IV

    /**
     * Retrieves encryption settings from the custom metadata `Global_Encryption_Keys__c`
     * and initializes the secret key and initialization vector for AES encryption.
     *
     * This method fetches the values associated with the key 'PaymentEncryption'
     * from `Global_Encryption_Keys__c` and assigns them to `SECRET_KEY` and `INIT_VECTOR`.
     *
     *     SECRET_KEY: A 32-character (256-bit) AES encryption key.
     *     INIT_VECTOR: A 16-character initialization vector for AES-128.
     */
    private static void setSettings() {
        try {
            Global_Encryption_Keys__c setting = Global_Encryption_Keys__c.getValues('PaymentEncryption');
            System.debug('PaymentEncryption: ' + setting);
            // 32-byte (256-bit) AES key (32 chars = 256 bits)
            SECRET_KEY = setting.SECRET_KEY__c;
            // 16 chars for AES-128 IV
            INIT_VECTOR = setting.INIT_VECTOR__c;
        } catch ( Exception e) {
            System.debug('EncryptionUtil.setSettings Error: ' + e.getMessage());
        }
    }

    /**
     * Encrypt a given string using AES-256
     * @param plainText - The text to encrypt
     * @return Base64 encoded encrypted string
     */
    @AuraEnabled
    public static String encryptString(String plainText) {
        if (SECRET_KEY == '' || INIT_VECTOR == '') {
            setSettings();
        }
        try {
            Blob keyBlob = Blob.valueOf(SECRET_KEY);
            Blob ivBlob = Blob.valueOf(INIT_VECTOR);
            Blob dataBlob = Blob.valueOf(plainText);

            // Encrypt using AES-256 with CBC mode and PKCS5 padding
            Blob encryptedBlob = Crypto.encrypt('AES256', keyBlob, ivBlob, dataBlob);

            // Encode in Base64 for storage
            return EncodingUtil.base64Encode(encryptedBlob);
        } catch (Exception e) {
            System.debug('Encryption Error: ' + e.getMessage());
            return null;
        }
    }

    /**
     * Decrypt a given encrypted string using AES-256
     * @param encryptedText - Base64 encoded encrypted string
     * @return Decrypted plain text
     */
    @AuraEnabled
    public static String decryptString(String encryptedText) {
        try {
            if (SECRET_KEY == '' || INIT_VECTOR == '') {
                setSettings();
            }

            Blob keyBlob = Blob.valueOf(SECRET_KEY);
            Blob ivBlob = Blob.valueOf(INIT_VECTOR);

            // Decode Base64 to get original encrypted blob
            Blob encryptedBlob = EncodingUtil.base64Decode(encryptedText);

            // Decrypt using AES-256 with CBC mode
            Blob decryptedBlob = Crypto.decrypt('AES256', keyBlob, ivBlob, encryptedBlob);

            return decryptedBlob.toString();
        } catch (Exception e) {
            System.debug('Decryption Error: ' + e.getMessage());
            return null;
        }
    }
}