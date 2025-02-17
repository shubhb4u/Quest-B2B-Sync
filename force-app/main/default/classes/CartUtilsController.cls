public with sharing class CartUtilsController {

    @AuraEnabled (cacheable=false)
    public static String getCartItemCount(Id effectiveAccountId, String activeCartOrId) {

        try {
            if (String.isEmpty(effectiveAccountId) || String.isEmpty(activeCartOrId)) {
                return '0';
            }
            Id storeId = Label.WebstoreId;
            ConnectApi.CartSummary cartSummary = ConnectApi.CommerceCart.getCartSummary(
                storeId,
                effectiveAccountId,
                activeCartOrId
            );
            // system.debug('cart summary: ' + String.valueOf(cartSummary.totalProductCount));
            return String.valueOf(cartSummary.totalProductCount);
        } catch (Exception e) {
            system.debug('Error fetching cart summary: ' + e);
            throw e;
        }
    }

    @AuraEnabled (cacheable=false)
    public static String deleteCart(String cartId) {

        try {
             // Query Cart details
             WebCart cart = [
                SELECT Id, TotalAmount, BillingStreet
                FROM WebCart
                WHERE Id = :cartId
                LIMIT 1
            ];

            // Query Cart Items
            List<CartItem> cartItems = [
                SELECT Id, Product2Id, Quantity, SalesPrice
                FROM CartItem
                WHERE CartId = :cartId
            ];

            delete cartItems;
            delete cart;

            return 'Cart deleted.';
        } catch (Exception e) {
            system.debug('Error deleting cart: ' + e);
            throw e;
        }
    }
    @AuraEnabled (cacheable=false)
    public static String getOrderId(String orderRefNumber) {
        System.debug('OrderRefNumber Apex: ' + orderRefNumber);
        Order orderObj = [SELECT Id, OrderNumber FROM Order WHERE OrderReferenceNumber= :orderRefNumber LIMIT 1];
        System.debug('order Id: ' + orderObj.Id + ' order number: ' + orderObj.OrderNumber + ' order reference number: ' + OrderRefNumber);
        return orderObj.Id;
    }
}