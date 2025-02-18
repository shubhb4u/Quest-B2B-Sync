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
import poMessageChannel from '@salesforce/messageChannel/poMessageChannel__c';
import deleteCart from '@salesforce/apex/CartUtilsController.deleteCart';
import encryptString from '@salesforce/apex/EncryptionUtil.encryptString';
import { loadScript } from 'lightning/platformResourceLoader';
import microformScript from '@salesforce/resourceUrl/CybersourceMicroform';
import communityId from '@salesforce/community/Id';
import getStateOptions from '@salesforce/apex/CybersourceController.getStateOptions';
import generateKey from '@salesforce/apex/CybersourceController.generateKey';

// Error Constants
const NAME_ERROR = 'Name fields are required';
const ADDRESS_ERROR = 'Address fields are required';
const CARD_EXPIRED_ERROR = 'Credit Card is expired';
const CARD_INVALID_ERROR = 'Invalid Card Number';
const CVV_INVALID_ERROR = 'Invalid Security Code';

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

    //---------CyberSource-------
    @api checkoutDetails;

    _checkoutMode = 1;
    transientToken;
    microform;
    firstName = '';
    lastName = '';
    nickname = '';
    street = '';
    city = '';
    state = '';
    postalCode = '';
    expMonth = '01';
    expYear = '2023';
    monthOptions = [
        { label: '01', value: '01' },
        { label: '02', value: '02' },
        { label: '03', value: '03' },
        { label: '04', value: '04' },
        { label: '05', value: '05' },
        { label: '06', value: '06' },
        { label: '07', value: '07' },
        { label: '08', value: '08' },
        { label: '09', value: '09' },
        { label: '10', value: '10' },
        { label: '11', value: '11' },
        { label: '12', value: '12' }
    ];
    yearOptions = [];
    stateOptions = [];

    effectiveAccountId;
    // cartAmount = 0.00;

    @track checkoutId;
    @track shippingAddress;
    @track errorMessages = [];
    @track billingAddress;
    @track grandTotalAmount;

    //---------CyberSource ends-------

    //=============Added by Shubham for PO custom ===================================================================c/b2bRecommendations

    @track selectedPaymentType = 'card';
    poNumber;

    // Wire message context for Lightning Message Service
    @wire(MessageContext)
    messageContext;

    get isWireSelected() {
        return this.selectedPaymentType === 'wire';
    }
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
        if(this.selectedPaymentType == 'wire') {
            // this.navigateToReviewPage();
        } else if (this.selectedPaymentType == 'card') {
            this.setupMicroform();
        }
    }

    handlePOChange(event) {
        this.poNumber = event.target.value;
    }


    //========================================================================================================================================

    connectedCallback() {
        // this.retrievePaymentInfo();
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

    handleWireInputChange(event) {
        const field = event.target.name;
        if (field === 'checkAccountNumber') {
            this.checkAccountNumber = event.target.value;
        } else if (field === 'routingNumber') {
            this.routingNumber = event.target.value;
        } else if (field === 'accountType') {
            this.accountType = event.target.value;
        }
    }

    // @wire(CartSummaryAdapter)
    // setCartSummary({ data, error }) {
    //     if (data) {
    //         this.cartId = data.cartId;
    //     } else if (error) {
    //         console.error(error);
    //     }
    // }

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

    // retrievePaymentInfo() {
    // }

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

    async handleReviewDetails() {
        if (!this.cartId) {
            this.errors = 'Cart ID is missing. Cannot update billing address. Please reload the page and recheck the cart items';
            return;
        }
        localStorage.removeItem("poNumber");
        localStorage.removeItem('ccPaymentInfo');
        localStorage.removeItem('wireDetails');

        const inputs = this.template.querySelectorAll('lightning-input');
        let isValid = true;

        const inputSelect = this.template.querySelectorAll('lightning-select');
        let isInputSelectValid = true;
        // checkboxes validation
        inputSelect.forEach((input) => {
            if (!input.reportValidity()) {
                isInputSelectValid = false;
            }
        });
        const inputs1 = this.template.querySelectorAll('input');
        let isValid1 = true;

        // lightening field validation
        inputs.forEach((input) => {
            if (!input.reportValidity()) {
                isValid = false;
            }
        });
        // checkboxes validation
        inputs1.forEach((input1) => {
            if (!input1.reportValidity()) {
                isValid1 = false;
            }
        });

        if (isValid && isValid1 && isInputSelectValid) {
            console.log('The address values are valid');
            const stateCode = this.state ? this.state.split(':')[0] : '';
            const countryCode = this.state ? this.state.split(':')[1] : '';
            var cartUpdatePayload = {
                cartId: this.cartId,
                billingStreet: this.billingStreet,
                billingCity: this.billingCity,
                billingState: stateCode,
                billingCountry: countryCode,
                billingPostalCode: this.billingPostalCode,
                separateDeliveryAddress: this.separateDeliveryAddress,
                contactName: this.contactName
            };

            if (this.selectedPaymentType === 'card') {
                this.transientToken = null;
                await this.createTransientToken();
                cartUpdatePayload.transientToken = this.transientToken;
                if (!this.transientToken) {
                    this.errors = 'Failed to generate the token from provided payment details.';
                }
            }

            if ((this.selectedPaymentType === 'card' && this.transientToken) || this.selectedPaymentType !== 'card') {
                updateCartDetails(cartUpdatePayload)
                .then(() => {
                    console.log('selectedPaymentType', this.selectedPaymentType);
                    console.log('this.poNumber', this.poNumber);
                    if (this.selectedPaymentType === 'po' && this.poNumber) {
                        const payload = { poNumber: this.poNumber };
                        publish(this.messageContext, poMessageChannel, payload);
                        this.processPayment();
                        this.navigateToReviewPage();
                    } else if (this.selectedPaymentType === 'card') {
                        this.processPayment();
                        this.navigateToReviewPage();
                    } else if (this.selectedPaymentType === 'wire') {
                        this.processPayment();
                        this.navigateToReviewPage();
                    }
                })
                .catch(error => {
                    this.errors = 'Failed to update billing address.';
                });
            }
        } else {
            if (!isValid || !isValid1) {
                this.errors = 'Please fill all the Required fileds';
                console.log('The address values are invalid');
            }
            console.error('Form contains errors. Please fix them before submitting.');
        }
    }

    async processPayment() {
        if (this.selectedPaymentType === 'po' && this.poNumber) { // Purchase Order flow
            localStorage.setItem('poNumber', JSON.stringify(this.poNumber));
        } else if (this.selectedPaymentType === 'wire') { // Wire ACH flow
            const wiredetails = {
                checkAccountNumber: this.checkAccountNumber,
                routingNumber: this.routingNumber,
                accountType: this.accountType
            };

            try {
                const encryptedData = await encryptString({plainText: JSON.stringify(wiredetails)});
                // console.log('encrypted wireDetails', encryptedData);
                localStorage.setItem('wireDetails', encryptedData);
            } catch (error) {
                console.log('encryption error : ', error);
            }
        } else if (this.selectedPaymentType === 'card') { // Credit card flow
            const paymentToken = this.transientToken;
            const paymentInfo = {
                maskedCardNumber: '**** **** **** ****',
                cardType: 'type',
                expYear: this.expYear,
                expMonth: this.expMonth,
                paymentToken: paymentToken
            };
            localStorage.setItem('ccPaymentInfo', JSON.stringify(paymentInfo));
            this.showToast('Success', 'Payment processed successfully.', 'success');
        }
    }

    navigateToReviewPage() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/CIQuestEStore/review-details?cartId=${this.cartId}&isWire=${this.selectedPaymentType === 'wire'}`
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

    //-----------Cybersource----------

    // retrieve the cart summary information
    @wire(CartSummaryAdapter, {})
    cartSummary({error, data}){
        if (!this.isInSitePreview()){
            if (data) {
                this.cartId = data.cartId;
            } else if (error) {
                console.log('##cybersourcePayment checkoutInfo Error: ' + error);
            }
        }
    }

    async connectedCallback() {
        this.currentCommunityId = communityId;
        // populate this.yearOptions
        const currentYear = new Date().getFullYear();
        this.expYear = ''+currentYear;
        for (let i = 0; i < 15; i++) {
            const yearString = '' + (currentYear + i);
            this.yearOptions.push({ label: yearString, value: yearString });
        }
        this.accountTypeOptions = [
            { label: 'Select Account Type', value: '' },
            { label: 'Personal checking account', value: 'C' },
            { label: 'Savings account', value: 'S' },
            { label: 'Corporate checking account', value: 'X' }
        ];

        getStateOptions()
        .then(res => {
            this.stateOptions = (res || []).map(state => {return { label: state.State_Name__c, value: (state.Abbreviation__c + ':' + state.Country_Code__r.Alpha2Code__c)};});
        })
        .catch(err => {
            console.log(err);
        });

        await loadScript(this, microformScript)
        .then(() => {
            this.setupMicroform();
        }).catch(err => {
            console.log('loadScript error: ', err);
        });
    }

    // this is not used in the cart flow. it is only for debugging and troubleshooting purpose.
    deleteCartObject() {
        deleteCart({ cartId: this.cartId})
        .then(res => {
            console.log('Cart deleted successfully. Response: ', res);
        });
    }

    // create the Cybersource form and add the fields
    setupMicroform() {
        generateKey().then(res => {
            const flex = new Flex(res);
            const microform = flex.microform({'iframe': {'line-height': '1.875rem'} });
            const number = microform.createField('number', {placeholder:"*Card Number"});
            const securityCode = microform.createField('securityCode', { maxLength: 4, placeholder:"*CVV"});

            const numberElement = this.template.querySelector('.number-container');
            const securityCodeElement = this.template.querySelector('.securityCode-container');
            number.load(numberElement);
            securityCode.load(securityCodeElement);
            this.microform = microform;
        })
        .catch(err => {
            console.log('setupMicroform - generateKey - error: ', err);
        });
    }

    handleStateChange(event) {
        this.state = event.target.value;
    }

    handleStateBlur(event) {
        this.state = event.target.value.trim().toLocaleUpperCase();
        if (this.isCCAddressValid()) {
            this.errorMessages = this.errorMessages.filter(m => m != ADDRESS_ERROR);
            console.log('handleStateBlur-isCCAddressValid', this.errorMessages);
        }
    }

    isCCAddressValid() {
        let isValid = this.billingStreet.length > 0 && this.billingCity.length > 0 && this.state.length > 2 && this.billingPostalCode.length > 4;

        return isValid;
    }

    handleExpMonthChange(event) {
        this.expMonth = event.target.value;
        const currentDate = new Date();
        if (!(currentDate.getFullYear() > +this.expYear || (currentDate.getFullYear() == +this.expYear && currentDate.getMonth() >= +this.expMonth))) {
            this.errorMessages = this.errorMessages.filter(m => m != CARD_EXPIRED_ERROR);
        }
    }

    handleExpYearChange(event) {
        this.expYear = event.target.value;
        const currentDate = new Date();
        if (!(currentDate.getFullYear() > +this.expYear || (currentDate.getFullYear() == +this.expYear && currentDate.getMonth() >= +this.expMonth))) {
            this.errorMessages = this.errorMessages.filter(m => m != CARD_EXPIRED_ERROR);
        }
    }


    async createTransientToken() {
        this.errorMessages = [];
        const currentDate = new Date();

        if (this.billingFirstName.length < 1 || this.billingLastName.length < 1) {
            this.errorMessages.push(NAME_ERROR);
        }

        if (currentDate.getFullYear() > +this.expYear || (currentDate.getFullYear() == +this.expYear && currentDate.getMonth() >= +this.expMonth)) {
            this.errorMessages.push(CARD_EXPIRED_ERROR);
        }

        const options = {
            expirationMonth: this.expMonth,
            expirationYear: this.expYear
        };
        return new Promise((resolve, reject) => this.microform.createToken(options, (err, token) => {
            if (err) {
                if (err.details && err.details.length > 0) {
                    for (let i=0; i < err.details.length; i++) {
                        if (err.details[i].message == 'Validation error' && err.details[i].location == 'number') {
                            this.errorMessages.push(CARD_INVALID_ERROR);
                        } else if (err.details[i].message == 'Validation error' && err.details[i].location == 'securityCode') {
                            this.errorMessages.push(CVV_INVALID_ERROR);
                        } else if (err.details[i].reason == 'RESOURCE_QUOTA_EXCEEDED' || err.details[i].reason == 'CREATE_TOKEN_CAPTURE_CONTEXT_USED_TOO_MANY_TIMES') {
                            this.errorMessages.push('You have made too many requests. Please try again after refreshing the page');
                        } else {
                            this.errorMessages.push(err.details[i].message);
                        }
                    }
                } else {
                    this.errorMessages.push(err.message);
                }
                console.log('Error:', this.errorMessages);
                this.createTokenReturned = true;
            }
            console.log('Token:', token);
            this.transientToken = token;
            resolve(true);
        }));
    }

    get showCardErrors() {
        return this.errorMessages.length > 0;
    }

    /**
     * Determines if you are in the experience builder currently
     */
    isInSitePreview() {
        let url = document.URL;
        return (
            url.indexOf('sitepreview') > 0 ||
            url.indexOf('livepreview') > 0 ||
            url.indexOf('live-preview') > 0 ||
            url.indexOf('live.') > 0 ||
            url.indexOf('.builder.') > 0
        );
    }

    /**
     * The current checkout mode for this component
     *
     * @type {CheckoutMode}
     */
    get checkoutMode() {

        return this._checkoutMode;
    }

    //---------cybersource code end------------------
}