import { LightningElement, wire, track } from 'lwc';
import { CartSummaryAdapter } from 'commerce/cartApi';
import getProductSellingModels from '@salesforce/apex/CartController.getProductSellingModels';
import getCartItems from '@salesforce/apex/CartController.getCartItems';
import updateCartItemQuantity from '@salesforce/apex/CartController.updateCartItemQuantity';
import deleteCartItem from '@salesforce/apex/CartController.deleteCartItem';
import clearAllCartItems from '@salesforce/apex/CartController.clearAllCartItems';
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
        console.log(' Add to cart Message published:', message2);
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
       // this.isShowModal = true;
       // console.log(this.isShowModal);
        //this.template.querySelector('.slds-modal').classList.add('slds-fade-in');
    }

    hideModalBox(event) {
        event.preventDefault();
        const clickedElement = event.target;
        let parentDiv = clickedElement.closest('.renewal-term__container');
        parentDiv.querySelector('.change-term-content').classList.add('d-none');
        //this.isShowModal = false;
       // console.log(this.isShowModal);
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

    // Fetch cart items from Apex
    fetchCartItems() {
        if (this.cartId) {
            getCartItems({ cartId: this.cartId })
                .then((result) => {
                    // Add 'hasFeatures' property to each cart item
                    this.cartItems = result.map((item) => ({
                        ...item,
                        SalesPrice: this.formatPrice(item.SalesPrice),
                        TotalPrice: this.formatPrice(item.TotalPrice),
                        Final_price__c: item.Product2.Final_price__c ?
                            this.formatPrice(item.Product2.Final_price__c)
                            : null,
                        hasFeatures: this.hasFeatures(item), // Add the feature check
                        CurrencyIsoCode: item.CurrencyIsoCode
                    }));
                })
                .catch((error) => {
                    console.error('Error fetching cart items:', error);
                    this.error = error;
                });
        }
    }

     // Format price to 2 decimal places
    //  formatPrice(price) {
    //     return new Intl.NumberFormat('en-US', {
    //         style: 'currency',
    //         currency: 'USD',
    //         minimumFractionDigits: 2,
    //         maximumFractionDigits: 2,
    //     }).format(price || 0);
    // }

    formatPrice(price, currencyCode) {
        if (!price) {
            return '-';
        }

        if (price && typeof price == 'string') {
            price = parseFloat(price);
        }

        if (!currencyCode) {
            currencyCode = 'USD'; // Default to USD if no currency is provided
        }

        let currencySymbol = '';

        // Assign currency symbol based on CurrencyIsoCode
        if (currencyCode === 'USD') {
            currencySymbol = '$';
        } else if (currencyCode === 'INR') {
            currencySymbol = '₹';
        } else {
            currencySymbol = currencyCode; // Default to currency code if no specific symbol is found
        }

        // Format the price with the respective currency symbol
        return `${currencySymbol} ${price.toFixed(2)}`;
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

    // Reactive cart items with @wire
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
                    Final_price__c: item.Product2.Final_price__c ? this.formatPrice(item.Product2.Final_price__c)
                    : null,
                    hasFeatures: this.hasFeatures(item), // Add feature check
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
    handleQuantityChange(event) {
        const itemId = event.target.dataset.cartitemid;
        const newQuantity = parseInt(event.target.value, 10);

        if (itemId && newQuantity > 0) {
            updateCartItemQuantity({ cartId: this.cartId, itemId, newQuantity })
            .then(() => {
                refreshApex(this.wiredCartItems);
                this.handleUpdateCartCount();
            })
                .catch((error) => console.error('Error updating quantity:', error));
        }
    }

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
            console.log('Selected Renewal Term:', selectedModel.value);
        } else {
            console.warn('No renewal term selected!');
        }
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
}