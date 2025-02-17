/**
 * @description       : Controller class for checkout payment authorization
 * @author            : Code It Forward
 * @last modified on  : 09-29-2023
**/
public with sharing class AlternativePaymentController extends PreAuthorizeAlternativePayment{
    public AlternativePaymentController() {
        super();
    }
    
    /**
    * @description Method to call creating an alterative payment
    * @param billingContactPointAddressId Buyer Account billing contact point Address Id
    * @param cartId Id of the current cart
    * @param paymentMethod Payment Method, example: Check,Wire Transfer,etc.
    **/
    @AuraEnabled
    public static AlternativePaymentMethod preAuthorize(string country, string postalCode, string region, string city, string street, string cartId, string paymentMethod){
        try {
            // Create the Alternative Payment Method (APM)
            System.debug('paymentMethod-->> '+ paymentMethod);
            AlternativePaymentMethod APMId = createAlternativePaymentMethod(country, postalCode, region, city, street, cartId, paymentMethod);
            System.debug('APMId-->>>  ' + APMId);
            updateCartWithAPM(cartId, APMId.Id);
            return APMId;
            
        } catch (Exception e) {
            // Catch all other exceptions and provide a meaningful message
            System.debug('Unexpected Exception: ' + e.getMessage());
            throw new AuraHandledException('An unexpected error occurred. Please contact support if the issue persists.');
        }
    }

    @AuraEnabled(Cacheable=true)
    public static Account getCreditLimit( string accountId) {
        try {
            
            Account acc = [Select id,Credit_limit__c from account where Id =: accountId limit 1];
            System.debug('acc: ' + acc);
            return acc;
            
        } catch (Exception e) {
            // Catch all other exceptions and provide a meaningful message
            System.debug('Unexpected Exception: ' + e.getMessage());
            throw new AuraHandledException('Could not fetch credit Limit');
        }
    }

    @AuraEnabled()
    public static Account updateCreditLimit( string accountId, Decimal total) {
        try {
            
            Account acc = [Select id,Credit_limit__c from account where Id =: accountId limit 1];
            acc.Credit_limit__c = acc.Credit_limit__c - total;
            update acc;
            return acc;
            
        } catch (Exception e) {
            // Catch all other exceptions and provide a meaningful message
            System.debug('Unexpected Exception: ' + e.getMessage());
            throw new AuraHandledException('Could not fetch credit Limit');
        }
    }
}