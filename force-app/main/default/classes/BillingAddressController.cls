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

    @AuraEnabled
    public static Map<String, String> getBillingAddress(String cartId) {
        try {
            if (String.isBlank(cartId)) {
                throw new AuraHandledException('Cart ID is required.');
            }

            // Fetch the cart record
            WebCart cart = [
                SELECT Id, BillingStreet, BillingCity, BillingState, BillingCountry, BillingPostalCode
                FROM WebCart
                WHERE Id = :cartId
                LIMIT 1
            ];

            // Return the billing address as a map
            Map<String, String> billingAddress = new Map<String, String>();
            billingAddress.put('BillingStreet', cart.BillingStreet);
            billingAddress.put('BillingCity', cart.BillingCity);
            billingAddress.put('BillingState', cart.BillingState);
            billingAddress.put('BillingCountry', cart.BillingCountry);
            billingAddress.put('BillingPostalCode', cart.BillingPostalCode);
            
           System.debug('Returning billingAddress: ' + billingAddress);
            return billingAddress;
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving billing address: ' + e.getMessage());
        }
    }
}