import { LightningElement, track, wire } from 'lwc';
import { CartSummaryAdapter } from 'commerce/cartApi';
import getCartOrderSummary from '@salesforce/apex/orderSummaryCart.getCartOrderSummary';
import getCart from '@salesforce/apex/orderSummaryCart.getCart';
import getTotalTaxAmount from '@salesforce/apex/orderSummaryCart.getTotalTaxAmount';
import applyCouponDiscount from '@salesforce/apex/orderSummaryCart.applyCouponDiscount';

import { subscribe, MessageContext } from 'lightning/messageService';
import MY_MESSAGE_CHANNEL from '@salesforce/messageChannel/CustomChannel__c';
import { refreshApex } from '@salesforce/apex';

export default class OrderSummaryCart extends LightningElement {
    @track cartId;
    @track cartItems = [];
    @track cartDetails = {};
    @track totalTaxAmount = 0;
    @track couponCode = '';
    @track error;
    wiredCartItems; // Stores the wire result for refreshApex
    // wiredSalesTax;
    wiredGrandTotal;
    @track discountedTotal; // Store the discounted total
    @track couponError = ''; // Store the error related to coupon application
    @track appliedCoupon = ''; 
    @track totalDiscount; 
    @track isAppliedCoupon = false;

    @wire(MessageContext)
    messageContext;

    subscription = null;

    handleCustomAction(message) {
        if (message.action === 'updateCartTotals') {
            // alert('handleCustomAction - updateCartTotals');
            this.myFunction(message.payload);
        }
    }

    myFunction(data) {
        console.log('Function- myFunction triggered with data:', data);
        refreshApex(this.wiredCartItems);
        // refreshApex(this.wiredSalesTax);
        refreshApex(this.wiredGrandTotal);
    }

    connectedCallback() {
        // triggered from add to cart event
        console.log('OrderSummaryCart component loaded');
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                MY_MESSAGE_CHANNEL,
                (message) => this.handleCustomAction(message)
            );
        }
    }
    renderedCallback() {
        console.log('Component rendered');
    }

    @wire(CartSummaryAdapter)
    setCartSummary({ data, error }) {
        if (data) {
            this.cartId = data.cartId;

            this.fetchCartItems();
            this.fetchCartDetails();
            this.fetchTaxDetails();
        } else if (error) {
            this.error = error;
            console.error('Error fetching cart summary:', error);
        }
    }
    @wire(getCartOrderSummary, { cartId: '$cartId' })
    wiredGetCartOrderSummary(result) {
        this.wiredCartItems = result;
        const { data, error } = result;
        if (data) {
            this.cartItems = data.map((item) => ({
                ...item,
                 SalesPrice: this.formatPrice(item.SalesPrice),
                 TotalPrice: this.formatPrice(item.TotalPrice),
                CouponFinalPrice: item.CouponFinalPrice__c
                    ? this.formatPrice(item.CouponFinalPrice__c)
                    : 'No Coupon Applied'
            }));
            this.error = undefined;
        } else if (error) {
            console.error('Error fetching cart items:', error);
            this.error = error;
        }
    }

    // Fetch cart items from Apex
    fetchCartItems() {
        if (this.cartId) {
            getCartOrderSummary({ cartId: this.cartId })
                .then((result) => {
                    this.cartItems = result.map((item) => ({
                        ...item,
                        SalesPrice: this.formatPrice(item.SalesPrice),
                        TotalPrice: this.formatPrice(item.TotalPrice),
                        CouponFinalPrice: item.CouponFinalPrice__c
                        ? this.formatPrice(item.CouponFinalPrice__c)
                        : 'No Coupon Applied',
                    }));
                    this.error = undefined;
                })
                .catch((error) => {
                    console.error('Error fetching cart items:', error);
                    this.error = error;
                });
        }
    }

    // formatPrice(price) {
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

    // Fetch cart details (e.g., GrandTotalAmount) from Apex
    // fetchCartDetails() {
    //     if (this.cartId) {
    //         getCart({ cartId: this.cartId })
    //             .then((result) => {
    //                 this.cartDetails = result;
    //                 this.error = undefined;
    //         })
    //             .catch((error) => {
    //                 console.error('Error fetching cart details:', error);
    //                 this.error = error;
    //         });
    //     }
    // }

    @wire(getCart, { cartId: '$cartId' })
    wiredCartDetails(result) {
        this.wiredGrandTotal = result;
        const { data, error } = result;
        console.log('wiredCartDetails', data);
        if (data) {

            this.cartDetails = result.data;
            this.cartDetails = {
                ...result.data,
                GrandTotalAmount: this.formatPrice(result.data.GrandTotalAmount),
            };
            console.log('Formatted cartDetails:', this.cartDetails);
            this.error = undefined;
        } else if (error) {
            console.error('Error fetching cart details:', error);
            this.error = error;
        }
    }

    // Fetch cart details (e.g., GrandTotalAmount) from Apex
    fetchCartDetails() {
        if (this.cartId) {
            getCart({ cartId: this.cartId })
                .then((result) => {
                    this.cartDetails = {
                        ...result,
                        GrandTotalAmount: this.formatPrice(result.GrandTotalAmount),
                    };
                    this.error = undefined;
                })
                .catch((error) => {
                    console.error('Error fetching cart details:', error);
                    this.error = error;
                });
        }
    }


     // Fetch tax details (TotalTaxAmount)
     fetchTaxDetails() {
        if (this.cartId) {
            getTotalTaxAmount({ cartId: this.cartId })
                .then((result) => {
                    this.totalTaxAmount = this.formatPrice(result.TotalTaxAmount);
                    this.error = undefined;
                })
                .catch((error) => {
                    console.error('Error fetching tax details:', error);
                    this.error = error;
                });
        }
    }

    // formatPrice(price) {
    //     return new Intl.NumberFormat('en-US', {
    //         style: 'currency',
    //         currency: 'USD',
    //         minimumFractionDigits: 2,
    //         maximumFractionDigits: 2,
    //     }).format(price || 0);
    // }


    // Computed property to check if there are cart items
    get hasCartItems() {
        return this.cartItems && this.cartItems.length > 0;
    }

    // Computed property to get GrandTotalAmount
    get grandTotalAmount() {
        return this.cartDetails?.GrandTotalAmount || 0;
    }

    get displayTotalAmount() {
        return this.cartDetails?.Total_amount__c || this.cartDetails?.GrandTotalAmount || 0;
    }
    get grandTotal() {
        if (this.isAppliedCoupon) {
            return this.displayTotalAmount; // Return discounted total if coupon is applied
        }
        return this.cartDetails.GrandTotalAmount; // Return original grand total if no coupon is applied
    }

    handleCouponChange(event) {
        this.couponCode = event.target.value;
        console.log('Coupon Code:' , this.couponCode);
        console.log('Coupon Code changed:', event.target.value);
        if (this.couponCode.trim() === '') {
            this.removeCoupon();
        } else {
            this.applyCoupon();
        }
    }

    applyCoupon() {
        console.log('Starting applyCoupon method...');
    
        // Check if cartId and couponCode are available
        if (this.cartId && this.couponCode) {
            console.log('Applying coupon for cartId:', this.cartId, 'with couponCode:', this.couponCode);
    
            // Call Apex method to apply coupon
            applyCouponDiscount({ cartId: this.cartId, couponCode: this.couponCode })
                .then((result) => {
                    console.log('Result from applyCouponDiscount:', result);
    
                    const discountedTotal = result.discountedTotal;
                    const appliedCoupon = result.webCart ? result.webCart.Name : 'Unknown'; // Get the coupon's name from webCart
                    this.isAppliedCoupon = true;
                    // If discountedTotal exists, update cartDetails and discountedTotal
                    if (discountedTotal) {
                        // Update the cart details with the discounted total
                        this.cartDetails = {
                            ...this.cartDetails,  // Preserve any existing cart details
                            Total_amount__c: this.formatPrice(discountedTotal),  // Format discounted total
                        };
                        this.discountedTotal = discountedTotal;  // Store the discounted total for use in the UI
                        this.totalDiscount = result.totalDiscount;
                    } else {
                        console.warn('No discounted total received');
                    }
    
                    // Set applied coupon and reset any error
                    this.appliedCoupon = appliedCoupon;  // Store the applied coupon's name
                    this.couponError = '';  // Reset coupon error
    
                    // Log the updated cart details
                    console.log('Coupon applied successfully. Updated cartDetails:', this.cartDetails);
                    
                    // Refresh the cart items after applying the coupon
                    return refreshApex(this.wiredCartItems);
                })
                .catch((error) => {
                    console.error('Error applying coupon:', error);
                    this.couponError = error.body?.message || 'An error occurred while applying the coupon.';  // Show error message to the user
                });
        } else {
            console.warn('Cart ID or Coupon Code is missing');
            this.couponError = 'Please enter a valid coupon code.';  // Show validation error if cartId or couponCode is missing
        }
    }
    
    
    // removeCoupon() {
    //     console.log('Removing coupon and resetting to original price.');
    
    //     // Fetch original details from Apex or reset the cart details
    //     getCart({ cartId: this.cartId })
    //         .then((result) => {
    //             this.cartDetails = {
    //                 ...result,
    //                 GrandTotalAmount: this.formatPrice(result.GrandTotalAmount),
    //                 Original_Total__c: this.formatPrice(result.GrandTotalAmount)
    //             };
    //             this.discountedTotal = null;  // Clear the discounted total
    //             this.totalDiscount = null;    // Clear the total discount
    //             this.appliedCoupon = null;    // Clear the applied coupon name
    //             this.couponCode = ''; // Clear the coupon input
    //             this.error = undefined;
    //             console.log('Coupon removed. Updated cartDetails:', this.cartDetails);
    //             // return refreshApex(this.wiredCartItems); // Refresh cart data
    //         })
    //         .catch((error) => {
    //             console.error('Error resetting cart details:', error);
    //             this.error = error.body?.message || 'An error occurred while resetting the cart.';
    //         });
    // }
    removeCoupon() {
        console.log('Removing coupon and resetting to original price.');
    
        // Fetch the cart details (original amounts) after removing the coupon
        getCart({ cartId: this.cartId })
            .then((result) => {
                console.log('getCart result:', result);
    
                // Update cart details to show original grand total and reset prices
                this.cartDetails = {
                    ...result,
                    GrandTotalAmount: this.formatPrice(result.GrandTotalAmount),
                };
    
                // Refresh cart items to fetch the original prices from Apex
                return getCartOrderSummary({ cartId: this.cartId });
            })
            .then((cartItems) => {
                // Update cart items with original prices
                this.cartItems = cartItems.map((item) => ({
                    ...item,
                    SalesPrice: this.formatPrice(item.SalesPrice),
                    TotalPrice: this.formatPrice(item.TotalPrice),
                    CouponFinalPrice: 'No Coupon Applied', // Reset coupon-specific prices
                }));
    
                // Reset state variables
                this.totalDiscount = 0;
                this.isAppliedCoupon = false;
                this.couponCode = ''; // Clear the coupon input field
                this.couponError = ''; // Clear any previous error messages
    
                console.log('Coupon removed. Updated cart details and items:', this.cartDetails, this.cartItems);
    
                // Refresh wired data if needed
                return refreshApex(this.wiredCartItems);
            })
            .catch((error) => {
                console.error('Error resetting cart details:', error);
                this.couponError = error.body?.message || 'An error occurred while resetting the cart.';
            });
    }
    
    
    
}