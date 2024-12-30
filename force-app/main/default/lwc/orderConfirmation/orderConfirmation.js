import { LightningElement, api, wire, track } from 'lwc';
import fetchOrderDetails from '@salesforce/apex/OrderConfirmationController.getOrderDetails';
import fetchOrderDetailsPO from '@salesforce/apex/OrderConfirmationController.getOrderRecordPO';
import USER_ID from '@salesforce/user/Id';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import CONTACT_NAME from '@salesforce/schema/Contact.Name';
import { NavigationMixin } from 'lightning/navigation';

export default class OrderConfirmation extends NavigationMixin(LightningElement) {
    @track orderDetails;
    @track error;
    contactId;
    contactName;

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
        const orderId = queryParams.get('orderId');

        console.log('Retrieved orderId from URL:', orderId);

        if (orderId && orderId.startsWith('801')) {
            console.log('OrderId starts with 801. Calling fetchOrderDetailsFromApex with:', orderId);
            this.fetchOrderDetailsFromApex(orderId);
        } else if (orderId) {
            console.log('OrderId does not start with 801. Calling fetchOrderDetailsFromApexPO with:', orderId);
            this.fetchOrderDetailsFromApexPO(orderId);
        } else {
            console.error('No orderId found in the URL query parameters.');
        }

    }

    fetchOrderDetailsFromApexPO(orderRef) {
        console.log('orderRef Number passed as orderId is-->>'+ orderRef);
        fetchOrderDetailsPO({ orderRef })
            .then((result) => {
                console.log('Raw order data from Apex for PO Order Confirmation LWC comp: -->>> ', result);
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
                this.error = undefined;
            })
            .catch((error) => {
                this.error = error;
                this.orderDetails = undefined;
                console.error('Error fetching order details from PO:', error);
            });

    }

    fetchOrderDetailsFromApex(orderId) {
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
                this.error = undefined;
            })
            .catch((error) => {
                this.error = error;
                this.orderDetails = undefined;
                console.error('Error fetching order details:', error);
            });
    }
    handleQuestSupport() {
        console.log('handleQuestSupport');
    }
    handleEcommerceSupport() {
        console.log('handleEcommerceSupport');
    }

}