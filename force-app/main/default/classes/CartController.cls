public with sharing class CartController {
    
    // Method to fetch cart items for a given cartId
    @AuraEnabled(cacheable=true)
    public static List<CartItem> getCartItems(Id cartId) {
        try {
            // Query to get cart items
            List<CartItem> cartItemList = [SELECT Id, Name, Product2.Description, Quantity, TotalPrice, SalesPrice,
                                           Monthly__c, Yearly__c, Product2.Feature_1__c, Product2.Feature_2__c, Product2.Feature_3__c, 
                                           Product2.Adjustment_Amount__c, Product2.Adjustment_Percent__c, Product2.Final_price__c, 
                                           Product2.SellingModel__c, CurrencyIsoCode 
                                           FROM CartItem WHERE CartId = :cartId];
            
            // Debugging each CartItem's Monthly__c and Yearly__c fields
            for(CartItem c : cartItemList) {
                System.debug('Monthly Price: ' + c.Monthly__c);
                System.debug('Yearly Price: ' + c.Yearly__c);
            }
            
            return cartItemList;
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cart items: ' + e.getMessage());
        }
    }
    
    // Method to fetch Product Selling Models based on CartItems
    @AuraEnabled
    public static List<PricebookEntry> getProductSellingModels(Id cartId) {
        system.debug('cartId====' +cartId);
        List<CartItem> cartItems = [SELECT Product2Id FROM CartItem WHERE CartId = :cartId];
        Set<Id> product2Ids = new Set<Id>();
        
        for (CartItem item : cartItems) {
            product2Ids.add(item.Product2Id);
        }

        List<PricebookEntry> pricebookEntries = [SELECT Id, ProductSellingModel.Name, ProductSellingModel.SellingModelType,CurrencyIsoCode
                                                  FROM PricebookEntry
                                                  WHERE Product2Id IN :product2Ids AND Pricebook2Id='01sO3000002QXGwIAO' AND isactive=true];
        
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
            CartItem itemToUpdate = [SELECT Id, Quantity, TotalPrice, SalesPrice,CurrencyIsoCode FROM CartItem 
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
    List<CartItem> cartItems = [SELECT Id, SalesPrice,TotalPrice,Quantity FROM CartItem WHERE CartId = :cartId AND Id IN :itemIds];
    
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