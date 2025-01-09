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
}