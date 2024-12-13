/**
 * @description       :
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             :
 * @last modified on  : 12-03-2024
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class OrderConfirmationController {
    @AuraEnabled
    public static Map<String, Object> getOrderDetails(String orderId) {
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
            CardPaymentMethod cardPayment = null;
            if (payment.PaymentMethodId != null) {
                cardPayment = [
                    SELECT CardLastFour
                    FROM CardPaymentMethod
                    WHERE Id = :payment.PaymentMethodId
                    LIMIT 1
                ];
            }

            // Fetch Ordered Products
            List<OrderItem> orderItems = [
                SELECT Id, OrderId, Product2.Name, Quantity,
                       Product2.Feature_1__c, Product2.Feature_2__c, Product2.Feature_3__c
                FROM OrderItem
                WHERE OrderId = :orderId
            ];

            // Format the result
            Map<String, Object> orderDetails = new Map<String, Object>();
            orderDetails.put('orderNumber', order.OrderNumber);
            orderDetails.put('orderDate', order.EffectiveDate);
            orderDetails.put('customerName', order.Account.Name);
            orderDetails.put('cardLastFour', cardPayment != null ? String.valueOf(cardPayment.CardLastFour) : 'N/A');
            orderDetails.put('products', orderItems);

            return orderDetails;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching order details: ' + e.getMessage());
        }
    }
}