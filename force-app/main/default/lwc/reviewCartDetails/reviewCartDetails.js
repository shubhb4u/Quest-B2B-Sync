import { LightningElement, wire, track, api } from 'lwc';
import fetchCartDetails from '@salesforce/apex/CartDetailsController.getCartDetails';
import updatePaymentInstrument from '@salesforce/apex/CybersourceController.updatePaymentInstrument';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import CONTACT_NAME from '@salesforce/schema/Contact.Name';
import WebstoreId from '@salesforce/label/c.WebstoreId';
import { CheckoutInformationAdapter, simplePurchaseOrderPayment, placeOrder, postAuthorizePayment, authorizePayment } from "commerce/checkoutApi";
import preAuthorizeAlternatePayment from '@salesforce/apex/AlternativePaymentController.preAuthorize';
import { refreshCartSummary, CartSummaryAdapter } from "commerce/cartApi";
import communityId from "@salesforce/community/Id";
import authorizeCard from '@salesforce/apex/CybersourceController.authorizeCard';
import authorizeWire from '@salesforce/apex/CybersourceController.authorizeWire';
import decryptString from '@salesforce/apex/EncryptionUtil.decryptString';

export default class ReviewCartDetails extends NavigationMixin(LightningElement) {
    @track cartId;
    @track cartDetails;
    @track paymentDetails = {};
    @track error;
    @track storeId;
    @track isWire
    @track errorMessages = [];
    currentCommunityId = '';
    authPaymentToken;
    accountId;
    contactId;
    contactName;
    billingFirstName = '';
    billingLastName = '';
    postAuthCalls;
    @track termsAccepted = false;
    @track isOrderButtonDisabled = false;
    authTokenPO;
    @track receivedPoNumber = '';
    storedPONumber;
    orderReferenceNumber;
    isPoOrder = false;
    @api ordSumId;

    connectedCallback() {

        this.currentCommunityId = communityId;
        this.storeId = WebstoreId;
        const queryParams = new URLSearchParams(window.location.search);
        this.cartId = queryParams.get('cartId');

        if (!sessionStorage.getItem("pageReloaded")) {
            sessionStorage.setItem("pageReloaded", "true");
    
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }

        this.isWirePayment = (localStorage.getItem('wireDetails') != null && localStorage.getItem('wireDetails') != '');
        this.isCCPayment = (localStorage.getItem('ccPaymentInfo') != null && localStorage.getItem('ccPaymentInfo') != '');
        this.isPoOrder = (localStorage.getItem('poNumber') != null && localStorage.getItem('poNumber') != '');

        console.log('IsWirePayment in Connected callback after 2 sec delay-->> '+ this.isWirePayment);

        if (this.cartId) {
            this.fetchCartDetailsFromApex();
        } else {
            console.error('No cartId found in the URL.');
        }

        this.retrievePaymentDetails();
    }

    disconnectedCallback() {
        sessionStorage.removeItem("pageReloaded");
        localStorage.removeItem('poNumber');
        localStorage.removeItem('ccPaymentInfo');
        localStorage.removeItem('wireDetails');
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
            this.billingFirstName = this.contactName.split(' ')[0];
            this.billingLastName = this.contactName.split(' ')[1];
        }
    }

    fetchCartDetailsFromApex() {
        fetchCartDetails({ cartId: this.cartId })
            .then((result) => {
                this.cartDetails = result;
                this.error = undefined; 
            })
            .catch((error) => {
                this.error = error;
                this.cartDetails = undefined;
                console.error('Error fetching cart details:', error);
            });
    }

    retrievePaymentDetails() {
        const storedPaymentInfo = localStorage.getItem('ccPaymentInfo');
        if (storedPaymentInfo) {
            const paymentInfo = JSON.parse(storedPaymentInfo);
            const maskedCardNumber = paymentInfo.maskedCardNumber;
            this.paymentDetails = {
                cardLastFour: maskedCardNumber.slice(-4),
                maskedCard: maskedCardNumber,
                expiryDate: paymentInfo.expiryDate,
                cardType: paymentInfo.cardType,
                cvv: paymentInfo.cvv
            };
        } else {
            console.warn('No payment details found in local storage.');
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
    }

    handleCompleteOrder() {
        this.errorMessages = [];
        this.postAuthCalls = 1;

        this.isWirePayment = (localStorage.getItem('wireDetails') != null && localStorage.getItem('wireDetails') != '');

        console.log('IsWirePayment in Connected callback after 2 sec delay-->> '+ this.isWirePayment);

        if (!this.termsAccepted) {
            console.log('Please accept the Terms & Conditions.');
            this.errorMessages.push('Please accept the Terms & Conditions.');
            return null;
        }
        if (!this.checkoutId || !this.orderReferenceNumber) {
            this.errorMessages.push("Please review your cart items and resubmit the billing data on the cart page.");
            if (!this.checkoutId) {
                console.error('Checkout ID is null');
            }
            if (!this.orderReferenceNumber) {
                console.error('orderReferenceNumber is null')
            }
            return null;
        }

        if (this.isWirePayment) {
            console.log('Wire action fired in handle complete -->>> '+ this.isWirePayment);
            this.authorizePaymentWire();
        }
        else if (this.isPoOrder) {
            // For Purchase Order payment
            console.log('PO action fired !!!');

            if (!this.reportValidity()) {
                throw new Error('Required data is missing');
            }

            this.preAuthorizePayment()
                .then(() => {
                    console.log('Payment authorization successful.');
                    localStorage.removeItem('poNumber'); 
                })
                .catch((error) => {
                    console.error('Error during PO payment authorization:', error);
                    localStorage.removeItem('poNumber');
                });
        } else if (this.isCCPayment) {
            // For Credit Card payment
            console.log('Credit card action fired !!!');

            const paymentInfo = localStorage.getItem('ccPaymentInfo')
                ? JSON.parse(localStorage.getItem('ccPaymentInfo'))
                : {};

            const params = {
                cartId: this.cartId,
                accountId: this.accountId,
                storeId: this.storeId,
                paymentDetails: {
                    expiryMonth: paymentInfo.expMonth,
                    expiryYear: paymentInfo.expYear,
                    gatewayToken: paymentInfo.paymentToken
                },
                contactName: this.contactName
            };
            const response = Promise.resolve(this.authPayment(params)).then((data) => {
                console.log('CC Payment authorization successful.');
            });
        }
    }

    //-------------------------------------------- PO  ========================================================================================c/b2bRecommendations

    @wire(CartSummaryAdapter, {})
    cartInfo({ error, data }) {
        if (data) {
            this.cartSummary = data;
            this.grandTotalAmount = data.grandTotalAmount;

        } else if (error) {
            console.error("Error fetching cart information: ", JSON.stringify(error));
        }
    }

    @wire(CheckoutInformationAdapter, {})
    checkoutInfo({ error, data }) {
        console.log('CheckoutInformationAdapter data: ', data);
        if (data) {
            // console.log("Data received from cehckout Information adapter -->> : ", JSON.stringify(data));
            this.checkoutId = data.checkoutId;
            this.shippingAddress = data?.deliveryGroups?.items?.[0]?.deliveryAddress;
            this.orderReferenceNumber = data.orderReferenceNumber;

        } else if (error) {
            console.error("Error fetching checkout information: ", JSON.stringify(error));
        }
    }


    @api
    async reportValidity() {

        try {
            this.storedPONumber = localStorage.getItem('poNumber');
            const decryptedData = await decryptString({ encryptedText: JSON.stringify(this.storedPONumber) });
            this.storedPONumber = JSON.parse(decryptedData);
            console.log('stored PO in reportvalidity -->> '+ this.storedPONumber );

        } catch (error) {
            this.errorMessages = [{
                message: 'Something went wrong. Please try again.'
            }];
            console.log('decryption error : ', error);
            return;
        }

        const purchaseOrderInput = this.storedPONumber;
        let isValid = false;

        if (purchaseOrderInput) {
            isValid = true;
            this.showError = false;
        } else {
            console.log('simplePurchaseOrder purchaseOrderInput not found: ' + JSON.stringify(purchaseOrderInput));
            this.showError = true;
            this.error = "Please enter a purchase order number.";
        }
        return isValid;
    }

    /**
     * Authorize payment with PO
     * @returns Bool - successed or fail on update
     */
    async preAuthorizePayment() {

        await preAuthorizeAlternatePayment({
            country: this.shippingAddress.country,
            postalCode: this.shippingAddress.postalCode,
            region: this.shippingAddress.region,
            city: this.shippingAddress.city,
            street: this.shippingAddress.street,
            cartId: this.cartId,
            paymentMethod: 'Purchase Order'
        }).then(response => {
            if (typeof response === 'string') {
                response = JSON.parse(response);
            }
            this.authPaymentToken = response.GatewayToken;
            console.log('response from preAuthorize -->> ' + JSON.stringify(response));
            this.completePayment();
            return this.authPaymentToken;

        }).catch(error => {
            return error;
        });
    }

    @api
    async completePayment() {
        setTimeout(() => {
            this.callPostAuth(this.authPaymentToken, this.shippingAddress, 'Purchase Order');
        }, 2000);
    }


    //-------------------------------------Credit card payment -----------------------------------

    async authPayment(params) {
        const billingAddress = {
            "name": this.contactName,
            "street": this.cartDetails.billingAddress.BillingStreet,
            "city": this.cartDetails.billingAddress.BillingCity,
            "region": this.cartDetails.billingAddress.BillingState,
            "country": this.cartDetails.billingAddress.BillingCountry,
            "postalCode": this.cartDetails.billingAddress.BillingPostalCode
        };
        const paymentData = {
            token: params.paymentDetails.gatewayToken,
            createToken: true,
            accountId: params.accountId,
            currencyISOCode: 'USD',
            addressString: JSON.stringify(billingAddress),
            expirationMonth: params.paymentDetails.expiryMonth,
            expirationYear: params.paymentDetails.expiryYear,
            firstName: this.billingFirstName,
            lastName: this.billingLastName,
            communityId: this.currentCommunityId,
            amount: this.grandTotalAmount
        };
        let paymentId;

        try {
            authorizeCard(
                { paymentsData: paymentData }
            ).then((authorizeResponse, error) => {
                console.log('Error authorize', error);

                if (!authorizeResponse || authorizeResponse == null || (authorizeResponse && authorizeResponse.error)) {
                    this.errorMessages.push('Error : Unknown error processing card. Please go back to the cart page and resubmit the billing data.');
                    return this.errorMessages;
                }

                let paymentId = authorizeResponse.id;
                this.authPaymentToken = paymentId;
                setTimeout(() => {
                    this.callPostAuth(paymentId, billingAddress, 'CreditCard');
                }, 3000);
            }).catch((error) => {
                var authErrorMessage = 'Unknown error processing your card. Please go back to the cart page and resubmit the billing data.';
                console.log('Exception during authorizing the CC payment method', error);

                if (error.body && error.body.message && error.body.message.indexOf('INVALID_REQUEST') > 0) {
                    var errorAuthMsgObject = JSON.parse(error.body.message);
                    if (errorAuthMsgObject && errorAuthMsgObject.status == 'INVALID_REQUEST' && errorAuthMsgObject.details && errorAuthMsgObject.details[0] && errorAuthMsgObject.details[0].field == "tokenInformation.jti") {
                        authErrorMessage = 'Payment token/session is expired, please go back to the cart page and resubmit the payment details.';
                    }
                }
                this.errorMessages.push(authErrorMessage);
                return this.errorMessages;
            });
        } catch (error) {
            console.log('Auth error', error);
            this.errorMessages.push('Error : Unknown error processing card. Please go back to the cart page and resubmit the billing data.');
            return this.errorMessages;
        }

        return {
            responseCode: paymentId
        };
    }

    //------------------------------------ Wire payment --------------------------------------------

    async authorizePaymentWire() {
        var wireDetails = null;
        // const secretKey = 'your-secret-key';
        try {
            const wireDetailsencrypted = localStorage.getItem('wireDetails');
            const decryptedData = await decryptString({ encryptedText: wireDetailsencrypted });
            console.log('decryptedData-->>>>>> ', decryptedData);
            wireDetails = JSON.parse(decryptedData);
        } catch (error) {
            this.errorMessages = [{
                message: 'Something went wrong. Please try again.'
            }];
            console.log('decryption error : ', error);
            return;
        }

        const billingAddress = {
            "name": this.contactName,
            "street": this.cartDetails.billingAddress.BillingStreet,
            "city": this.cartDetails.billingAddress.BillingCity,
            "region": this.cartDetails.billingAddress.BillingState,
            "country": this.cartDetails.billingAddress.BillingCountry,
            "postalCode": this.cartDetails.billingAddress.BillingPostalCode
        };
        const paymentData = {
            checkAccountNumber: wireDetails.checkAccountNumber,
            routingNumber: wireDetails.routingNumber,
            accountType: wireDetails.accountType,
            currencyISOCode: 'USD',
            addressString: JSON.stringify(billingAddress),
            firstName: this.billingFirstName,
            lastName: this.billingLastName,
            communityId: this.currentCommunityId,
            amount: this.grandTotalAmount
        };
        // authorize wire payment
        authorizeWire(
            { paymentsData: paymentData }
        ).then((authorizeResponse, error) => {
            this.authPaymentToken = authorizeResponse.id;
            // console.log('Wire gatewayToken: ', this.authPaymentToken);
            setTimeout(() => {
                this.callPostAuth(this.authPaymentToken, billingAddress, 'Wire');
            }, 3000);
        }).catch((error) => {
            console.log('Wire authorization exception', error);
        });
    }

    get showCardErrors() {
        return this.errorMessages.length > 0;
    }

    async callPostAuth(paymentId, billingAddress, paymentMethod) {
        try {
            const paymentResult = await postAuthorizePayment(this.checkoutId, paymentId, billingAddress, { 'paymentMethod': paymentMethod });
            console.log('postAuthorizePayment paymentResult-->>> ', paymentResult);

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

    updatePaymentInformation() {
        console.log('poNumber in updatePaymentinfo -->> '+ this.storedPONumber);
        console.log('poNumber before removal:-->>>> ', localStorage.getItem('poNumber'));

        updatePaymentInstrument({ cartId: this.cartId, gatewayToken: this.authPaymentToken, poNumber: this.storedPONumber})
            .then((data) => {
                console.log('Payment instrument updated successfully-->> ', data);
                if (data) {
                    this.callPlaceOrderAPI();
                }
            })
            .catch(error => {
                console.log('reviewCartDetails- updatePaymentInstrument', JSON.stringify(error));
            });
    }

    async callPlaceOrderAPI() {
        let orderResponse = await placeOrder();
        console.log("Order placed successfully:-->>>", JSON.stringify(orderResponse));
        // console.log("Order placed successfully: orderResponse.orderReferenceNumber:-->>>", orderResponse.orderReferenceNumber);

        if (orderResponse.orderReferenceNumber) {
            localStorage.removeItem("poNumber");
            localStorage.removeItem('ccPaymentInfo');
            localStorage.removeItem('wireDetails');
            refreshCartSummary();
            this.navigateToOrderConfirmationWithOrderReff(orderResponse.orderReferenceNumber);
            // console.log('Order With AltPayment orderReferenceNumber: ' + orderResponse.orderReferenceNumber);
        } else {
            throw new Error("Required orderReferenceNumber is missing");
        }
    }

    // Placeholder for refreshing cart summary
    refreshCartSummary() {
        refreshCartSummary();
    }

    navigateToOrderConfirmationWithOrderReff(orderReffNo) {
        // Navigate to the order confirmation page
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/order?orderNumber=${orderReffNo}`
            }
        });
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

}