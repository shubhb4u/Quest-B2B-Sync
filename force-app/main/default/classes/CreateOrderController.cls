/**
* @description       : 
* @author            : ChangeMeIn@UserSettingsUnder.SFDoc
* @group             : 
* @last modified on  : 12-09-2024
* @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public without sharing class CreateOrderController {
    
    @AuraEnabled
    public static String createOrderFromCart(String cartId, String accountId, String storeId,Map<String, Object> paymentDetails,string contactName) {
        try {
            // Query Cart details
            WebCart cart = [
                SELECT Id, TotalAmount, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry 
                FROM WebCart 
                WHERE Id = :cartId
                LIMIT 1
            ];
            System.debug('cart===>' + cart);
            
            // Query Cart Items
            List<CartItem> cartItems = [
                SELECT Id, Product2Id, Quantity, SalesPrice 
                FROM CartItem 
                WHERE CartId = :cartId
            ];
            System.debug('cartItems==>' + cartItems);
            
            // Get Pricebook ID
            Pricebook2 priceBook = [
                SELECT Id, Name 
                FROM Pricebook2 
                WHERE Name = 'CI_Quest EStore Price Book' 
                LIMIT 1
            ];
            Id priceBookId = priceBook.Id;
            System.debug('priceBookId===>' + priceBookId);
            
            // Create an Order
            Order newOrder = new Order(
                AccountId = accountId,
                EffectiveDate = Date.today(),
                Status = 'Draft',
                SalesStoreId = storeId,
                BillingStreet = cart.BillingStreet,
                BillingCity = cart.BillingCity,
                BillingState = cart.BillingState,
                BillingPostalCode = cart.BillingPostalCode,
                BillingCountry = cart.BillingCountry,
                Pricebook2Id = priceBookId
            );
            insert newOrder;
            
            System.debug('newOrder===>' + newOrder);
            
            // Query Order Delivery Method
            OrderDeliveryMethod deliveryMethod = [
                SELECT Id 
                FROM OrderDeliveryMethod
                LIMIT 1
            ];
            System.debug('deliveryMethod==>' + deliveryMethod);
            
            // Create an OrderDeliveryGroup
            CartDeliveryGroup deliveryGroup = [
                SELECT DeliverToName, DeliverToStreet, DeliverToCity, DeliverToState, DeliverToPostalCode, DeliverToCountry 
                FROM CartDeliveryGroup 
                WHERE CartId = :cartId
                LIMIT 1
            ];
            System.debug('deliveryGroup==>' + deliveryGroup);
            
            OrderDeliveryGroup newDeliveryGroup = new OrderDeliveryGroup(
                OrderId = newOrder.Id,
                DeliverToName = deliveryGroup.DeliverToName,
                DeliverToStreet = deliveryGroup.DeliverToStreet,
                DeliverToCity = deliveryGroup.DeliverToCity,
                DeliverToState = deliveryGroup.DeliverToState,
                DeliverToPostalCode = deliveryGroup.DeliverToPostalCode,
                DeliverToCountry = deliveryGroup.DeliverToCountry,
                OrderDeliveryMethodId = deliveryMethod.Id);
            insert newDeliveryGroup;
            System.debug('newDeliveryGroup===>' + newDeliveryGroup);
            Map<Id, PricebookEntry> productToPricebookEntryMap = new Map<Id, PricebookEntry>();
            Set<Id> productIds = new Set<Id>();
            for (CartItem cartItem : cartItems) {
                productIds.add(cartItem.Product2Id);
            }
            system.debug('productIds==> '+productIds);
            // Query PricebookEntry for the extracted Product2Ids
            List<PricebookEntry> pricebookEntries = [
                SELECT Id, Product2Id, UnitPrice,Product2.Adjustment_Amount__c, Product2.Adjustment_Percent__c,Product2.Final_price__c 
                FROM PricebookEntry 
                WHERE Pricebook2Id = :priceBookId 
                AND Product2Id IN :productIds
            ];
            system.debug('pricebookEntries==>' +pricebookEntries);
            for (PricebookEntry pbe : pricebookEntries) {
                productToPricebookEntryMap.put(pbe.Product2Id, pbe);
            }
            system.debug('productToPricebookEntryMap=>' +productToPricebookEntryMap);
            // Validate Pricebook Entries
            for (CartItem cartItem : cartItems) {
                System.debug('Checking Product2Id: ' + cartItem.Product2Id);
                System.debug('Map Keys: ' + productToPricebookEntryMap.keySet());
                if (!productToPricebookEntryMap.containsKey(cartItem.Product2Id)) {
                    System.debug('Missing Product2Id in Map: ' + cartItem.Product2Id);
                    throw new AuraHandledException('Product is not listed in the pricebook.');
                }
            }
            blng__BillingRule__c billingRules = [SELECT Id FROM blng__BillingRule__c LIMIT 1];
            blng__RevenueRecognitionRule__c revenueRecognigation = [select id from blng__RevenueRecognitionRule__c
            LIMIT 1];
            blng__TaxRule__c taxRule = [select id from blng__TaxRule__c
            LIMIT 1];

            // Create Order Products
            List<OrderItem> orderItems = new List<OrderItem>();
            for (CartItem cartItem : cartItems) {
                system.debug('Inside cartItems for loop');
                PricebookEntry pbe = productToPricebookEntryMap.get(cartItem.Product2Id);
                OrderItem orderItem = new OrderItem(
                    OrderId = newOrder.Id,
                    PricebookEntryId = pbe.Id,
                    blng__BillingRule__c = billingRules.id,
                    blng__RevenueRecognitionRule__c = revenueRecognigation.id,
                    blng__TaxRule__c = taxRule.id,
                    Quantity = cartItem.Quantity,
                    UnitPrice = cartItem.SalesPrice,
                    TotalLineAmount = cartItem.Quantity * cartItem.SalesPrice,
                    OrderDeliveryGroupId = newDeliveryGroup.Id);
                orderItems.add(orderItem);
                system.debug('orderItems' +orderItems);
            }
            if (!orderItems.isEmpty()){
                insert orderItems;
            }
            system.debug('orderItems=>' +orderItems);
            newOrder.Status = 'Activated';
            update newOrder;
            
            System.debug('newOrder==>' + newOrder);
            System.debug('orderItems===>' + orderItems);
            
            delete cartItems;
            delete cart;
            System.debug('Cart and its items cleared.');
            
            // create CardPaymentMethod record
            CardPaymentMethod paymentMethod = new CardPaymentMethod();
            paymentMethod.ProcessingMode = 'External';
            paymentMethod.Status = 'Inactive';
            paymentMethod.AccountId = accountId;
            paymentMethod.CardHolderName = contactName;
            paymentMethod.CardLastFour = Integer.valueOf((String)paymentDetails.get('cardLastFour'));
            paymentMethod.CardType = determineCardType((String)paymentDetails.get('cardNumber'));
            paymentMethod.ExpiryMonth = paymentDetails.containsKey('expiryMonth') && paymentDetails.get('expiryMonth') != null 
                                        ? Integer.valueOf((String)paymentDetails.get('expiryMonth')) 
                                        : null;
            paymentMethod.ExpiryYear = paymentDetails.containsKey('expiryYear') && paymentDetails.get('expiryYear') != null 
                                        ? Integer.valueOf((String)paymentDetails.get('expiryYear')) 
                                        : null;
            paymentMethod.GatewayToken = (String)paymentDetails.get('gatewayToken');
            insert paymentMethod;


            System.debug('paymentDetails: ' + paymentDetails);
            System.debug('CardPaymentMethod: ' + paymentMethod);
            // Create Payment Group
            PaymentGroup pg = new PaymentGroup(
                SourceObjectId = newOrder.Id,
                CurrencyIsoCode = 'USD'
            );
            insert pg;
            System.debug('pg====>' + pg);
            
            // Create Payment Authorization
            PaymentAuthorization pa = new PaymentAuthorization(
                Amount = cart.TotalAmount,
                ProcessingMode = 'External',
                Status = 'Draft',
                PaymentGroupId = pg.Id,
                PaymentMethodId = paymentMethod.id
            );
            insert pa;
            System.debug('PA====>' + pa);
            // Create Order Summary
            ConnectApi.OrderSummaryInputRepresentation inputRepresentation = new ConnectApi.OrderSummaryInputRepresentation();
            inputRepresentation.orderId = newOrder.Id;
            ConnectApi.OrderSummaryOutputRepresentation outputRepresentation = ConnectApi.OrderSummaryCreation.createOrderSummary(inputRepresentation);
            System.debug('OrderSummary====>' + outputRepresentation);
            return newOrder.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating order: ' + e.getMessage());
        }
    }
    public static String determineCardType(String cardNumber) {
        if (cardNumber.startsWith('4')) return 'Visa';
        if (cardNumber.startsWith('5')) return 'Master Card';
        if (cardNumber.startsWith('3')) return 'American Express';
        return 'Unknown';
    }
}