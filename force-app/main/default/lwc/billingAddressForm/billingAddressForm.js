import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CartSummaryAdapter } from 'commerce/cartApi';
import updateCartDetails from '@salesforce/apex/BillingAddressController.updateCartDetails';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import CONTACT_NAME from '@salesforce/schema/Contact.Name';
import { NavigationMixin } from 'lightning/navigation';

import { publish, MessageContext } from 'lightning/messageService';
import PO_MESSAGE_CHANNEL from '@salesforce/messageChannel/poMessageChannel__c';

export default class BillingAddressForm extends NavigationMixin(LightningElement) {
    @api recordId; // The Id of the Cart or Order record to update
    cartId;
    accountId;
    contactId;
    accountName;
    contactName;

    @track fullName = '';
    @track email = '';
    @track cardNumber = '';
    @track expiryDate = '';
    @track cvv = '';
    @track errors;
    @track agreedToTerms = false;


    // Billing address fields
    billingCompanyName = '';
    billingFirstName = '';
    billingLastName = '';
    billingEmail = '';
    billingStreet = '';
    billingCity = '';
    billingState = '';
    billingPostalCode = '';
    billingCountry = '';
    billingPhone = '';


    @track separateDeliveryAddress = false;
    @track shippingDetails = {};


    //=============Added by Shubham for PO custom ===================================================================c/b2bRecommendations

    @track selectedPaymentType = 'card';
    poNumber;

    // Wire message context for Lightning Message Service
    @wire(MessageContext)
    messageContext;


    get isCardSelected() {
        return this.selectedPaymentType === 'card';
    }

    get isPOSelected() {
        return this.selectedPaymentType === 'po';
    }

    get cardClass() {
        return this.selectedPaymentType === 'card' ? 'q-selected' : '';
    }

    get poClass() {
        return this.selectedPaymentType === 'po' ? 'q-selected' : '';
    }

    get wireClass() {
        return this.selectedPaymentType === 'wire' ? 'q-selected' : '';
    }

    handlePaymentTypeSelection(event) {
        this.selectedPaymentType = event.currentTarget.dataset.type;
    }

    handlePOChange(event) {
        this.poNumber = event.target.value;
        console.log('poNumber from Billing --->> ' + this.poNumber);
    }


    //========================================================================================================================================

    connectedCallback() {
        this.retrievePaymentInfo();
    }

    handleBillingInputChange(event) {
        const field = event.target.name;
        if (field === 'street') {
            this.billingStreet = event.target.value;
        } else if (field === 'city') {
            this.billingCity = event.target.value;
        } else if (field === 'state') {
            this.billingState = event.target.value;
        } else if (field === 'postalCode') {
            this.billingPostalCode = event.target.value;
        } else if (field === 'country') {
            this.billingCountry = event.target.value;
        }
        else if (field === 'Phone') {
            this.billingPhone = event.target.value;
        }
    }

    @wire(CartSummaryAdapter)
    setCartSummary({ data, error }) {
        if (data) {
            this.cartId = data.cartId;
        } else if (error) {
            console.error(error);
        }
    }

    handlePaymentInputChange(event) {
        const field = event.target.name;
        const value = event.target.value;

        if (field === 'cardNumber') {
            this.cardNumber = value;
        } else if (field === 'expiryDate') {
            const regex = /^(0[1-9]|1[0-2])\/\d{2}$/; // Validates MM/YY format
            if (regex.test(value)) {
                this.expiryDate = value;
                event.target.setCustomValidity(''); // Clear any previous error
            } else {
                this.expiryDate = ''; // Optionally clear invalid input
                event.target.setCustomValidity('Enter a valid expiration date in MM/YY format.');
            }
            event.target.reportValidity(); // Show validity messages
        } else if (field === 'cvv') {
            this.cvv = value;
        }
    }

    toggleDeliveryAddress(event) {
        this.separateDeliveryAddress = event.target.checked;
    }

    handleShippingChange(event) {
        this.shippingDetails = event.detail;
    }

    retrievePaymentInfo() {
        const storedPaymentInfo = localStorage.getItem('paymentInfo');
        if (storedPaymentInfo) {
            const paymentInfo = JSON.parse(storedPaymentInfo);
            this.cardNumber = paymentInfo.cardNumber;
            this.expiryDate = paymentInfo.expiryDate;
            this.cvv = paymentInfo.cvv;
        }
    }

    validateInputs() {
        return (
            this.cardNumber.length === 16 &&
            this.expiryDate.length === 5 &&
            this.cvv.length === 3
        );
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    handleReviewDetails() {

        if (this.poNumber) {
            const payload = { poNumber: this.poNumber };
            publish(this.messageContext, PO_MESSAGE_CHANNEL, payload);
        }

        if (this.poNumber) {
            this.processPayment();
            this.navigateToReviewPage();

        } else {

            const inputs = this.template.querySelectorAll('lightning-input');
            let isValid = true;

            const inputs1 = this.template.querySelectorAll('input');
            let isValid1 = true;

            inputs.forEach((input) => {
                if (!input.reportValidity()) {
                    isValid = false;
                }
            });

            inputs1.forEach((input1) => {
                if (!input1.reportValidity()) {
                    isValid1 = false;
                }
            });

            if (isValid && isValid1) {
                console.log('The address values are valid');
                if (this.cartId) {
                    updateCartDetails({
                        cartId: this.cartId,
                        billingStreet: this.billingStreet,
                        billingCity: this.billingCity,
                        billingState: this.billingState,
                        billingCountry: this.billingCountry,
                        billingPostalCode: this.billingPostalCode,
                        separateDeliveryAddress: this.separateDeliveryAddress,
                        contactName: this.contactName
                    })
                        .then(() => {
                            this.processPayment();
                            this.navigateToReviewPage();
                        })
                        .catch(error => {
                            this.showToast(
                                'Error',
                                error.body ? error.body.message : 'Failed to update billing address.',
                                'error'
                            );
                        });
                } else {
                    this.showToast('Error', 'Cart ID is missing. Cannot update billing address.', 'error');
                }
            } else {
                this.errors = 'Please fill all the Required fileds';
                console.log('The address values are invalid');
                console.error('Form contains errors. Please fix them before submitting.');
            }

        }

    }

    processPayment() {
        if (this.poNumber) {
            localStorage.setItem('poNumber', JSON.stringify(this.poNumber));
        }
        else {
            const paymentToken = `TOKEN_${Date.now()}`;
            const paymentInfo = {
                cardNumber: this.cardNumber,
                expiryDate: this.expiryDate,
                cvv: this.cvv,
                paymentToken: paymentToken
            };
            localStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
            this.showToast('Success', 'Payment processed successfully.', 'success');

        }

    }

    navigateToReviewPage() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/CIQuestEStore/review-details?cartId=${this.cartId}`
            }
        });
    }

    @wire(getRecord, { recordId: USER_ID, fields: [CONTACT_ID, ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.contactId = getFieldValue(data, CONTACT_ID);
            this.accountId = getFieldValue(data, ACCOUNT_ID);
        }
    }

    @wire(getRecord, { recordId: '$accountId', fields: [ACCOUNT_NAME] })
    account({ data, error }) {
        if (data) {
            this.accountName = getFieldValue(data, ACCOUNT_NAME);
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
}