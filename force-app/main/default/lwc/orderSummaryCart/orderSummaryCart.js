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
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                MY_MESSAGE_CHANNEL,
                (message) => this.handleCustomAction(message)
            );
        }
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
                // SalesPrice: this.formatPrice(item.SalesPrice),
                // TotalPrice: this.formatPrice(item.TotalPrice),
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

    handleCouponChange(event) {
        this.couponCode = event.target.value;
        if (this.couponCode.trim() === '') {
            this.removeCoupon();
        } else {
            this.applyCoupon();
        }
    }
    applyCoupon() {
        if (this.cartId && this.couponCode) {
            console.log('Applying coupon for cartId:', this.cartId, 'with couponCode:', this.couponCode);
            
            applyCouponDiscount({ cartId: this.cartId, couponCode: this.couponCode })
                .then((result) => {
                    console.log('Result from applyCouponDiscount:', result);

                    const discountedTotal = result.discountedTotal;
                    // const grandTotalAmount = result.GrandTotalAmount;
                    // const totalAdjustmentAmount = result.TotalAdjustmentAmount;
                    // const totalTaxAmount = result.TotalTaxAmount;
                    
                    this.cartDetails = {
                        Total_amount__c: this.formatPrice(discountedTotal || 0),
                        // GrandTotalAmount: this.formatPrice(grandTotalAmount || 0),
                        // TotalAdjustmentAmount: this.formatPrice(totalAdjustmentAmount || 0),
                        // TotalTaxAmount: this.formatPrice(totalTaxAmount || 0),
                    };
                    this.error = undefined;
                    console.log('Coupon applied successfully. Updated cartDetails:', this.cartDetails);
                    return refreshApex(this.wiredCartItems); // Refresh cart data
                })
                .catch((error) => {
                    console.error('Error applying coupon:', error);
                    this.error = error.body?.message || 'An error occurred while applying the coupon.';
                });
        } else {
            console.warn('Cart ID or Coupon Code is missing');
            this.error = 'Please enter a valid coupon code.'; 
        }
    }
    removeCoupon() {
        console.log('Removing coupon and resetting to original price.');
    
        // Fetch original details from Apex or reset the cart details
        getCart({ cartId: this.cartId })
            .then((result) => {
                this.cartDetails = {
                    ...result,
                    GrandTotalAmount: this.formatPrice(result.GrandTotalAmount),
                    Original_Total__c: this.formatPrice(result.GrandTotalAmount)
                };
                this.couponCode = ''; // Clear the coupon input
                this.error = undefined;
                console.log('Coupon removed. Updated cartDetails:', this.cartDetails);
                // return refreshApex(this.wiredCartItems); // Refresh cart data
            })
            .catch((error) => {
                console.error('Error resetting cart details:', error);
                this.error = error.body?.message || 'An error occurred while resetting the cart.';
            });
    }
    
}