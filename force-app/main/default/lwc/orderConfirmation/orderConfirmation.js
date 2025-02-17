import { LightningElement, api, wire, track } from 'lwc';
import fetchOrderDetails from '@salesforce/apex/OrderConfirmationController.getOrderDetails';
import fetchOrderDetailsPO from '@salesforce/apex/OrderConfirmationController.getOrderRecordPO';
import USER_ID from '@salesforce/user/Id';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import CONTACT_NAME from '@salesforce/schema/Contact.Name';
import { NavigationMixin } from 'lightning/navigation';
import getOrderId from '@salesforce/apex/CartUtilsController.getOrderId';

export default class OrderConfirmation extends NavigationMixin(LightningElement) {
    @track orderDetails;
    @track error;
    contactId;
    contactName;
    isPoOrder = false;
    isCreditCard = false
    isACH = false
    @track loading = false;

    @wire(getRecord, { recordId: USER_ID, fields: [CONTACT_ID] })
    user({ data, error }) {
        if (data) {
            this.contactId = getFieldValue(data, CONTACT_ID);
        }
    }
    @wire(getRecord, { recordId: '$contactId', fields: [CONTACT_NAME] })
    contact({ data, error }) {
        if (data) {
            this.contactName = getFieldValue(data, CONTACT_NAME);
            this.billingFirstName = this.contactName.split(' ')[0];
            this.billingLastName = this.contactName.split(' ')[1];
        }
    }

    connectedCallback() {
        const queryParams = new URLSearchParams(window.location.search);
        var orderId = queryParams.get('orderId');
        const orderNumber = queryParams.get('orderNumber');
        console.log('orderNumber : ' + orderNumber);
        console.log('Retrieved orderId from URL:', orderId);

        if (orderNumber) {
            getOrderId({orderRefNumber: orderNumber})
            .then(function(orderID){
                console.log('orderid: '+orderID);
                orderId = orderID;
                Promise.resolve(this.fetchOrderDetailsFromApex(orderId));
            }.bind(this))
            .catch((error) => {
                console.error('Error fetching Order id:', error);
            });
        }
        else if (orderId && orderId.startsWith('801')) {
            console.log('OrderId starts with 801. Calling fetchOrderDetailsFromApex with:', orderId);
            Promise.resolve(this.fetchOrderDetailsFromApex(orderId));
        } else if (orderId) {
            console.log('OrderId does not start with 801. Calling fetchOrderDetailsFromApexPO with:', orderId);
            this.fetchOrderDetailsFromApexPO(orderId);
        } else {
            console.error('No orderId found in the URL query parameters.');
        }
    }

    async fetchOrderDetailsFromApex(orderId) {
        this.loading = true; // Start loading
        fetchOrderDetails({ orderId })
            .then((result) => {
                console.log('Raw order data from Apex: -->>> ', result);
                this.orderDetails = {
                    ...result,
                    cardLastFour: result.cardLastFour || 'N/A',
                    products: result.products.map((item) => {
                        return {
                            id: item.Id,
                            name: item.Product2?.Name || 'N/A',
                            quantity: item.Quantity || 0,
                            feature1: item.Product2?.Feature_1__c || 'N/A',
                            feature2: item.Product2?.Feature_2__c || 'N/A',
                            feature3: item.Product2?.Feature_3__c || 'N/A'
                        };
                    })
                };
                this.isCreditCard = this.orderDetails.paymentMethodType && this.orderDetails.paymentMethodType === 'Credit Card';
                this.isACH = this.orderDetails.paymentMethodType && this.orderDetails.paymentMethodType === 'ACH';
                this.isPoOrder = this.orderDetails.paymentMethodType && this.orderDetails.paymentMethodType == 'PO';

                this.error = undefined;
                // console.log('isACH:', this.isACH);
                // console.log('isCreditCard:', this.isCreditCard);
            })
            .catch((error) => {
                this.error = error;
                this.orderDetails = undefined;
                console.error('Error fetching order details:', error);
            })
            .finally(() => {
                this.loading = false; // Stop loading
            });
    }

    // fetchOrderDetailsFromApexPO(orderRef) {
    //     // console.log('orderRef Number passed as orderId is-->>' + orderRef);
    //     this.isPoOrder = true;
    //     this.loading = true;
    //     fetchOrderDetailsPO({ orderRef })
    //         .then((result) => {
    //             console.log('Raw order data from Apex for PO Order Confirmation LWC comp: -->>> ', result);
    //             this.orderDetails = {
    //                 ...result,
    //                 products: result.products.map((item) => {
    //                     return {
    //                         id: item.Id,
    //                         name: item.Product2?.Name || 'N/A',
    //                         quantity: item.Quantity || 0,
    //                         feature1: item.Product2?.Feature_1__c || 'N/A',
    //                         feature2: item.Product2?.Feature_2__c || 'N/A',
    //                         feature3: item.Product2?.Feature_3__c || 'N/A'
    //                     };
    //                 })
    //             };
    //             this.error = undefined;
    //             this.isPoOrder = this.orderDetails.paymentMethodType && this.orderDetails.paymentMethodType == 'PO';
    //             console.log('isPoOrder -->> '+ this.isPoOrder);
    //         })
    //         .catch((error) => {
    //             this.error = error;
    //             this.orderDetails = undefined;
    //             console.error('Error fetching order details from PO:', error);
    //         })
    //         .finally(() => {
    //             this.loading = false; 
    //         });
    // }

    handleQuestSupport() {
        console.log('handleQuestSupport');
    }
    handleEcommerceSupport() {
        console.log('handleEcommerceSupport');
    }

}