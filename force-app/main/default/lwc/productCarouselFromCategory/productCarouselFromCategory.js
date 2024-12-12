import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import addWishListItem from '@salesforce/apex/AddWishList.addWishListItem';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import WebstoreId from '@salesforce/label/c.WebstoreId';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';
import getProductsFromCategory from '@salesforce/apex/ProductRecordsFromCategory.getProductsFromCategory';
import userId from '@salesforce/user/Id';
import heartRed from '@salesforce/resourceUrl/heartRed';
import heartWhite from '@salesforce/resourceUrl/heartWhite';
import getProfileName from '@salesforce/apex/Product2Controller.getProfileName';

export default class ProductCarouselFromCategory extends NavigationMixin(LightningElement) {
    @track products;
    @track displayedProducts = [];
    @track carouselIndicators = [];
    @track currentPage = 0;
    @track itemsPerPage;
    @api categoryID;
    @api categoryName;
    @api pricebookID;

    heartRedIcon = heartRed + '#heartRed';
    heartWhiteIcon = heartWhite + '#heartWhite';
    @track isModalOpen = false;
    @track modalTitle = '';
    @track modalMessage = '';

    categoryURL;
    siteBaseUrl;
    accountId;
    storeId;

    @track currentUser = {
        id: userId,
        profileName: null
    };

    @track isGuestUser = false;

      @wire(getProfileName)
    wiredProfileName({ data, error }) {
        if (data) {
            this.currentUser.profileName = data;
            console.log('Profile Name:', data);
            this.checkIsGuestUser();
        } else if (error) {
            console.error('Error fetching profile name:', error);
        }
    }

    checkIsGuestUser() {
        this.isGuestUser = this.currentUser.profileName === 'CI_Quest EStore Profile';
        console.log('Is Guest User:', this.isGuestUser);
    }

    connectedCallback() {
        this.checkIsGuestUser();
        this.storeId = WebstoreId;
        console.log('store Id ==>', this.storeId);
        this.fetchProductsByCategory();
        this.setItemsPerPage();
        this.handleResize = this.debounce(() => this.reinitializeCarousel(), 200);
        window.addEventListener('resize', this.handleResize);
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.setItemsPerPage.bind(this));
    }

    setItemsPerPage() {
        const width = window.innerWidth;

        if (width <= 767) {
            this.itemsPerPage = 1; // Mobile
        } else if (width <= 1024) {
            this.itemsPerPage = 3; // Tablet
        } else {
            this.itemsPerPage = 4; // Desktop
        }
    }

    reinitializeCarousel() {
        this.setItemsPerPage();
        if (this.products?.length) {
            this.currentPage = 0;
            this.updateDisplayedProducts();
            this.updateIndicators();
        }
    }

    updateIndicators() {
        const totalProducts = this.products.length;
        const totalPages = Math.ceil(totalProducts / this.itemsPerPage);

        this.carouselIndicators = Array.from({ length: totalPages }, (_, i) => ({
            active: i === this.currentPage
        }));
    }

    @wire(getSiteBaseUrl)
    wiredSiteBaseUrl({ error, data }) {
        if (data) {
            this.siteBaseUrl = data;
            let baseUrl = data.replace(/vforcesite/g, '').replace(/sfsites\/c\//g, '');

            this.categoryURL = `${baseUrl}/category/${this.categoryID}`;
            console.log('Category URL:', this.categoryURL);
        } else if (error) {
            console.error('Error fetching site base URL:', error);
        }
    }

    @wire(getRecord, { recordId: USER_ID, fields: [ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.accountId = getFieldValue(data, ACCOUNT_ID);
            console.log(this.accountId);
        } else if (error) {
            console.error('Error fetching user data:', error);
        }
    }

    fetchProductsByCategory() {
        getProductsFromCategory({ catId: this.categoryID })
            .then((data) => {
                console.log('Fetched Product records:', data);
                const prodCurrency = data[0]?.CurrencyIsoCode || 'USD';
                let currencySymbol = prodCurrency === 'USD' ? '$' : prodCurrency === 'INR' ? 'INR' : '';

                this.products = data.map((product) => ({
                    ...product,
                    //isWishlistItem: this.getWishListColor(product.Product2.isWishlistItem_Quest__c),
                    isWishlistItem: product.Product2.isWishlistItem_Quest__c === true,
                    formattedUnitPrice: Number(product.UnitPrice).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }),
                    prodCurrencySymbol: currencySymbol
                }));

                this.setupCarousel();
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
            });
    }

    getWishListColor(isAdded) {
        return isAdded === true;
    }

    setupCarousel() {
        this.updateDisplayedProducts();
        this.carouselIndicators = Array(Math.ceil(this.products.length / this.itemsPerPage)).fill().map((_, index) => {
            return {
                index,
                class: `splide__pagination__page ${index === this.currentPage ? 'is-active' : ''}`
            };
        });
    }

    updateDisplayedProducts() {
        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.displayedProducts = this.products.slice(startIndex, endIndex);
    }

    handleAddToWishlist(event) {
        const button = event.target.closest('button');
        if (!button) {
            console.error('Button element not found in event context');
            return;
        }
    
        const productId = button.dataset.id;
        const listname = 'Default Wishlist';
    
        if (!this.accountId || !this.storeId || !productId) {
            this.showToast('Error', 'Missing account, store, or product information', 'error');
            return;
        }
    
        const product = this.products.find(product => product.Product2.Id === productId);
        if (!product) {
            console.error('Product not found in the list');
            return;
        }
    
        // Toggle the wishlist state (add/remove logic)
        const isAdded = !product.isWishlistItem; // If it's already in wishlist, set it to false, else true
    
        // Directly modify the wishlist state without needing a separate remove function
        product.isWishlistItem = isAdded;
    
        // Call the Apex method to update the wishlist state on the server
        addWishListItem({
            storeId: this.storeId,
            productId: productId,
            accountId: this.accountId,
            isAdded: isAdded
        })
        .then((result) => {
            // Check if the result is a success message
            if (result.includes('Error')) {
                this.showToast('Error', result, 'error');
                return;
            }
    
            // Show a success modal after the item is added or removed from the wishlist
            const modalMessage = isAdded
                ? `${product.Product2.Name} was added to the list "${listname}".`
                : `${product.Product2.Name} was removed from the list "${listname}".`;
    
            this.modalTitle = 'Success';
            this.modalMessage = modalMessage;
            this.isModalOpen = true;
    
            // Optionally, you can update the UI or make other changes here
            this.updateDisplayedProducts();
        })
        .catch((error) => {
            console.error('Error adding/removing product from wishlist:', error);
            this.showToast('Error', 'Failed to update wishlist.', 'error');
        });
    }


    handleModalClose() {
        this.isModalOpen = false;
    }

    handlePrevious() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.updateDisplayedProducts();
            this.updateIndicatorClasses();
        }
    }

    handleNext() {
        if (this.currentPage < this.carouselIndicators.length - 1) {
            this.currentPage++;
            this.updateDisplayedProducts();
            this.updateIndicatorClasses();
        }
    }

    handleIndicatorClick(event) {
        this.currentPage = parseInt(event.target.dataset.index, 10);
        this.updateDisplayedProducts();
        this.updateIndicatorClasses();
    }

    updateIndicatorClasses() {
        this.carouselIndicators = this.carouselIndicators.map((indicator) => {
            return {
                ...indicator,
                class: `splide__pagination__page ${indicator.index === this.currentPage ? 'is-active' : ''}`
            };
        });
    }

    handleBuy(event) {
        const productId = event.target.dataset.id;
        const url = `/product/${productId}`;

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }

    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
}