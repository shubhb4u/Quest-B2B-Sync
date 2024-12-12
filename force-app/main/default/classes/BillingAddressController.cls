/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 11-26-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class BillingAddressController {
    @AuraEnabled
    public static String updateCartDetails(String cartId, String billingStreet, String billingCity, String billingState, String billingCountry, String billingPostalCode,Boolean separateDeliveryAddress,string contactName) {
        try {
            if (String.isBlank(cartId)) {
                throw new AuraHandledException('Cart ID is required.');
            }

            WebCart cart = [SELECT Id, BillingStreet, BillingCity, BillingState, BillingCountry, BillingPostalCode
                            FROM WebCart
                            WHERE Id = :cartId
                            LIMIT 1];

            cart.BillingStreet = billingStreet;
            cart.BillingCity = billingCity;
            cart.BillingState = billingState;
            cart.BillingCountry = billingCountry;
            cart.BillingPostalCode = billingPostalCode;

            update cart;

            if(separateDeliveryAddress == false){
                CartDeliveryGroup deliveryGroup = [SELECT CartId, Id, DeliverToName, DeliverToFirstName, DeliverToLastName, DeliverToStreet, DeliverToCity, DeliverToState, DeliverToPostalCode, DeliverToCountry  FROM CartDeliveryGroup WHERE CartId = :cartId];
                deliveryGroup.DeliverToName = contactName;
                deliveryGroup.DeliverToStreet = billingStreet ;
                deliveryGroup.DeliverToCity = billingCity;
                deliveryGroup.DeliverToState = billingState;
                deliveryGroup.DeliverToPostalCode = billingPostalCode;
                deliveryGroup.DeliverToCountry = billingCountry;
                update deliveryGroup;
            }
			system.debug('Cart updtaed successfully');
            return 'Cart updated successfully!';
        } catch (Exception e) {
            throw new AuraHandledException('Error updating cart: ' + e.getMessage());
        }
    }
}