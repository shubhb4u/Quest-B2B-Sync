/**
 * @description       :
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             :
 * @last modified on  : 12-03-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public without sharing class OrderConfirmationController {

    @AuraEnabled
    public static Map<String, Object> getOrderDetails(String orderId ) {
        try {
            // Fetch Order details


            Order order = [
                SELECT Id, EffectiveDate, Account.Name, OrderNumber
                FROM Order
                WHERE Id = :orderId
                LIMIT 1
            ];

            // Fetch the PaymentAuthorization record
            PaymentAuthorization payment = [
                SELECT Id, PaymentGroup.SourceObjectId, AccountId, Amount, CurrencyIsoCode, PaymentMethodId
                FROM PaymentAuthorization
                WHERE PaymentGroup.SourceObjectId = :orderId
                LIMIT 1
            ];

            // Fetch CardPaymentMethod details using PaymentMethodId
            AlternativePaymentMethod apm = null;
            try {
                // Fetch CardPaymentMethod details using PaymentMethodId
                if (payment.PaymentMethodId != null) {
                    apm = [
                        SELECT cardLastFour__C,
                        Type,
                        PaymentMethodType
                        FROM AlternativePaymentMethod
                        WHERE Id = :payment.PaymentMethodId
                        LIMIT 1
                    ];
                }

            } catch(Exception e) {
                System.debug('Error while fetching CardLastFour from PaymentMethodId: ' + payment.PaymentMethodId + ' Error: ' + e.getMessage());
            }

            // Fetch Ordered Products
            List<OrderItem> orderItems = [
                SELECT Id, OrderId, Product2.Name, Quantity,
                       Product2.Feature_1__c, Product2.Feature_2__c, Product2.Feature_3__c
                FROM OrderItem
                WHERE OrderId = :orderId
            ];
            String paymentMethod = apm != null ? String.valueOf(apm.Type) : 'N/A';
            paymentMethod = paymentMethod.startsWith('ACH') ? 'ACH' : paymentMethod;
            paymentMethod = paymentMethod.startsWith('Credit') ? 'Credit Card' : paymentMethod;
            // Format the result
            Map<String, Object> orderDetails = new Map<String, Object>();
            orderDetails.put('orderNumber', order.OrderNumber);
            orderDetails.put('orderDate', order.EffectiveDate);
            orderDetails.put('customerName', order.Account.Name);
            orderDetails.put('cardLastFour', apm != null ? String.valueOf(apm.cardLastFour__C) : 'N/A');
            orderDetails.put('paymentMethodType', paymentMethod);
            orderDetails.put('products', orderItems);

            return orderDetails;

        } catch (Exception e) {
            System.debug('Error fetching order details: ' + e.getMessage());
            throw new AuraHandledException('Error fetching order details. Please reload the page after couple of minutes to see the order details.' );
        }

    }

    @AuraEnabled(cacheable = true)
    public static Map<String, Object> getOrderRecordPO(String orderRef) {
        try {
            System.debug('orderRefNumber --->> ' + orderRef);

            // Fetch Order
            Order order = [
                SELECT Id, EffectiveDate, Account.Name, OrderNumber, PoNumber
                FROM Order
                WHERE OrderReferenceNumber = :orderRef
                LIMIT 1
            ];
            if (order == null) {
                throw new AuraHandledException('Order not found for the provided orderRefNumber.');
            }
            System.debug('Order record is --->> ' + order);

            // Fetch Ordered Products
            List<OrderItem> orderItems = [
                SELECT Id, OrderId, Product2.Name, Quantity,
                       Product2.Feature_1__c, Product2.Feature_2__c, Product2.Feature_3__c
                FROM OrderItem
                WHERE OrderId = :order.Id
            ];

            // Prepare Result
            Map<String, Object> orderDetails = new Map<String, Object>();
            orderDetails.put('orderNumber', order.OrderNumber);
            orderDetails.put('orderDate', order.EffectiveDate);
            orderDetails.put('customerName', order.Account.Name);
            orderDetails.put('poNumber', order.PoNumber);
            orderDetails.put('products', orderItems);

            return orderDetails;
        } catch (Exception e) {
            throw new AuraHandledException('Error in getOrderRecordPO: ' + e.getMessage());
        }
    }
}