import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import microformScript from '@salesforce/resourceUrl/CybersourceMicroform';
import communityId from '@salesforce/community/Id';
import { getSessionContext } from 'commerce/contextApi';
import { refreshApex } from '@salesforce/apex';
import { useCheckoutComponent, CheckoutInformationAdapter, simplePurchaseOrderPayment, postAuthorizePayment, placeOrder } from 'commerce/checkoutApi';
import { CartSummaryAdapter, refreshCartSummary } from 'commerce/cartApi';
import updatePaymentInstrument from '@salesforce/apex/CybersourceController.updatePaymentInstrument';
import preAuthorizeAlternatePayment from '@salesforce/apex/AlternativePaymentController.preAuthorize';
import getCreditLimit from '@salesforce/apex/AlternativePaymentController.getCreditLimit';
import updateCreditLimit from '@salesforce/apex/AlternativePaymentController.updateCreditLimit';



// Error Constants
const NAME_ERROR = 'Name fields are required';
const ADDRESS_ERROR = 'Address fields are required';
const CARD_EXPIRED_ERROR = 'Credit Card is expired';
const CARD_INVALID_ERROR = 'Invalid Card Number';
const CVV_INVALID_ERROR = 'Invalid Security Code';

const CheckoutStage = {
    CHECK_VALIDITY_UPDATE: 'CHECK_VALIDITY_UPDATE',
    REPORT_VALIDITY_SAVE: 'REPORT_VALIDITY_SAVE',
    BEFORE_PAYMENT: 'BEFORE_PAYMENT',
    PAYMENT: 'PAYMENT',
    BEFORE_PLACE_ORDER: 'BEFORE_PLACE_ORDER',
    PLACE_ORDER: 'PLACE_ORDER'
};


export default class CustomPO extends NavigationMixin(useCheckoutComponent(LightningElement)) {

    isLoading = false;
    firstLoad = false;

    @track checkoutId;
    @track shippingAddress;
    @track showError = false;
    @track error;

    @api headerLabel;
    @api inputLabel;
    @api placeholderLabel;
    @api hideHeading = false;
    poNumber;
    GatewayToken;
    postAuthCalls;
    authPaymentToken;
    effectiveAccountId;
    availableCreditLimit;
    disablePlaceOrderButton = false;
    generatedPONumber;

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
                return Promise.resolve(this.paymentProcess());
            default:
                return Promise.resolve(true);
        }
    }


    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ error, data }) {
        if (!this.isInSitePreview()) {
            console.log('PO checkoutInfo');

            if (data) {
                this.checkoutId = data.checkoutId;
                this.cartId = data.cartSummary?.cartId;
                this.deliveryAddress = data.deliveryGroups?.items[0].deliveryAddress;
                this.grandTotalAmount = parseFloat(data.cartSummary?.grandTotalAmount || 0); // Ensure numeric value
                console.log('PO checkoutInfo:', JSON.stringify(data));

                this.shippingAddress = data.deliveryGroups?.items[0].deliveryAddress;

                // Now that we have grandTotalAmount, check credit limit if not already checked
                if (!this.availableCreditLimit) {
                    this.getAccountCreditLimit();
                } else {
                    this.evaluatePlaceOrderButton();
                }
            } else if (error) {
                console.log('##cybersourcePayment checkoutInfo Error:', error);
            }
        }
    }

    async getAccountCreditLimit() {
        try {
            const response = await getCreditLimit({ accountId: this.effectiveAccountId });
            console.log('response-->>', JSON.stringify(response));
            this.availableCreditLimit = parseFloat(response.Credit_limit__c || 0);

            // Ensure grandTotalAmount is available before evaluating the button
            if (this.grandTotalAmount !== undefined) {
                this.evaluatePlaceOrderButton();
            }
        } catch (error) {
            console.log('Error fetching credit limit-->>', error);
        }
    }

    evaluatePlaceOrderButton() {
        if (this.availableCreditLimit !== undefined && this.grandTotalAmount !== undefined) {
            this.disablePlaceOrderButton = this.availableCreditLimit < this.grandTotalAmount;
            console.log('disablePlaceOrderButton-->>', this.disablePlaceOrderButton);
            if (!this.disablePlaceOrderButton) {
                this.generatedPONumber = this.generateRandomPONumber();
            } else {
                this.generatedPONumber = '';
            }
        }
    }

    async connectedCallback() {
        if (!sessionStorage.getItem('pageReloaded')) {
            sessionStorage.setItem('pageReloaded', 'true');
            setTimeout(() => location.reload(), 2000);
        }
        this.currentCommunityId = communityId;

        try {
            const ctx = await getSessionContext();
            this.effectiveAccountId = ctx.effectiveAccountId;

            if (this.effectiveAccountId) {
                await this.getAccountCreditLimit();

                // Ensure grandTotalAmount is set before evaluating the button
                if (this.grandTotalAmount !== undefined) {
                    this.evaluatePlaceOrderButton();
                }
            }
        } catch (err) {
            console.error('Error getting Session Context:', err);
        }
    }


    generateRandomPONumber() {
        return `PO-${Math.floor(10000 + Math.random() * 90000)}`;
    }


    @api
    reportValidity() {
        console.log('simplePurchaseOrder: in reportValidity');
        const purchaseOrderInput = this.generatedPONumber;
        let isValid = false;

        if (purchaseOrderInput) {
            console.log('simplePurchaseOrder purchaseOrderInput: ' + JSON.stringify(purchaseOrderInput));
            isValid = true;
            this.showError = false;
        } else {
            console.log('simplePurchaseOrder purchaseOrderInput not found: ' + JSON.stringify(purchaseOrderInput));
            this.showError = true;
            this.error = "Please enter a purchase order number.";
        }
        return isValid;
    }

    @api
    async paymentProcess() {
        console.log('simplePurchaseOrder: in checkout save');

        if (!this.reportValidity()) {
            throw new Error('Required data is missing');
        }

        const createAltPayment = await this.preAuthorizePayment();

    }

    async preAuthorizePayment() {
        // console.log('authorizePayment called-->> ');
        await preAuthorizeAlternatePayment({
            country: this.deliveryAddress.country,
            postalCode: this.deliveryAddress.postalCode,
            region: this.deliveryAddress.region,
            city: this.deliveryAddress.city,
            street: this.deliveryAddress.street,
            cartId: this.cartId,
            paymentMethod: 'Purchase Order Cybersource'
        }).then(response => {

            // Ensure the response is an object
            if (typeof response === 'string') {
                response = JSON.parse(response);
                // console.log('Parsed response:', response);
            }

            // Assign response directly to this.alternatePaymentMet
            this.alternatePaymentMet = response;
            console.log('this.alternatePaymentMet:-->> ', this.alternatePaymentMet);

            // Extract GatewayToken
            this.authPaymentToken = response.GatewayToken;
            // this.getAlterPaymentMethod();

            this.completePayment();

            return this.authPaymentToken;
        }).catch(error => {
            return error;
        });
    }


    @api
    async completePayment() {
        let address = this.shippingAddress;
        const purchaseOrderInputValue = this.generatedPONumber;
        const deliveryAddress = {
            city: "newyork",
            companyName: "",
            country: "US",
            firstName: "Jagadeesh",
            lastName: "b",
            name: "Jagadeesh b",
            postalCode: "75105",
            region: "TX",
            street: "10 new usa"
        };

        console.log('Inside completePayment');
        let po = await simplePurchaseOrderPayment(this.checkoutId, purchaseOrderInputValue, deliveryAddress);
        console.log('po authorized -->> ' + JSON.stringify(po));
        setTimeout(() => {
            this.callPostAuth(this.authPaymentToken, deliveryAddress, 'Purchase Order');
        }, 3000);
        return po;
    }

    async callPostAuth(paymentId, billingAddress, paymentMethod) {
        try {
            const paymentResult = await postAuthorizePayment(this.checkoutId, paymentId, billingAddress, { 'paymentMethod': paymentMethod });
            console.log('postAuthorizePayment paymentResult', paymentResult);


            if (paymentResult.salesforceResultCode == 'Success') {
                this.postAuthCalls = this.postAuthCalls + 1;
                this.updatePaymentInformation();

            } else {
                if (this.postAuthCalls == 1) {
                    this.postAuthCalls = this.postAuthCalls + 1;
                    setTimeout(() => {
                        console.log('Attempting second PostAuthorization call');
                        this.callPostAuth(paymentId, billingAddress, paymentMethod);
                    }, 2000);
                    this.errorMessages.push('Note :  We are resubmitting the payment information please wait for some time .');
                } else {
                    this.errorMessages = [];
                    this.errorMessages.push('Please go back to the cart page and resubmit the billing data.');
                }

                return this.errorMessages;
            }



        } catch (error) {
            console.log('postAuthorizePayment- exception', error);
            // console.log("this.postAuthCalls", this.postAuthCalls);
            if (this.postAuthCalls == 1) {
                this.postAuthCalls = this.postAuthCalls + 1;
                setTimeout(() => {
                    console.log('Attempting second PostAuthorization call');
                    this.callPostAuth(paymentId, billingAddress, paymentMethod);
                }, 2000);
                this.errorMessages.push('Note :  We are resubmitting the payment information please wait for some time .');
            } else {
                this.errorMessages = [];
                this.errorMessages.push('Please go back to the cart page and resubmit the billing data.');
            }
            return this.errorMessages;
        }
    }

    

    @api
    updatePaymentInformation() {
        console.log('updatePaymentInformation entry');
        updatePaymentInstrument({ cartId: this.cartId, gatewayToken: this.authPaymentToken }).then((data) => {
            console.log('Payment instrument updated successfully.', data);
            if (data) {
                this.callPlaceOrderAPI();
            }

        }).catch(error => {
            console.log('reviewCartDetails- updatePaymentInstrument', JSON.stringify(error));
        });
    }

    async callPlaceOrderAPI() {
        let orderResponse = await placeOrder();

        // console.log("Order placed successfully:-->>>", JSON.stringify(orderResponse));
        console.log("Order placed successfully: orderResponse.orderReferenceNumber:-->>>", orderResponse.orderReferenceNumber);

        if (orderResponse.orderReferenceNumber) {

            //Update credit limit of the account if order placed by PO - 
            this.updateCreditLimitAccount();

            refreshCartSummary();
            this.navigateToOrder(orderResponse.orderReferenceNumber);
            console.log('Order With AltPayment orderReferenceNumber: ' + orderResponse.orderReferenceNumber);
        } else {
            throw new Error("Required orderReferenceNumber is missing");
        }
    }


    async updateCreditLimitAccount() {
        try {
            const response = await updateCreditLimit({ accountId: this.effectiveAccountId, total: this.grandTotalAmount });
            console.log('response-->>', JSON.stringify(response));

        } catch (error) {
            console.log('Error fetching credit limit-->>', error);
        }
    }

    isInSitePreview() {
        let url = document.URL;

        return (
            url.indexOf("sitepreview") > 0 ||
            url.indexOf("livepreview") > 0 ||
            url.indexOf("live-preview") > 0 ||
            url.indexOf("live.") > 0 ||
            url.indexOf(".builder.") > 0
        );
    }

    navigateToOrder(orderNumber) {
        this[NavigationMixin.Navigate]({
            type: "comm__namedPage",
            attributes: {
                name: "Order"
            },
            state: {
                orderNumber: orderNumber
            }
        });
    }

}