import { LightningElement, wire, track, api } from 'lwc';
import fetchCartDetails from '@salesforce/apex/CartDetailsController.getCartDetails';
import createOrderFromCart from '@salesforce/apex/CreateOrderController.createOrderFromCart';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import CONTACT_NAME from '@salesforce/schema/Contact.Name';
import WebstoreId from '@salesforce/label/c.WebstoreId';

import { subscribe, MessageContext } from 'lightning/messageService';
import PO_MESSAGE_CHANNEL from '@salesforce/messageChannel/poMessageChannel__c';
import { CheckoutInformationAdapter, simplePurchaseOrderPayment, useCheckoutComponent } from "commerce/checkoutApi";
import { refreshCartSummary } from "commerce/cartApi";

export default class ReviewCartDetails extends NavigationMixin(LightningElement) {
    @track cartId;
    @track cartDetails;
    @track paymentDetails = {};
    @track error;
    @track storeId;
    accountId;
    contactId;
    contactName;

    @track termsAccepted = false;
    @track isOrderButtonDisabled = true;

    //Added by Shubham to capture PO number ========================================================================================c/b2bRecommendations

    @track receivedPoNumber = '';
    storedPONumber;

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

    // Checkout data -- 

    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ error, data }) {
        if (data) {
            this.checkoutId = data.checkoutId;
            console.log("this.checkoutId-->>: " + this.checkoutId);
            this.shippingAddress = this.cartDetails.shippingAddress;
            console.log("shippingAddress-->> " + this.shippingAddress);
        } else if (error) {
            console.log("##simplePurchaseOrder checkoutInfo Error: " + error);
        }
    }


    @api
    async paymentProcess() {

        await this.completePayment();

        // const orderConfirmation = await this.dispatchPlaceOrderAsync();

        // if (orderConfirmation.orderReferenceNumber) {
        //     refreshCartSummary();
        //     this.navigateToOrder(orderConfirmation.orderReferenceNumber);
        //     console.log('simplePurchaseOrder orderReferenceNumber: '+orderConfirmation.orderReferenceNumber);
        // } else {
        //     throw new Error("Required orderReferenceNumber is missing");
        // }
    }

    @api
    async completePayment(){
        let address = this.shippingAddress;
        const purchaseOrderInputValue = this.storedPONumber;

        let po = await simplePurchaseOrderPayment(this.checkoutId, purchaseOrderInputValue, address);
        return po;
    }



    //===================================================================================================================================

    connectedCallback() {
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
                console.log('cartDetails --- >> ' + JSON.parse(JSON.stringify(this.cartDetails)));
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

        if(this.poNumber){

            this.paymentProcess();

        }else{

            if (this.termsAccepted) {
                const params = {
                    cartId: this.cartId,
                    accountId: this.accountId,
                    storeId: this.storeId,
                    paymentDetails: {
                        //cardHolderName: this.cartDetails.billingAddress.ContactName,
                        cardLastFour: this.paymentDetails.cardLastFour,
                        cardNumber: localStorage.getItem('paymentInfo') ? JSON.parse(localStorage.getItem('paymentInfo')).cardNumber : '',
                        expiryMonth: this.paymentDetails.expiryDate.split('/')[0],
                        cardBin: localStorage.getItem('paymentInfo') ? JSON.parse(localStorage.getItem('paymentInfo')).cardNumber.slice(0, 6) : '', // First 6 digits of the card
                        displayCardNumber: localStorage.getItem('paymentInfo')
                            ? 'XXXX-XXXX-XXXX-' + JSON.parse(localStorage.getItem('paymentInfo')).cardNumber.slice(-4)
                            : '',
                        expiryYear: `20${this.paymentDetails.expiryDate.split('/')[1]}`,
                        gatewayToken: 'sampleToken123'
                    },
                    contactName: this.contactName
                };
    
                console.log('cartId ===', this.cartId); // Debug log
                console.log('accountId ===', this.accountId); // Debug log
    
                createOrderFromCart(params)
                    .then((result) => {
                        console.log('Order Result:', result);
                        const orderId = result;
                        console.log('orderId===>' + orderId);
    
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
                        console.error('Error:', error); // Debug log
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error',
                                message: error.body.message,
                                variant: 'error'
                            })
                        );
                    });
            } else {
                console.error('Please accept the terms and conditions before proceeding.'); // Debug log
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
        // Navigate to the order confirmation page
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/order?orderId=${orderId}` // Updated URL with query parameter
            }
        });
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }

}