public with sharing class orderSummaryCart {
    
    @AuraEnabled(cacheable=true)
    public static List<CartItem> getCartOrderSummary(Id cartId) {
        try {
            // Query to get cart items
            List<CartItem> cartItemList = [SELECT Id, Name, TotalPrice, SalesPrice,CurrencyIsoCode
                                           FROM CartItem WHERE CartId = :cartId];
            
            system.debug('Cart Item List: ' +cartItemList);
            
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
   
    
    @AuraEnabled
    public static Map<String, Object> applyCouponDiscount(Id cartId, String couponCode) {
        WebCart crt = null;
        Decimal totalDiscount = 0;
        Decimal discountedTotal = 0;
        Map<String, Object> result = new Map<String, Object>();
        
        try {
            System.debug('========== APPLY COUPON DISCOUNT START ==========');
            System.debug('Cart ID: ' + cartId);
            System.debug('Coupon Code: ' + couponCode);
            
            // Step 1: Retrieve the coupon and associated promotion details
            try {
                List<Coupon> coupons = [
                    SELECT Id, Name, PromotionId, CouponCode
                    FROM Coupon
                    WHERE CouponCode = :couponCode
                ];
                System.debug('Coupons Retrieved: ' + coupons);
                
                if (coupons.isEmpty()) {
                    throw new AuraHandledException('Invalid coupon code: ' + couponCode);
                }
                
                Id promotionId = coupons[0].PromotionId;
                if (promotionId == null) {
                    throw new AuraHandledException('The coupon is not associated with any promotion.');
                }
                
                // Step 2: Retrieve promotion details
                List<Promotion> promotions = [
                    SELECT Id, Name, IsAutomatic
                    FROM Promotion
                    WHERE Id = :promotionId AND IsAutomatic = false
                ];
                System.debug('Promotions Retrieved: ' + promotions);
                
                if (promotions.isEmpty()) {
                    throw new AuraHandledException('No valid promotion found for the coupon.');
                }
                
                // Step 3: Retrieve qualifying products for the promotion
                List<PromotionQualifier> qualifiers = [
                    SELECT QualifierProductName
                    FROM PromotionQualifier
                    WHERE PromotionId = :promotionId
                ];
                System.debug('Promotion Qualifiers Retrieved: ' + qualifiers);
                
                Set<String> qualifyingProducts = new Set<String>();
                for (PromotionQualifier qualifier : qualifiers) {
                    qualifyingProducts.add(qualifier.QualifierProductName);
                }
                System.debug('Qualifying Products: ' + qualifyingProducts);
                
                // Step 4: Retrieve target products and their discounts
                List<PromotionTarget> targets = [
                    SELECT TargetProductName, AdjustmentType, AdjustmentAmount, AdjustmentPercent
                    FROM PromotionTarget
                    WHERE PromotionId = :promotionId
                ];
                System.debug('Promotion Targets Retrieved: ' + targets);
                
                Map<String, Map<String, Decimal>> targetDiscounts = new Map<String, Map<String, Decimal>>();
                for (PromotionTarget target : targets) {
                    Map<String, Decimal> discountDetails = new Map<String, Decimal>();
                    if (target.AdjustmentType == 'FixedAmountOffUnitPrice') {
                        // Store fixed amount discount
                        discountDetails.put('Amount', target.AdjustmentAmount);
                        System.debug('Amount discount for ' + target.TargetProductName + ': ' + target.AdjustmentAmount);
                    } else if (target.AdjustmentType == 'Percent') {
                        // Store percentage discount
                        discountDetails.put('Percent', target.AdjustmentPercent);
                        System.debug('Percent discount for ' + target.TargetProductName + ': ' + target.AdjustmentPercent);
                    }
                    targetDiscounts.put(target.TargetProductName, discountDetails);
                }
                System.debug('Target Discounts: ' + targetDiscounts);
                
                // Step 5: Retrieve the cart items
                List<CartItem> cartItems = [
                    SELECT Id, Product2.Name, Quantity, TotalAmount, SalesPrice
                    FROM CartItem
                    WHERE CartId = :cartId
                ];
                System.debug('Cart Items Retrieved: ' + cartItems);
                
                if (cartItems.isEmpty()) {
                    throw new AuraHandledException('No applicable items found in the cart for a coupon.');
                }
                
                Boolean isCouponCodeValid = false;
                List<CartItem> itemsToUpdate = new List<CartItem>();
                
                // Step 6: Validate cart items against the promotion
                for (CartItem item : cartItems) {
                    
                    System.debug('Validating product: ' + item.Product2.Name);
                    
                    if (qualifyingProducts.contains(item.Product2.Name)) {
                        isCouponCodeValid = true;
                        
                        // Apply discount if the product matches a target
                        Map<String, Decimal> discounts = targetDiscounts.get(item.Product2.Name);
                        Decimal productDiscount = 0;
                        
                        if (discounts != null) {
                            if (discounts.containsKey('Amount')) {
                                // Apply the fixed amount discount
                                productDiscount = discounts.get('Amount');
                                System.debug('Fixed discount applied for product ' + item.Product2.Name + ': ' + productDiscount);
                            } else if (discounts.containsKey('Percent')) {
                                // Apply the percentage discount
                                productDiscount = (discounts.get('Percent') / 100) * item.TotalAmount;
                                System.debug('Percentage discount applied for product ' + item.Product2.Name + ': ' + productDiscount);
                            }
                            totalDiscount += productDiscount;
                            // Log the discount applied to the current product
                            System.debug('Applying discount for product: ' + item.Product2.Name);
                            System.debug('Product Total Amount Before Discount: ' + item.TotalAmount);
                            System.debug('Discount Amount Applied: ' + productDiscount);

                            // Update the SalesPrice for the cart item
                            item.SalesPrice = item.TotalAmount - productDiscount;
                            System.debug('Updated Sales Price for product: ' + item.Product2.Name + ' is ' + item.SalesPrice);
                            itemsToUpdate.add(item);
                            System.debug('Total Discount Updated: ' + totalDiscount);
                        }
                    }
                }
                
                if (!isCouponCodeValid) {
                    throw new AuraHandledException('The coupon code does not apply to any products in the cart.');
                }

                // Save the updated cart items
                if (!itemsToUpdate.isEmpty()) {
                    Database.SaveResult[] saveResults = Database.update(itemsToUpdate, false);
                    for (Database.SaveResult sr : saveResults) {
                        if (!sr.isSuccess()) {
                            System.debug('Failed to update CartItem: ' + sr.getErrors()[0].getMessage());
                        }
                    }
                }
                
                // Step 7: Retrieve the WebCart
                crt = [
                    SELECT Id, GrandTotalAmount, Total_amount__c, CurrencyIsoCode
                    FROM WebCart
                    WHERE Id = :cartId LIMIT 1
                ];
                System.debug('WebCart Retrieved: ' + crt);
                
                if (crt == null) {
                    throw new AuraHandledException('Cart not found for the given cart ID: ' + cartId);
                }
                
                // Step 8: Calculate the discounted total
                discountedTotal = crt.GrandTotalAmount - totalDiscount;
                System.debug('Discounted Total Calculated: ' + discountedTotal);
                
                // Step 9: Prepare the result
                result.put('discountedTotal', discountedTotal);
                result.put('webCart', crt);
                result.put('totalDiscount', totalDiscount);
                
                System.debug('Returning Result Map: ' + result);
                System.debug('========== APPLY COUPON DISCOUNT END ==========');
                return result;
            } catch (AuraHandledException e) {
                System.debug('AuraHandledException: ' + e.getMessage());
                throw e;
            }
        } catch (Exception e) {
            System.debug('Outer Error in applyCouponDiscount: ' + e.getMessage());
            throw e;
        }
    }
}