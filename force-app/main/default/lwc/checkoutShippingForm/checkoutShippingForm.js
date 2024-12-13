import { LightningElement, track, wire } from 'lwc';
import saveShippingInfo from '@salesforce/apex/CheckoutController.saveShippingInfo';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { CartSummaryAdapter } from "commerce/cartApi";
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';

export default class CheckoutShippingForm extends LightningElement {
    @track fullName = '';
    @track street = '';
    @track city = '';
    @track state = '';
    @track postalCode = '';
    @track country = '';

    @track CartId;
    @track accountId;

    @wire(CartSummaryAdapter)
    setCartSummary({ data, error }) {
        if (data) {
            console.log("Cart Id", data.cartId);
            console.log("Cart", data);
            this.CartId = data.cartId;
        } else if (error) {
            console.error(error);
        }
    }

    connectedCallback() {
        getShippingInformation();
    }

    getShippingInformation() {
        getShippingInfo({ cartId: this.CartId }).then((data) => {
            console.log('shipping info', data);
            if (data) {
                // Update shipping info
                this.fullName = data.DeliverToName;
                this.street = data.DeliverToStreet;
                this.city = data.DeliverToCity;
                this.state = data.DeliverToState;
                this.postalCode = data.DeliverToPostalCode;
                this.country = data.DeliverToCountry;
            }
        })
        .catch((error) => {
            console.error('Error getting shipping info.');
        });
    }


    // Handle input changes
    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    // Save shipping address
    saveShippingAddress() {
        // Validate required fields
        if (!this.fullName || !this.street || !this.city || !this.state || !this.postalCode || !this.country) {
            console.log('Error, All fields are required.');
            this.showToast('Error', 'All fields are required.', 'error');
            return;
        }

        // Prepare data
        const shippingInfo = {
            fullName: this.fullName,
            street: this.street,
            city: this.city,
            state: this.state,
            postalCode: this.postalCode,
            country: this.country
        };


        // Call Apex to save data
        saveShippingInfo({ shippingDetails: shippingInfo, cartId: this.CartId })
            .then(() => {
                console.log('Success, Shipping address saved successfully.');
                this.showToast('Success', 'Shipping address saved successfully.', 'success');
            })
            .catch((error) => {
                console.error('Error saving shipping address:', error);
                this.showToast('Error', 'Failed to save shipping address. Please try again.', 'error');
            });
    }
    
        validateShippingAddress() {
            const street = this.template.querySelector('[name="shippingStreet"]').value;
            const city = this.template.querySelector('[name="shippingCity"]').value;
            const state = this.template.querySelector('[name="shippingState"]').value;
            const postalCode = this.template.querySelector('[name="shippingPostalCode"]').value;
            const country = this.template.querySelector('[name="shippingCountry"]').value;
        
            return street && city && state && postalCode && country; // Return true if all fields are filled
        }
    

    // Utility to show toast messages
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title,
            message,
            variant
        });
        this.dispatchEvent(event);
    }
}