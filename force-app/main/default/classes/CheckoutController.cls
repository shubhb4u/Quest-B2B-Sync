public with sharing class CheckoutController {
    @AuraEnabled
    public static void saveShippingInfo(Map<String, String> shippingDetails, String cartId) {
        // Perform server-side logic (e.g., save to an Order or custom object)
        System.debug('Received Shipping Info: ' + shippingDetails);

        CartDeliveryGroup deliveryGroup = [SELECT Id, CartId FROM CartDeliveryGroup WHERE CartId = :cartId];
        System.debug('CartDeliveryGroup: ' + deliveryGroup);

        // CartDeliveryGroupMethod deliveryMethod = [SELECT Id, Name, CartDeliveryGroupId, CartDeliveryGroup.CartId, CartDeliveryGroup.Name, ShippingFee, DeliveryMethodId
        //                                           FROM CartDeliveryGroupMethod
        //                                           WHERE CartDeliveryGroupId = :deliveryGroup.Id];
        // System.debug('CartDeliveryGroupMethod: ' + deliveryMethod);
        // // Example: Save shipping info to an Order
        // Order order = [SELECT Id, ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry FROM Order WHERE Id = :UserInfo.getUserId()];
        // order.ShippingStreet = shippingDetails.get('street');
        // order.ShippingCity = shippingDetails.get('city');
        // order.ShippingState = shippingDetails.get('state');
        // order.ShippingPostalCode = shippingDetails.get('postalCode');
        // order.ShippingCountry = shippingDetails.get('country');
        // update order;

         // Example: Save shipping info to an Order
         CartDeliveryGroup deliveryGroup1 = [SELECT CartId, Id, DeliverToName, DeliverToFirstName, DeliverToLastName, DeliverToStreet, DeliverToCity, DeliverToState, DeliverToPostalCode, DeliverToCountry  FROM CartDeliveryGroup WHERE CartId = :cartId];
         deliveryGroup1.DeliverToName = shippingDetails.get('fullName');
         deliveryGroup1.DeliverToStreet = shippingDetails.get('street');
         deliveryGroup1.DeliverToCity = shippingDetails.get('city');
         deliveryGroup1.DeliverToState = shippingDetails.get('state');
         deliveryGroup1.DeliverToPostalCode = shippingDetails.get('postalCode');
         deliveryGroup1.DeliverToCountry = shippingDetails.get('country');
        update deliveryGroup1;
    }

    @AuraEnabled
    public static CartDeliveryGroup getShippingInfo(String cartId) {
        // Perform server-side logic (e.g., save to an Order or custom object)
        System.debug('Received Shipping Info: ' + cartId);

        CartDeliveryGroup deliveryGroup = [SELECT Id, CartId FROM CartDeliveryGroup WHERE CartId = :cartId];
        System.debug('CartDeliveryGroup: ' + deliveryGroup);

        // CartDeliveryGroupMethod deliveryMethod = [SELECT Id, Name, CartDeliveryGroupId, CartDeliveryGroup.CartId, CartDeliveryGroup.Name, ShippingFee, DeliveryMethodId
        //                                           FROM CartDeliveryGroupMethod
        //                                           WHERE CartDeliveryGroupId = :deliveryGroup.Id];
         // Example: get shipping info to CartDeliveryGroup
         CartDeliveryGroup deliveryGroup1 = [SELECT CartId, Id, DeliverToName, DeliverToFirstName, DeliverToLastName, DeliverToStreet, DeliverToCity, DeliverToState, DeliverToPostalCode, DeliverToCountry  FROM CartDeliveryGroup WHERE CartId = :cartId];

        return deliveryGroup1;
    }

    @AuraEnabled
    public static void updateDeliveryGroup(Map<String, String> shippingDetails) {
        /*
          Saves the delivery method (e.g., DHL, Inline, etc.)SELECT Id, Name,
            (SELECT Id, Name, DeliveryStreet, DeliveryCity, DeliveryState, DeliveryPostalCode, DeliveryCountry
                FROM SBQQ__DeliveryGroups__r)
        FROM SBQQ__Cart__c
        WHERE Id = :cartId
        LIMIT 1

        */


        // String deliveryGroupId = shippingDetails.get('deliveryGroupId');
        // if (String.isEmpty(deliveryGroupId)) {
        //     throw new AuraHandledException('Delivery Group ID is required.');
        // }

        // DeliveryGroup dg = [SELECT Id, DeliveryStreet, DeliveryCity, DeliveryState, DeliveryPostalCode, DeliveryCountry
        //                     FROM DeliveryGroup
        //                     WHERE Id = :deliveryGroupId
        //                     LIMIT 1];

        // dg.DeliveryStreet = shippingDetails.get('deliveryStreet');
        // dg.DeliveryCity = shippingDetails.get('deliveryCity');
        // dg.DeliveryState = shippingDetails.get('deliveryState');
        // dg.DeliveryPostalCode = shippingDetails.get('deliveryPostalCode');
        // dg.DeliveryCountry = shippingDetails.get('deliveryCountry');

        // update dg;
    }
}