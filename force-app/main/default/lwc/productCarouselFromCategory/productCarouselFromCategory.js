import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import addWishListItem from '@salesforce/apex/AddWishList.addWishListItem';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import WebstoreId from '@salesforce/label/c.WebstoreId';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';
import getProductsFromCategory from '@salesforce/apex/ProductRecordsFromCategory.getProductsFromCategory'; //
export default class ProductCarouselFromCategory extends NavigationMixin(LightningElement) {
    @track products;
    @track displayedProducts = [];
    @track carouselIndicators = [];
    @track currentPage = 0;
    @track itemsPerPage;
    @api categoryID;
    @api categoryName;
    @api pricebookID;
    categoryURL;
    siteBaseUrl;
    accountId
    storeId
    connectedCallback() {
        this.storeId = WebstoreId;
        console.log('store Id ==>'  +this.storeId);
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
        this.setItemsPerPage(); // Update itemsPerPage based on screen size
        if (this.products?.length) {
            this.currentPage = 0; // Reset to the first page
            this.updateDisplayedProducts(); // Update displayed products
            this.updateIndicators(); // Update carousel indicators
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

    wishlistClass(isWishlistItem) {
        var wishlistClassName = 'wishlist-icon ';
        if (isWishlistItem) {
            wishlistClassName += 'wishlist-icon-red';
        } else {
            wishlistClassName += 'wishlist-icon-white';
        }

        return wishlistClassName;
    }

    fetchProductsByCategory() {
        getProductsFromCategory({ catId: this.categoryID }) // Call the getProductsFromCategory method
            .then((data) => {
                console.log('Fetched Product records again... :', data);
                this.products = data;
                this.products = data.map((product) => ({
                    ...product,
                    wishlistClass: this.wishlistClass(false), //setting dummy value for now. TODO: Fetch from DB
                    formattedUnitPrice: this.formatPrice(product.UnitPrice)
                }));
                this.setupCarousel();
            })
            .catch((error) => {
                console.error('Error fetching ProductCategoryProduct records:', error);
            });
    }


    formatPrice(price) {
        return Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    getWishListColor(isAdded){
        return isAdded == true;
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

    handleAddToWishlist(event) {
        const productId = event.target.dataset.id;
        let listname = 'Sample Wishlist';
        if (!this.accountId || !this.storeId || !productId) {
            this.showToast('Error', 'Missing account, store, or product information', 'error');
            return;
        }
            console.log('this.storeId' +this.storeId);
            console.log('productId' +productId);
            console.log('this.accountId' +this.accountId);

            addWishListItem({
                storeId: this.storeId,
                productId: productId,
                accountId: this.accountId
            })
                .then(() => {
                    // this.dispatchEvent(
                    //     new ShowToastEvent({
                    //         title: 'Success',
                    //         message: '{0} was added to a new list called "{1}"',
                    //         messageData: [this.displayableProduct.name, listname],
                    //         variant: 'success',
                    //         mode: 'dismissable'
                    //     })
                    // );
                    
                })
                .catch((error) => {
                    console.error('Error adding to wishlist:', error);
                    // this.dispatchEvent(
                    //     new ShowToastEvent({
                    //         title: 'Error',
                    //         message:
                    //             '{0} could not be added to a new list. Please make sure you have fewer than 10 lists or try again later',
                    //         messageData: [this.displayableProduct.name],
                    //         variant: 'error',
                    //         mode: 'dismissable'
                    //     })
                    // );
                });
    }

    handleBuy(event) {
        const productId = event.target.dataset.id;
        let productName = event.target.dataset.name;

        let baseUrl = this.siteBaseUrl;
        baseUrl = baseUrl.replace(/vforcesite/g, '');

        productName = productName.toLowerCase();
        const url = `${baseUrl}/product/${productId}`;
        console.log('Navigating to:', url);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }

    // Utility function: Debounce
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
}