/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 11-27-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class CartDetailsController {
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getCartDetails(Id cartId) {
        try {
            // Query to get cart items
            List<CartItem> cartItemList = [SELECT Id, Name, Product2.Description, Quantity, TotalPrice, SalesPrice,Product2.Feature_1__c, Product2.Feature_2__c, Product2.Feature_3__c,Product2.Adjustment_Amount__c, Product2.Adjustment_Percent__c,Product2.Final_price__c 
      
                                            FROM CartItem WHERE CartId = :cartId];
            
            // Query to get the Billing Address
            WebCart cart = [SELECT Id, BillingStreet, BillingCity, BillingState, BillingCountry, BillingPostalCode,TotalAmount
                            FROM WebCart WHERE Id = :cartId LIMIT 1];
            
            // Query to get the Shipping Address (Delivery Address)
            CartDeliveryGroup deliveryGroup = [SELECT CartId, DeliverToName, DeliverToStreet, DeliverToCity, 
                                                    DeliverToState, DeliverToPostalCode, DeliverToCountry
                                                FROM CartDeliveryGroup WHERE CartId = :cartId LIMIT 1];
            
            // Create a Map to return cart items and address information
            Map<String, Object> result = new Map<String, Object>();
            result.put('cartItems', cartItemList);
            result.put('billingAddress', cart);
            result.put('shippingAddress', deliveryGroup);
            
            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cart details: ' + e.getMessage());
        }
    }
}