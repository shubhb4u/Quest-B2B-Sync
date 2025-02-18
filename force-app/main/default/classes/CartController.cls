public with sharing class CartController {

    // Method to fetch cart items for a given cartId
    @AuraEnabled(cacheable=true)
    public static List<CartItem> getCartItems(Id cartId) {
        try {
            // Query to get cart items
            List<CartItem> cartItemList = [SELECT Id, Name, Product2.Description, Quantity, TotalPrice, SalesPrice,
                                           Monthly__c, Yearly__c, Product2.Feature_1__c, Product2.Feature_2__c, Product2.Feature_3__c,  Product2.Final_price__c, 
                                           Product2.SellingModel__c, CurrencyIsoCode, Product2.ProductCode, Product2Id
                                           FROM CartItem WHERE CartId = :cartId];

            // Collect Product SKUs
            Set<String> productSKUs = new Set<String>();
            for (CartItem c : cartItemList) {
                if (c.Product2.ProductCode != null) {
                    productSKUs.add(c.Product2.ProductCode);
                }   
            }
            System.debug('Collected Product SKUs: ' + productSKUs);

            // Query promotions using the provided query
            List<PromotionTarget> promotionTargets = [
                SELECT Id, PromotionId, Promotion.Name, TargetProductSku, AdjustmentAmount, AdjustmentPercent
                FROM PromotionTarget
                WHERE TargetProductSku IN :productSKUs
            ];
            System.debug('Fetched PromotionTargets: ' + promotionTargets);

            // Map to store promotions by SKU
            Map<String, List<PromotionTarget>> promotionsBySKU = new Map<String, List<PromotionTarget>>();
            for (PromotionTarget target : promotionTargets) {
                if (!promotionsBySKU.containsKey(target.TargetProductSku)) {
                    promotionsBySKU.put(target.TargetProductSku, new List<PromotionTarget>());
                }
                promotionsBySKU.get(target.TargetProductSku).add(target);
            }
            System.debug('Organized Promotions by SKU: ' + promotionsBySKU);

            // Map to store adjusted prices and promotion details
            Map<Id, Decimal> adjustedPrices = new Map<Id, Decimal>();
            Map<Id, Map<String, Object>> promotionDetailsMap = new Map<Id, Map<String, Object>>(); // New map to store promotion details

            for (CartItem c : cartItemList) {
                String productSKU = c.Product2.ProductCode;
                System.debug('Processing CartItem with SKU: ' + productSKU);

                if (promotionsBySKU.containsKey(productSKU)) {
                    List<PromotionTarget> applicablePromotions = promotionsBySKU.get(productSKU);
                    System.debug('Applicable Promotions for SKU ' + productSKU + ': ' + applicablePromotions);

                    Decimal unitPrice = c.SalesPrice;
                    Decimal discountedPrice = unitPrice;

                    Decimal adjustmentAmount = 0;
                    Decimal adjustmentPercent = 0;

                    // Apply promotions
                    for (PromotionTarget target : applicablePromotions) {
                        if (target.AdjustmentPercent != null) {
                            discountedPrice -= (target.AdjustmentPercent / 100) * unitPrice;
                            adjustmentPercent = target.AdjustmentPercent;
                            System.debug('Applied AdjustmentPercent ' + target.AdjustmentPercent + ', Discounted Price: ' + discountedPrice);
                        }
                        if (target.AdjustmentAmount != null) {
                            discountedPrice = unitPrice - target.AdjustmentAmount;
                            adjustmentAmount = target.AdjustmentAmount;
                            System.debug('Applied AdjustmentAmount ' + target.AdjustmentAmount + ', Discounted Price: ' + discountedPrice);
                        }
                    }

                    // Update the adjusted prices map
                    adjustedPrices.put(c.Id, discountedPrice);
                    // Store promotion details
                    promotionDetailsMap.put(c.Id, new Map<String, Object>{
                        'AdjustmentAmount' => adjustmentAmount,
                        'AdjustmentPercent' => adjustmentPercent
                    });
                    System.debug('Adjusted Price for CartItem ' + c.Id + ': ' + discountedPrice);
                }
            }

            // Update the cart items with adjusted prices and promotion details
            for (CartItem c : cartItemList) {
                if (adjustedPrices.containsKey(c.Id)) {
                    c.SalesPrice = adjustedPrices.get(c.Id);
                    c.TotalPrice = c.SalesPrice * c.Quantity;

                    // Add promotion details to each cart item
                    if (promotionDetailsMap.containsKey(c.Id)) {
                        Map<String, Object> promotionDetails = promotionDetailsMap.get(c.Id);
                        // Assuming you have custom fields on CartItem for these
                       // c.Adjustment_Amount__c = (Decimal) promotionDetails.get('AdjustmentAmount');
                       // c.Adjustment_Percent__c = (Decimal) promotionDetails.get('AdjustmentPercent');
                       c.put('AdjustmentAmount', promotionDetails.get('AdjustmentAmount'));
                        // c.put('AdjustmentPercent', promotionDetails.get('AdjustmentPercent'));
                    }

                    System.debug('Updated CartItem ' + c.Id + ': SalesPrice = ' + c.SalesPrice + ', TotalPrice = ' + c.TotalPrice);
                }
            }

            // Final debug showing cart items with adjustment amounts and percentages
            System.debug('Final Cart Items with Promotions: ' + cartItemList);

            return cartItemList;

        } catch (Exception e) {
            System.debug('Error in getCartItemsWithPromotions: ' + e.getMessage());
            throw new AuraHandledException('Error fetching cart items with promotions: ' + e.getMessage());
        }
    }

    // Method to fetch cart order summary
    @AuraEnabled(cacheable=true)
    public static List<CartItem> getCartOrderSummary(Id cartId) {
        return getCartItems(cartId);
    }

    // Method to fetch Product Selling Models based on CartItems
    @AuraEnabled
    public static List<PricebookEntry> getProductSellingModels(Id cartId) {
        system.debug('cartId====' + cartId);
        List<CartItem> cartItems = [SELECT Product2Id FROM CartItem WHERE CartId = :cartId];
        Set<Id> product2Ids = new Set<Id>();

        for (CartItem item : cartItems) {
            product2Ids.add(item.Product2Id);
        }

        List<PricebookEntry> pricebookEntries = [SELECT Id, ProductSellingModel.Name, ProductSellingModel.SellingModelType, CurrencyIsoCode
                                                  FROM PricebookEntry
                                                  WHERE Product2Id IN :product2Ids AND Pricebook2Id = '01sWG000000ISaYYAW' AND IsActive = true];

        for (PricebookEntry p : pricebookEntries) {
            System.debug('ProductSellingModel Name: ' + p.ProductSellingModel.Name);
        }

        return pricebookEntries;
    }

    // Method to update cart item quantity
    @AuraEnabled
    public static CartItem updateCartItemQuantity(Id cartId, Id itemId, Integer newQuantity) {
        try {
            // Query for the CartItem to be updated
            CartItem itemToUpdate = [SELECT Id, Quantity, TotalPrice, SalesPrice, CurrencyIsoCode FROM CartItem
                                     WHERE CartId = :cartId AND Id = :itemId LIMIT 1];

            // Check if the new quantity is valid (e.g., greater than 0)
            if (newQuantity > 0) {
                // Update the quantity
                itemToUpdate.Quantity = newQuantity;

                // Update the TotalPrice (Assuming TotalPrice = Quantity * SalesPrice)
                itemToUpdate.TotalPrice = itemToUpdate.Quantity * itemToUpdate.SalesPrice;

                // Update the cart item
                update itemToUpdate;

                return itemToUpdate;
            } else {
                throw new AuraHandledException('Invalid quantity. Quantity must be greater than 0.');
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error updating cart item quantity: ' + e.getMessage());
        }
    }

    // Method to delete a cart item
    @AuraEnabled
    public static CartItem deleteCartItem(Id cartId, Id itemId) {
        try {
            // Query to find the CartItem based on cartId and itemId
            CartItem cartItemToDelete = [SELECT Id FROM CartItem WHERE CartId = :cartId AND Id = :itemId LIMIT 1];

            // Delete the cart item
            delete cartItemToDelete;
            return cartItemToDelete;
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting cart item: ' + e.getMessage());
        }
    }

    // Method to clear all cart items for a given cartId
    @AuraEnabled
    public static void clearAllCartItems(Id cartId) {
        try {
            // Query all items associated with the given cartId
            List<CartItem> itemsToDelete = [SELECT Id FROM CartItem WHERE CartId = :cartId];

            if (!itemsToDelete.isEmpty()) {
                // Delete all cart items
                delete itemsToDelete;
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error clearing all cart items: ' + e.getMessage());
        }
    }

    // Method to update multiple cart item prices
    @AuraEnabled
    public static void updateItemInCarts(String cartId, List<String> itemIds, List<Decimal> newSalesPrices) {
        // Check if the number of itemIds and newSalesPrices match
        if (itemIds.size() != newSalesPrices.size()) {
            System.debug(LoggingLevel.ERROR, 'Item IDs and Sales Prices list sizes do not match.');
            return; // Exit if the sizes don't match
        }

        // Create a list to hold updated CartItem records
        List<CartItem> itemsToUpdate = new List<CartItem>();

        // Retrieve all CartItems that need to be updated based on cartId and itemIds
        List<CartItem> cartItems = [SELECT Id, SalesPrice, TotalPrice, Quantity FROM CartItem WHERE CartId = :cartId AND Id IN :itemIds];

        // Map itemIds to their new sales prices for easy access
        Map<String, Decimal> priceMap = new Map<String, Decimal>();
        for (Integer i = 0; i < itemIds.size(); i++) {
            priceMap.put(itemIds[i], newSalesPrices[i]);
        }

        // Iterate over the retrieved CartItems and set the new SalesPrice
        for (CartItem item : cartItems) {
            Decimal newSalesPrice = priceMap.get(item.Id); // Get the new price for this item
            if (newSalesPrice != null) {
                item.SalesPrice = newSalesPrice; // Set the new SalesPrice
                item.TotalPrice = item.SalesPrice * item.Quantity;

                itemsToUpdate.add(item); // Add to list of items to update
            } else {
                System.debug(LoggingLevel.ERROR, 'No new sales price found for CartItem with ID: ' + item.Id);
            }
        }

        // Perform a single DML operation to update all cart items at once
        if (!itemsToUpdate.isEmpty()) {
            try {
                update itemsToUpdate;
                System.debug('SalesPrices updated for ' + itemsToUpdate.size() + ' items.');
            } catch (DmlException e) {
                System.debug(LoggingLevel.ERROR, 'Error updating CartItems: ' + e.getMessage());
            }
        } else {
            System.debug('No items to update.');
        }
    }
}