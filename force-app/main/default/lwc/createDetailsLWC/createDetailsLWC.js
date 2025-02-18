import { LightningElement, wire, track } from 'lwc';
import { CartSummaryAdapter,updateItemInCart } from 'commerce/cartApi';
import getProductSellingModels from '@salesforce/apex/CartController.getProductSellingModels';
import getCartItems from '@salesforce/apex/CartController.getCartItems';
import updateCartItemQuantity from '@salesforce/apex/CartController.updateCartItemQuantity';
import deleteCartItem from '@salesforce/apex/CartController.deleteCartItem';
import clearAllCartItems from '@salesforce/apex/CartController.clearAllCartItems';
import updateItemInCarts from '@salesforce/apex/CartController.updateItemInCarts';

import { refreshApex } from '@salesforce/apex';

import { publish, MessageContext } from 'lightning/messageService';
import MY_MESSAGE_CHANNEL from '@salesforce/messageChannel/CustomChannel__c';

export default class CartDetailsLWC extends LightningElement {
    @track cartId; // Stores cart ID
    @track cartItems = []; // Stores cart items
    @track productSellingModels = []; // Stores product selling models
    @track modelMap = new Map(); // Maps product selling models by ID
    wiredCartItems; // Stores the wire result for refreshApex
    error; // Error handling
    @track cartTotal = 0;  // Track the total price of all cart items

    @wire(MessageContext)
    messageContext;

    isShowModal = false;
    @track selectedProductId = null; // Track the selected product ID

    handleUpdateCartCount() {
        const message = { action: 'updateCartTotals', payload: 'Custom update cart totals' };
        publish(this.messageContext, MY_MESSAGE_CHANNEL, message);
        console.log('Custom update cart totals Message published:', message);

        const message2 = { action: 'updateCartCount', payload: 'Custom Data Add to cart' };
        publish(this.messageContext, MY_MESSAGE_CHANNEL, message2);
        console.log('Add to cart Message published:', message2);
    }

    // Get cart summary and fetch initial data
    @wire(CartSummaryAdapter)
    setCartSummary({ data, error }) {
        if (data) {
            this.cartId = data.cartId;
            this.fetchCartItems();
            this.fetchProductSellingModels();
        } else if (error) {
            this.error = error;
            console.error('Error fetching cart summary:', error);
        }
    }

    showModalBox(event) {
        event.preventDefault();
        const clickedElement = event.target;
        let parentDiv = clickedElement.closest('.renewal-term__container');
        parentDiv.querySelector('.change-term-content').classList.remove('d-none');
    }

    hideModalBox(event) {
        event.preventDefault();
        const clickedElement = event.target;
        let parentDiv = clickedElement.closest('.renewal-term__container');
        parentDiv.querySelector('.change-term-content').classList.add('d-none');
    }

    // Handle the "Change Term" click
    handleShowModal(event) {
        const productId = event.target.dataset.id; // Get the product ID from data-id
        this.selectedProductId = productId;
    }

    // Check if the product is the selected one
    isSelectedProduct(productId) {
        return this.selectedProductId === productId;
    }

fetchCartItems() {
        if (this.cartId) {
            getCartItems({ cartId: this.cartId })
                .then((result) => {
                    console.log('Fetched cart items:', JSON.stringify(result));
   
                    this.cartItems = result.map((item) => {
                        // Log Adjustment Amount and Percent for debugging
                        console.log('Item:', item.Id);
                        console.log('AdjustmentAmount:', item.AdjustmentAmount);
                        console.log('AdjustmentPercent:', item.AdjustmentPercent);
                       
                        const hasPromotion = this.hasPromotion(item);
                        console.log('Has promotion:', hasPromotion);
                       
                        // Check promotion details
                        if (hasPromotion) {
                            console.log('Promotion details:', this.getPromotionDetails(item));
                        }
   
                        return {
                            ...item,
                            SalesPrice: this.formatPrice(item.SalesPrice),
                            TotalPrice: this.formatPrice(item.TotalPrice),
                            hasFeatures: this.hasFeatures(item),
                            hasPromotion, // Include promotion status
                            Monthly__c: item.Monthly__c, // Include Monthly__c
                            Yearly__c: item.Yearly__c, // Include Yearly__c
                            Quantity: item.Quantity,
                            promotionDetails: this.getPromotionDetails(item), // Add promotion details
                            CurrencyIsoCode: item.CurrencyIsoCode
                        };
                    });
                })
                .catch((error) => {
                    console.error('Error fetching cart items:', error);
                    this.error = error;
                });
        }
    }
 

    // Format price to currency format
    formatPrice(price, currencyCode = 'USD') {
        if (!price) return '-';

        if (typeof price === 'string') {
            price = parseFloat(price);
        }

        let currencySymbol = '';
        switch (currencyCode) {
            case 'USD':
                currencySymbol = '$';
                break;
            case 'INR':
                currencySymbol = '₹';
                break;
            default:
                currencySymbol = currencyCode; // Default to currency code if no symbol found
                break;
        }

        return `${currencySymbol} ${price.toFixed(2)}`;
    }

hasPromotion(item) {
        // Check if the properties exist and are non-zero numbers
        const hasAdjustmentAmount = parseFloat(item.AdjustmentAmount) !== 0 && !isNaN(item.AdjustmentAmount);
        const hasAdjustmentPercent = parseFloat(item.AdjustmentPercent) !== 0 && !isNaN(item.AdjustmentPercent);
   
        console.log('Checking promotions for item:', item.Id);
        console.log('Has Adjustment Amount:', hasAdjustmentAmount);
        console.log('Has Adjustment Percent:', hasAdjustmentPercent);
   
        return hasAdjustmentAmount || hasAdjustmentPercent;
    }
   
    getPromotionDetails(item) {
        if (this.hasPromotion(item)) {
            const adjustmentAmount = item.AdjustmentAmount
                ? this.formatPrice(item.AdjustmentAmount, item.CurrencyIsoCode)
                : null;
            const adjustmentPercent = item.AdjustmentPercent
                ? `${item.AdjustmentPercent}%`
                : null;
           
            console.log('adjustment amount from get promotion details: ', adjustmentAmount);
            return {                
                adjustmentAmount,
                adjustmentPercent,
            };
        }
        return null;
    }
 

    // Fetch product selling models
    fetchProductSellingModels() {
        if (this.cartId) {
            getProductSellingModels({ cartId: this.cartId })
                .then((data) => {
                    this.productSellingModels = data
                        .map((model) => {
                            const sellingModel = model.ProductSellingModel;
                            if (sellingModel && sellingModel.Name && sellingModel.Id && sellingModel.SellingModelType) {
                                return {
                                    name: sellingModel.Name,
                                    id: sellingModel.Id,
                                    sellingModelType: sellingModel.SellingModelType,
                                };
                            }
                            return null;
                        })
                        .filter((model) => model !== null); // Filter out null values

                    // Map models to make accessing easier
                    this.modelMap = new Map();
                    this.productSellingModels.forEach((model) => {
                        this.modelMap.set(model.id, model);
                    });
                })
                .catch((error) => {
                    console.error('Error fetching product selling models:', error);
                    this.error = error;
                });
        }
    }

@wire(getCartItems, { cartId: '$cartId' })
    wiredGetCartItems(result) {
        this.wiredCartItems = result;
        const { data, error } = result;
        if (data) {
            this.cartItems = data.map((item) => {
                // For each cart item, check if there are selling models associated with it
                const applicableSellingModels = this.productSellingModels.filter((model) => model.productId === item.Product2.Id);
 
                return {
                    ...item,
                    SalesPrice: this.formatPrice(item.SalesPrice),
                    TotalPrice: this.formatPrice(item.TotalPrice),
                    hasFeatures: this.hasFeatures(item), // Add feature check
                    hasPromotion: this.hasPromotion(item),
                    promotionDetails: this.getPromotionDetails(item),
                    sellingModels: applicableSellingModels, // Add the selling models
                    CurrencyIsoCode: item.CurrencyIsoCode
                };
            });
        } else if (error) {
            console.error('Error fetching cart items:', error);
            this.error = error;
        }
    }
 

    // Handle quantity change
    /*
    handleQuantityChange(event) {
        const itemId = event.target.dataset.cartitemid; // The cart item ID to update
        const newQuantity = parseInt(event.target.value, 10); // The new quantity for the cart item
    
        if (itemId && newQuantity > 0) {
            // Call Apex method to update the quantity
            updateCartItemQuantity({ cartId: this.cartId, itemId, newQuantity })
                .then(() => {
                    // After successfully updating the cart item, refresh the wire service
                    return refreshApex(this.wiredCartItems);  // Refresh the wire data
                })
                .then(() => {
                    // Recalculate the cart total after the refresh
                    this.recalculateCartTotal();
                    this.handleUpdateCartCount();
                    console.log('Quantity updated and cart total recalculated.');
                })
                .catch((error) => {
                    console.error('Error updating cart item:', error);
                    this.modalTitle = 'Error';
                    this.modalMessage = 'Failed to update cart item quantity';
                    this.modalType = 'error';
                    this.isUpdateCartModalOpen = true;
                    setTimeout(() => {
                        this.handleModalClose();
                    }, 5000);
                });
        } else {
            console.warn('Invalid quantity value:', newQuantity);
        }
    }
    */


    // Handle item deletion
    handleDeleteItem(event) {
        const itemId = event.target.dataset.id;

        deleteCartItem({ cartId: this.cartId, itemId })
            .then(() => {
                refreshApex(this.wiredCartItems);
                this.handleUpdateCartCount();
            })
            .catch((error) => console.error('Error deleting item:', error));
    }

    // Clear all cart items
    handleClearAll() {
        clearAllCartItems({ cartId: this.cartId })
            .then(() => refreshApex(this.wiredCartItems))
            .catch((error) => console.error('Error clearing all cart items:', error));
    }

    // Handle renewal term submission
    handleRenewalSubmit() {
        const selectedModel = this.template.querySelector('input[name="renewalTerm"]:checked');
    
        if (selectedModel) {
            const renewalTerm = selectedModel.value; // Get the selected renewal term (Yearly or Monthly)
            console.log('Selected Renewal Term:', renewalTerm);
    
            const selectedItem = this.cartItems; // Now `selectedItem` holds the entire `cartItems` array
    
            if (selectedItem && selectedItem.length > 0) {
                console.log('All Cart Items:', selectedItem);
    
                // Using a forEach loop, process each item and update its price
                selectedItem.forEach(item => {
                    let updatedPrice;
    
                    // Determine which price to use (Yearly or Monthly)
                    if (renewalTerm === 'Yearly') {
                        updatedPrice = item.Yearly__c; // Yearly price field
                    } else if (renewalTerm === 'Monthly') {
                        updatedPrice = item.Monthly__c; // Monthly price field
                    }
    
                    console.log('Updated Price for Item:', item.Name, updatedPrice);
    
                    if (updatedPrice) {
                        // Update SalesPrice with the new value
                        item.SalesPrice = updatedPrice;
    
                        // Update the TotalPrice based on new SalesPrice and Quantity
                        item.TotalPrice = updatedPrice * item.Quantity;
    
                        // Call Apex method to update the cart item with new price
                        updateItemInCarts({
                            cartId: this.cartId,
                            itemIds: [item.Id],
                            newSalesPrices: [updatedPrice]
                        })
                        .then(() => {
                            // After updating, trigger a refresh of the wire service
                            return refreshApex(this.wiredCartItems);
                        })
                        .then(() => {
                            // Recalculate the cart total and refresh the cart count
                            this.recalculateCartTotal();
                            this.handleUpdateCartCount();
                            console.log('SalesPrice updated for item:', item.Name);
                        })
                        .catch((error) => {
                            console.error('Error updating SalesPrice for item:', item.Name, error);
                            this.modalTitle = 'Error';
                            this.modalMessage = 'Failed to update SalesPrice for ' + item.Name;
                            this.modalType = 'error';
                            this.isUpdateCartModalOpen = true;
                            this._updateCartModalTimer = setTimeout(() => {
                                this.handleModalClose();
                            }, 5000);
                        });
                    } else {
                        console.error('No price available for the selected renewal term for item:', item.Name);
                    }
                });
            } else {
                console.warn('No cart items available or selected item not found.');
            }
        } else {
            console.warn('No renewal term selected!');
        }
    }
        
    // Recalculate cart total
    recalculateCartTotal() {
        let total = 0;
        this.cartItems.forEach(item => {
            total += item.TotalPrice || 0; // Ensure TotalPrice is valid
        });
        this.cartTotal = total;
        console.log('Updated Cart Total:', this.cartTotal);
    }

    // Getters for dynamic UI handling
    get hasCartItems() {
        return this.cartItems.length > 0;
    }

    get hasError() {
        return !!this.error;
    }

    get hasRenewalTerms() {
        return Array.isArray(this.productSellingModels) && this.productSellingModels.length > 0;
    }

    // Check if features are available for any item
    hasFeatures(item) {
        return (
            item.Product2.Feature_1__c ||
            item.Product2.Feature_2__c ||
            item.Product2.Feature_3__c
        );
    }
    handleQuantityChange(event) {
        const cartItemId = event.target.dataset.cartitemid; // The cart item ID to update
        const updatedQuantity =  parseInt(event.target.value, 10); // The new quantity for the cart item
 
       
   
        console.log('Updating cart item:', cartItemId, 'New Quantity:', updatedQuantity);
        if(cartItemId && updatedQuantity) {
            updateItemInCart(cartItemId, updatedQuantity)
            .then(() => {
                refreshApex(this.wiredCartItems);
                this.handleUpdateCartCount(); // Update cart count or UI refresh
                console.log('updateItem in Cart through API');
            })
            .catch((error) => {
                console.error('Error updating cart item:', error);
                this.modalTitle = 'Error';
                this.modalMessage = 'Failed to update quantity'; // Error message
                this.modalType = 'error';
                this.isUpdateCartModalOpen = true;
                this._updateCartModalTimer = setTimeout(() => {
                    this.handleModalClose();
                }, 5000);
            });
        }
       
    }

 

}