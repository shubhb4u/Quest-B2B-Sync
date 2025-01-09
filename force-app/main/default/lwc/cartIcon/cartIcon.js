import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CartSummaryAdapter } from 'commerce/cartApi';
import getCartItemCount from '@salesforce/apex/CartUtilsController.getCartItemCount';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import { subscribe, MessageContext } from 'lightning/messageService';
import MY_MESSAGE_CHANNEL from '@salesforce/messageChannel/CustomChannel__c';
export default class CartIcon extends NavigationMixin(LightningElement) {
    @api cartPageURL = '/cart';
    accountId;
    cartId;
    @wire(MessageContext)
    messageContext;
    subscription = null;
    @track itemCount = 0;

    // Getter to format the item count
    get formattedItemCount() {
        return this.itemCount > 999 ? '999+' : this.itemCount;
    }

    // Check if there are any items in the cart
    get hasItems() {
        return this.itemCount > 0;
    }

    handleCustomAction(message) {
        if (message.action === 'updateCartCount') {
            this.myFunction(message.payload);
        }
    }

    myFunction(data) {
        console.log('Function triggered with data:', data);
        this.getCartItemTotalCount();
    }

    getCartItemTotalCount() {
        getCartItemCount({ effectiveAccountId: this.accountId, activeCartOrId: this.cartId })
            .then(data => {
                this.itemCount = data;
                console.log('itemCount: ' + this.itemCount);
            })
            .catch(error => {
                console.log('cart icon: itemCount error: ' + error);
            });
    }

    @wire(getRecord, { recordId: USER_ID, fields: [ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.accountId = getFieldValue(data, ACCOUNT_ID);
            console.log('accountId: ' + this.accountId);
        }
    }

    @wire(CartSummaryAdapter)
    setCartSummary({ data, error }) {
        if (data) {
            this.cartId = data.cartId;
            console.log('cartId: ' + this.cartId);
            this.getCartItemTotalCount();
        } else if (error) {
            console.error(error);
        }
    }

    connectedCallback() {
        // Get the URL of the Cart page
        this.cartPageURL = this.cartPageURL;
        // triggered from add to cart event
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                MY_MESSAGE_CHANNEL,
                (message) => this.handleCustomAction(message)
            );
        }
    }

    navigateToCart() {
        // Navigate to the cart page
        // window.location.href = this.cartPageURL; // Update URL if needed
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: this.cartPageURL
            }
        });
    }
}