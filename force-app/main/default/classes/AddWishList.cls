public without sharing class AddWishList {
    @AuraEnabled
    public static String addWishListItem(String storeId, String productId, String accountId, Boolean isAdded) {
        // Validate input parameters
        if (String.isEmpty(accountId) || String.isEmpty(storeId) || String.isEmpty(productId)) {
            return 'Error: AccountId, StoreId, and ProductId are required.';
        }

        try {
            // Query the product
            Product2 product = [
                SELECT Id, Name, isWishlistItem_Quest__c 
                FROM Product2 
                WHERE Id = :productId 
                LIMIT 1
            ];
        
            // Query the wishlist
            List<Wishlist> wishlists = [
                SELECT Id 
                FROM Wishlist 
                WHERE AccountId = :accountId AND WebStoreId = :storeId 
                LIMIT 1
            ];
        
            Wishlist existingWishList = wishlists.isEmpty() ? null : wishlists[0];
        
            if (isAdded) {
                return handleAddToWishlist(product, existingWishList, storeId, accountId);
            } else {
                return handleRemoveFromWishlist(product, existingWishList);
            }
        
        } catch (QueryException qe) {
            return 'Error: Invalid Product or Wishlist information.';
        } catch (Exception ex) {
            System.debug('Error in addWishListItem: ' + ex.getMessage());
            return 'Error: An unexpected error occurred while processing your request.';
        }
        
    }

    private static String handleAddToWishlist(Product2 product, Wishlist existingWishList, String storeId, String accountId) {
        try {
            WishListItem newItem;

            if (existingWishList != null) {
                // Add item to existing wishlist
                newItem = new WishListItem(
                    Name = 'Item for ' + product.Name,
                    Product2Id = product.Id,
                    WishlistId = existingWishList.Id
                );
            } else {
                // Create a new wishlist and add the item
                Wishlist newWishList = new Wishlist(
                    AccountId = accountId,
                    WebStoreId = storeId,
                    Name = 'Default Wishlist'
                );
                insert newWishList;

                newItem = new WishListItem(
                    Name = 'Item for ' + product.Name,
                    Product2Id = product.Id,
                    WishlistId = newWishList.Id
                );
            }

            // Update product wishlist indicator
            product.isWishlistItem_Quest__c = true;
            update product;

            // Insert new wishlist item
            insert newItem;

            System.debug('Item added to wishlist: ' + newItem);
            return 'Product added to the wishlist successfully.';
        } catch (Exception ex) {
            System.debug('Error in handleAddToWishlist: ' + ex.getMessage());
            return 'Error: Failed to add the product to the wishlist.';
        }
    }

    private static String handleRemoveFromWishlist(Product2 product, Wishlist existingWishList) {
        if (existingWishList == null) {
            return 'Error: No existing wishlist found for the given account and store.';
        }

        try {
            // Query for the wishlist item
            WishListItem itemToRemove = [
                SELECT Id 
                FROM WishListItem 
                WHERE Product2Id = :product.Id AND WishlistId = :existingWishList.Id 
                LIMIT 1
            ];

            if (itemToRemove != null) {
                delete itemToRemove;

                // Update product wishlist indicator
                product.isWishlistItem_Quest__c = false;
                update product;

                System.debug('Item removed from wishlist: ' + itemToRemove.Id);
                return 'Product removed from the wishlist successfully.';
            } else {
                return 'Error: Wishlist item not found.';
            }
        } catch (Exception ex) {
            System.debug('Error in handleRemoveFromWishlist: ' + ex.getMessage());
            return 'Error: Failed to remove the product from the wishlist.';
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Product2> getAllProducts() {
        try {
            return [
                SELECT Id, Name, ProductCode 
                FROM Product2
            ];
        } catch (Exception ex) {
            System.debug('Error fetching products: ' + ex.getMessage());
            return new List<Product2>();
        }
    }

    @AuraEnabled(cacheable=true)
    public static String getSiteBaseUrl() {
        return Site.getBaseUrl();
    }
}
