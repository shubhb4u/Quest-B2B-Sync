/**
 * @description       : General Pre-authorization Payment Class
 * @author            : Code It Forward
 * @last modified on  : 09-29-2023
**/
public abstract without sharing class PreAuthorizeAlternativePayment {
    public PreAuthorizeAlternativePayment() {
    }

    /**
    * @description Method that create Alternative Payment Method record
    * @param billingContactPointAddressId Buyer Account billing contact point Address Id
    * @param cartId Id of the current cart
    * @param paymentType Payment Method, example: Check,Wire Transfer,etc.
    * @return string Id of the created Alternative Payment Method
    **/
    public static AlternativePaymentMethod createAlternativePaymentMethod(String country, String postalCode, String region, String city, String street, String cartId, String paymentType) {
        try {
            // Initialize the Alternative Payment Method object
            AlternativePaymentMethod oneAlternativePaymentMethod = new AlternativePaymentMethod();
            oneAlternativePaymentMethod.AccountId = CommerceUtils.getUserAccountID();
            oneAlternativePaymentMethod.GatewayToken = paymentType + '-' + Integer.valueOf(Math.floor(1000 + Math.random() * 9000));
            oneAlternativePaymentMethod.PaymentMethodCity = city;
            oneAlternativePaymentMethod.PaymentMethodCountry = country;
            oneAlternativePaymentMethod.PaymentMethodPostalCode = postalCode;
            oneAlternativePaymentMethod.PaymentMethodState = region;
            oneAlternativePaymentMethod.PaymentMethodStreet = street;
            oneAlternativePaymentMethod.ProcessingMode = 'External';
            oneAlternativePaymentMethod.Status = 'Active';
            oneAlternativePaymentMethod.PaymentGatewayId = getPaymentMethodGateway(paymentType);
            
            // Attempt to insert the record
            insert oneAlternativePaymentMethod;
            System.debug('oneAlternativePaymentMethod-->> '+ oneAlternativePaymentMethod);
    
            // Return the ID of the inserted record
            return oneAlternativePaymentMethod;
        
        } catch (NullPointerException npe) {
            // Handle any null pointer exceptions
            System.debug('Null Pointer Exception: ' + npe.getMessage());
            throw new AuraHandledException('An unexpected error occurred. Please ensure all required fields are provided.');
        } catch (Exception e) {
            // Handle all other exceptions
            System.debug('Unexpected Exception: ' + e.getMessage());
            throw new AuraHandledException('An unexpected error occurred. Please contact support if the issue persists.');
        }
    }
    

    /**
    * @description Update cart record to assign the alternative payment method to paymentMethodId field
    * @param cartId Id of the current cart
    * @param APMId Alternative Payment Method to save as Cart PaymentMethodId
    **/
    public static void updateCartWithAPM (string cartId, string APMId){
        WebCart cartToUpdate = new WebCart(Id=cartId);
        cartToUpdate.PaymentMethodId=APMId;
        update cartToUpdate;
        
    }

    @AuraEnabled
    public static AlternativePaymentMethod getAltpayMet(string cartId){
        try {
            List<WebCart> cartobj = [SELECT Id, PaymentMethodId, PaymentGroupId, Status, Type from WebCart where id = :cartId Limit 1];
            String paymentMethodId = cartobj[0].PaymentMethodId;
            AlternativePaymentMethod  apm = [SELECT Id, OwnerId, AlternativePaymentMethodNumber, PaymentGatewayId, NickName, GatewayToken, GatewayTokenDetails,
             Email, AccountId, Status, CompanyName, PaymentMethodStreet, PaymentMethodCity, PaymentMethodState, PaymentMethodPostalCode, PaymentMethodCountry,
              PaymentMethodAddress, ProcessingMode,  Phone, IpAddress, AuditEmail, IsAutoPayEnabled, PaymentMethodType, PaymentMethodSubType,
               PaymentMethodDetails, Type FROM AlternativePaymentMethod WHERE Id = :paymentMethodId];
            return apm;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * @description Get the Payment Gateway for the Payment Method selected.
     * @param paymentMethod - Payment Method Selected.
     * @return Payment Gateway Id.
     */

    @AuraEnabled
    public static String getPaymentMethodGateway(String paymentMethod) {
        System.debug('paymentMethod in PreAuthAltPayment class -->> '+ paymentMethod);
        String paymentGatewayId;
        List<PaymentGateway> paymentGateways = [
                SELECT Id
                FROM PaymentGateway
                WHERE PaymentGatewayName = :paymentMethod
                LIMIT 1];

        if (!paymentGateways.isEmpty()) {
            paymentGatewayId = paymentGateways[0].Id;
        } else {
            System.debug('No Payment Gateway for Payment Method' + paymentMethod);
        }

        return paymentGatewayId;
    }

    /**
    * @description Get active payment Gateway
    * @param webStoreId Store Id
    * @return String Id of the payment Gateway
    **/
    public static String getPaymentGatewayId(String webstoreId) {
        String paymentGatewayId = null;
        try {
            paymentGatewayId = [SELECT Integration FROM StoreIntegratedService WHERE ServiceProviderType='Payment' AND StoreId=:webStoreId].Integration;
        } catch (Exception e) {
            System.debug('Error querying the payment integration from StoreIntegratedService: ' + e.getMessage());
        }
        return paymentGatewayId;
    }


    @AuraEnabled
    public static String getOrderSummaryId(String OrderRef) {
        String orderSumId;
        List<OrderSummary> orderSummaryList = [
                SELECT Id
                FROM OrderSummary
                WHERE OrderNumber = :OrderRef
                LIMIT 1];

        if (!orderSummaryList.isEmpty()) {
            orderSumId = orderSummaryList[0].Id;
        } else {
            System.debug('No Payment Gateway for Payment Method' + orderSumId);
        }

        return orderSumId;
    }
}