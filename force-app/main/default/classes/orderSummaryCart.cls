public with sharing class orderSummaryCart {

    @AuraEnabled(cacheable=true)
    public static List<CartItem> getCartOrderSummary(Id cartId) {
        try {
            // Query to get cart items
            List<CartItem> cartItemList = [SELECT Id, Name, TotalPrice, SalesPrice,CurrencyIsoCode
                                            FROM CartItem WHERE CartId = :cartId];

            return cartItemList;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cart items: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static WebCart getCart(Id cartId) {
        try {
            // Query to get cart items
            WebCart crt = [SELECT Id, GrandTotalAmount from WebCart Where Id =: cartId ];

            return crt;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cart total amount: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static WebCart getTotalTaxAmount(Id cartId){
        try {
            WebCart crtTax = [Select id,TotalTaxAmount,CurrencyIsoCode from WebCart Where Id =: cartId];

            return crtTax;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cart total tax amount: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> applyCouponDiscount(Id cartId, String couponCode) {
        WebCart crt = null;
        Decimal totalDiscount = 0;
        Decimal discountedTotal = 0;
        Map<String, Object> result = new Map<String, Object>();

        try {
            System.debug('========== APPLY COUPON DISCOUNT START ==========');
            System.debug('Cart ID: ' + cartId);
            System.debug('Coupon Code: ' + couponCode);

        // Step 1: Retrieve the cart items
        List<CartItem> cartItems = [
            SELECT Id, Product2.Coupon_Adjustment_Price__c, Product2.Coupon_Adjustment_Percent__c,
                   Product2.Name, Quantity, TotalAmount,Product2.Coupon_Code__c 
            FROM CartItem 
            WHERE CartId = :cartId AND Product2.isCouponCode__c = true
        ];
        System.debug('Cart Items Retrieved: ' + cartItems);

        if (cartItems.isEmpty()) {
            System.debug('No applicable items found in the cart for a coupon.');
            throw new AuraHandledException('No applicable items found in the cart for a coupon.');
        }

        Boolean isCouponCodeValid = false;

        // Step 2: Validate coupon code for each product
        for(CartItem item: cartItems){
            System.debug('Validating coupon for product: ' + item.Product2.Name);
            if (item.Product2.Coupon_Code__c != null && item.Product2.Coupon_Code__c == couponCode){
                    isCouponCodeValid = true;
                    break;
                    System.debug('Invalid coupon code for product: ' + item.Product2.Name);
                   // throw new AuraHandledException('Invalid coupon code for product: ' + item.Product2.Name);
            }
        }
        if(!isCouponCodeValid){
            throw new AuraHandledException('Please enter a valid coupon code');
        }

        // Step 3: Retrieve the WebCart

        crt = [SELECT Id, GrandTotalAmount, Total_amount__c, CurrencyIsoCode 
               FROM WebCart 
               WHERE Id = :cartId LIMIT 1];
        System.debug('WebCart Retrieved: ' + crt);

        if (crt == null) {
            throw new AuraHandledException('Cart not found for the given cart ID.');
        }

        // Step 4: Calculate the total discount
        for (CartItem item : cartItems) {
            Decimal productDiscount = 0;
            System.debug('Calculating discount for product: ' + item.Product2.Name);

            if (item.Product2.Coupon_Adjustment_Percent__c != null) {
                productDiscount = (item.Product2.Coupon_Adjustment_Percent__c / 100) * item.TotalAmount;
                System.debug('Percent discount applied: ' + productDiscount);
            } else if (item.Product2.Coupon_Adjustment_Price__c != null) {
                productDiscount = item.Product2.Coupon_Adjustment_Price__c;
                System.debug('Fixed price discount applied: ' + productDiscount);
            }

            totalDiscount += productDiscount;
            System.debug('Total Discount after product: ' + totalDiscount);
        }

        // Step 5: Calculate the discounted total
        discountedTotal = crt.GrandTotalAmount - totalDiscount;
        System.debug('Discounted Total Calculated: ' + discountedTotal);

        // Step 6: Prepare the wrapper
        //WebCartWrapper cartWrapper = new WebCartWrapper(discountedTotal, crt);
        result.put('discountedTotal', discountedTotal);
        result.put('webCart', crt);

        System.debug('Returning Result Map: ' + result);
        //System.debug('Returning WebCartWrapper: ' + cartWrapper);

        System.debug('========== APPLY COUPON DISCOUNT END ==========');
       // return cartWrapper;
       return result;

    } catch (Exception e) {
        System.debug('Error in applyCouponDiscount: ' + e.getMessage());
       // throw new AuraHandledException('Error applying coupon: ' + e.getMessage());
       if (e instanceof AuraHandledException) {
        throw e; // Pass the specific AuraHandledException message as-is
    } else {
        throw new AuraHandledException('An unexpected error occurred: ' + e.getMessage());
    }
    }
}
}