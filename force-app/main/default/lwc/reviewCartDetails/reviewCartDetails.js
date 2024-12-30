import { LightningElement, wire, track, api } from 'lwc';
import fetchCartDetails from '@salesforce/apex/CartDetailsController.getCartDetails';
import createOrderFromCart from '@salesforce/apex/CreateOrderController.createOrderFromCart';
import getOrderForNavigation from '@salesforce/apex/CreateOrderController.getOrderForNavigation';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import CONTACT_NAME from '@salesforce/schema/Contact.Name';
import WebstoreId from '@salesforce/label/c.WebstoreId';

import { subscribe, MessageContext } from 'lightning/messageService';
import PO_MESSAGE_CHANNEL from '@salesforce/messageChannel/poMessageChannel__c';
import { CheckoutInformationAdapter, simplePurchaseOrderPayment, placeOrder } from "commerce/checkoutApi";
import preAuthorizePayment from '@salesforce/apex/AlternativePaymentController.preAuthorize';
import { refreshCartSummary, CartSummaryAdapter } from "commerce/cartApi";
import communityId from "@salesforce/community/Id";

const CheckoutStage = {
    CHECK_VALIDITY_UPDATE: 'CHECK_VALIDITY_UPDATE',
    REPORT_VALIDITY_SAVE: 'REPORT_VALIDITY_SAVE',
    BEFORE_PAYMENT: 'BEFORE_PAYMENT',
    PAYMENT: 'PAYMENT',
    BEFORE_PLACE_ORDER: 'BEFORE_PLACE_ORDER',
    PLACE_ORDER: 'PLACE_ORDER'
};

export default class ReviewCartDetails extends NavigationMixin(LightningElement) {
    @track cartId;
    @track cartDetails;
    @track paymentDetails = {};
    @track error;
    @track storeId;
    currentCommunityId = '';
    accountId;
    contactId;
    contactName;

    @track termsAccepted = false;
    @track isOrderButtonDisabled = true;

    //Added by Shubham to capture PO number ========================================================================================c/b2bRecommendations

    @track receivedPoNumber = '';
    storedPONumber;
    orderReferenceNumber;
    @api ordSumId;

    // Wire message context for Lightning Message Service
    @wire(MessageContext)
    messageContext;


    subscribeToMessageChannel() {
        subscribe(this.messageContext, PO_MESSAGE_CHANNEL, (message) => {
            this.handleMessage(message);
        });
    }

    handleMessage(message) {
        if (message.poNumber) {
            this.receivedPoNumber = message.poNumber;
            console.log('Received poNumber -->>> ' + this.receivedPoNumber);
        }
    }

    @wire(CartSummaryAdapter, {})
    cartInfo({ error, data }) {
        if (data) {
            console.log("Data received from Cart Summary adapter -->> : ", JSON.stringify(data));
            this.cartSummary = data;

        } else if (error) {
            console.error("Error fetching cart information: ", JSON.stringify(error));
            // Optionally, display an error message to the user
        }
    }

    // Checkout data -- 

    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ error, data }) {
        if (data) {
            console.log("Data received from cehckout Information adapter -->> : ", JSON.stringify(data));
            this.checkoutId = data.checkoutId;
            // console.log("Checkout ID: ", this.checkoutId);

            this.shippingAddress = data?.deliveryGroups?.items?.[0]?.deliveryAddress;
            console.log('this.shippingAddress -->>>' + this.shippingAddress);
            // this.shippingAddress = this.staticShippingAddress;
            this.orderReferenceNumber = data.orderReferenceNumber;
            console.log('orderReferenceNumber -->>>' + this.orderReferenceNumber);

        } else if (error) {
            console.error("Error fetching checkout information: ", JSON.stringify(error));
            // Optionally, display an error message to the user
        }
    }

    /**
     * Authorize payment
     * @returns Bool - successed or fail on update
     */
    async authorizePayment() {
        await preAuthorizePayment({
            billingContactPointAddressId: this.shippingAddress,
            cartId: this.cartId,
            paymentMethod: 'Purchase Order'
        }).then(response => {
            // authorization is complete, move to complete the order
            this.placedOrder();
            return true;
        }).catch(error => {
            return false;
        });
    }

    @api
    async placedOrder() {
        if (!this.checkoutId) {
            console.error("Checkout ID is missing.");
            return null;
        }

        if (!this.shippingAddress) {
            console.error("Shipping address is missing.");
            return null;
        }

        try {
            // Capture the PO number entered or received via LMS
            const purchaseOrderInputValue = this.storedPONumber;

            // console.log("Initiating payment with Checkout ID:", this.checkoutId);
            // console.log("Using Shipping Address:", JSON.stringify(this.shippingAddress));
            // console.log("Using PO Number:", purchaseOrderInputValue);

            // Step 1: Authorize Payment using the PO number
            let poResponse = await simplePurchaseOrderPayment(this.checkoutId, purchaseOrderInputValue, this.shippingAddress);
            // console.log("Payment Response:---->>>>", JSON.stringify(poResponse));

            if (poResponse.salesforceResultCode === 'Success') {
                let orderResponse = await placeOrder();
                console.log("Order placed successfully:-->>>", JSON.stringify(orderResponse));
                // this.getOrderId();
            
                if (orderResponse.orderReferenceNumber) {
                    refreshCartSummary();
                    this.navigateToOrderConfirmationSummary(this.orderReferenceNumber);

                    console.log('purchaseOrderWithAltPayment orderReferenceNumber: '+orderResponse.orderReferenceNumber);
                } else {
                    throw new Error("Required orderReferenceNumber is missing");
                }
            } else {
                console.error("Payment authorization failed:", poResponse.salesforceResultCode);
            }
            
        } catch (error) {
            console.error("Error during placedOrder process:", error);
        }
    }

    // getOrderId() {
    //     // Call the enqueueOrderFetch method to run the queueable job
    //     getOrderForNavigation({ OrderReference: this.orderReferenceNumber })
    //         .then(response => {
    //             // authorization is complete, move to complete the order
    //             console.log('response is -->> '+ response);
    //         }).catch((error) => {
    //             this.error = error;
    //             console.error('Error fetching order Id', error);
    //         });
    // }


    // Placeholder for refreshing cart summary
    refreshCartSummary() {
        console.log("Refreshing cart summary...");
        refreshCartSummary();
    }

    /**
     * update form when our container asks us to
     */
    stageAction(checkoutStage /*CheckoutStage*/) {
        switch (checkoutStage) {
            case CheckoutStage.CHECK_VALIDITY_UPDATE:
                return Promise.resolve(this.checkValidity());
            case CheckoutStage.REPORT_VALIDITY_SAVE:
                return Promise.resolve(this.reportValidity());
            case CheckoutStage.PAYMENT:
                return Promise.resolve(this.authorizePayment());
            default:
                return Promise.resolve(true);
        }
    }

    /**
     * Return true when terms checkoutbox is checked
     */
    checkValidity() {
        console.log('purchaseOrderWithAltPayment checkValidity');
        return true;
    }

    /**
     * Return true when terms checkoutbox is checked
     */
    reportValidity() {
        console.log('purchaseOrderWithAltPayment reportValidity');
        /* this.dispatchUpdateErrorAsync({
            groupId: 'Payment',
            type: '/commerce/errors/checkout-failure',
            exception: 'Purchase number must be filled in.',
        }); */

        return true;
    }

    // navigateToOrder() {
    //     this[NavigationMixin.Navigate]({
    //         type: 'comm__namedPage',
    //         attributes: {
    //             name: 'Order_Summary'
    //         },
    //         state: {
    //             recordId: this.ordSumId 
    //         }
    //     });

    // }
    



    //===================================================================================================================================

    connectedCallback() {
        this.currentCommunityId = communityId;
        this.storeId = WebstoreId;
        console.log('Store ID Label:', this.storeId);
        const queryParams = new URLSearchParams(window.location.search);
        this.cartId = queryParams.get('cartId');

        this.storedPONumber = localStorage.getItem('poNumber');
        console.log('poNumber from local storage --- >> ' + this.storedPONumber);


        this.subscribeToMessageChannel();

        if (this.cartId) {
            this.fetchCartDetailsFromApex();
        } else {
            console.error('No cartId found in the URL.');
        }

        this.retrievePaymentDetails();
    }

    @wire(getRecord, { recordId: USER_ID, fields: [CONTACT_ID, ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.contactId = getFieldValue(data, CONTACT_ID);
            this.accountId = getFieldValue(data, ACCOUNT_ID);
        }
    }
    @wire(getRecord, { recordId: '$contactId', fields: [CONTACT_NAME] })
    contact({ data, error }) {
        if (data) {
            this.contactName = getFieldValue(data, CONTACT_NAME);
        }
    }


    fetchCartDetailsFromApex() {
        fetchCartDetails({ cartId: this.cartId })
            .then((result) => {
                this.cartDetails = result;
                this.error = undefined;
                console.log('cartDetails --- >> ' + JSON.stringify(this.cartDetails));
            })
            .catch((error) => {
                this.error = error;
                this.cartDetails = undefined;
                console.error('Error fetching cart details:', error);
            });
    }

    retrievePaymentDetails() {
        const storedPaymentInfo = localStorage.getItem('paymentInfo');
        if (storedPaymentInfo) {
            const paymentInfo = JSON.parse(storedPaymentInfo);
            const cardNumber = paymentInfo.cardNumber;
            this.paymentDetails = {
                cardLastFour: cardNumber.slice(-4),
                expiryDate: paymentInfo.expiryDate,
                cardType: this.getCardType(cardNumber), // Determine card type
                cvv: paymentInfo.cvv
            };
        } else {
            console.warn('No payment details found in local storage.');
        }
    }

    getCardType(cardNumber) {
        const bin = cardNumber.slice(0, 6); // Get first 6 digits for BIN
        if (/^4/.test(bin)) {
            return 'Visa';
        } else if (/^5[1-5]/.test(bin)) {
            return 'MasterCard';
        } else if (/^3[47]/.test(bin)) {
            return 'American Express';
        } else if (/^6/.test(bin)) {
            return 'Discover';
        } else {
            return 'Unknown';
        }
    }

    handleQuantityChange(event) {
        const updatedQuantity = event.target.value;
        const cartItemId = event.target.dataset.cartitemid;

        const updatedCartItems = this.cartDetails.cartItems.map((item) => {
            if (item.Id === cartItemId) {
                item.Quantity = updatedQuantity;
                item.TotalPrice = updatedQuantity * item.SalesPrice;
            }
            return item;
        });

        const totalAmount = updatedCartItems.reduce((acc, item) => acc + item.TotalPrice, 0);

        this.cartDetails = {
            ...this.cartDetails,
            cartItems: updatedCartItems,
            totalAmount: totalAmount
        };
    }

    handleTermsChange(event) {
        this.termsAccepted = event.target.checked;
        this.isOrderButtonDisabled = !this.termsAccepted;
    }

    handleCompleteOrder() {
        console.log('Button clicked!'); // Debug log

        if (this.storedPONumber) {
            // For Purchase Order payment
            console.log('PO action fired !!!');

            this.authorizePayment()
                .then(() => {
                    console.log('Payment authorization successful.');
                    localStorage.removeItem('poNumber'); // Clear poNumber after processing
                })
                .catch((error) => {
                    console.error('Error during PO payment authorization:', error);
                    localStorage.removeItem('poNumber'); // Ensure poNumber is cleared even if there's an error
                });
        } else {
            // For Credit Card payment
            console.log('Credit card action fired !!!');

            if (this.termsAccepted) {
                const paymentInfo = localStorage.getItem('paymentInfo')
                    ? JSON.parse(localStorage.getItem('paymentInfo'))
                    : {};

                const params = {
                    cartId: this.cartId,
                    accountId: this.accountId,
                    storeId: this.storeId,
                    paymentDetails: {
                        cardLastFour: this.paymentDetails.cardLastFour,
                        cardNumber: paymentInfo.cardNumber || '',
                        expiryMonth: this.paymentDetails.expiryDate?.split('/')[0],
                        cardBin: paymentInfo.cardNumber ? paymentInfo.cardNumber.slice(0, 6) : '',
                        displayCardNumber: paymentInfo.cardNumber
                            ? 'XXXX-XXXX-XXXX-' + paymentInfo.cardNumber.slice(-4)
                            : '',
                        expiryYear: `20${this.paymentDetails.expiryDate?.split('/')[1]}`,
                        gatewayToken: 'sampleToken123'
                    },
                    contactName: this.contactName
                };

                createOrderFromCart(params)
                    .then((result) => {
                        console.log('Order Result:', result);
                        const orderId = result;

                        if (orderId) {
                            this.navigateToOrderConfirmation(orderId);
                            this.dispatchEvent(
                                new ShowToastEvent({
                                    title: 'Success',
                                    message: 'Order successfully placed!',
                                    variant: 'success'
                                })
                            );
                        } else {
                            console.error('No orderId returned from server.');
                            this.dispatchEvent(
                                new ShowToastEvent({
                                    title: 'Error',
                                    message: 'Failed to retrieve the Order ID.',
                                    variant: 'error'
                                })
                            );
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error',
                                message: error.body?.message || 'An unexpected error occurred.',
                                variant: 'error'
                            })
                        );
                    })
                    .finally(() => {
                        localStorage.removeItem('poNumber'); // Clear poNumber regardless of success or failure
                    });
            } else {
                console.error('Please accept the terms and conditions before proceeding.');
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Please accept the terms and conditions before proceeding.',
                        variant: 'error'
                    })
                );
            }
        }

    }

    navigateToOrderConfirmation(orderId) {
        // Navigate to the order confirmation page with multiple query parameters
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/order?orderId=${orderId}` // Multiple query parameters
            }
        });
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
    

    navigateToOrderConfirmationSummary(orderRefNum) {
        // Navigate to the order confirmation page
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/order?orderId=${orderRefNum}` // Updated URL with query parameter
            }
        });
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }

}