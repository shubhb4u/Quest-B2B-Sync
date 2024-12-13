import { api, LightningElement, track, wire } from 'lwc';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';
import heartRed from '@salesforce/resourceUrl/heartRed';
import heartWhite from '@salesforce/resourceUrl/heartWhite';
// import communityId from '@salesforce/community/Id';
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getProductRecs from '@salesforce/apex/ProductTile.getProductRecs';
import getProdId from '@salesforce/apex/ProductTile.getProdId';
import getCategoryName from '@salesforce/apex/ProductTile.getCategoryName';
// import createAndAddToList from '@salesforce/apex/ProductTile.createAndAddToList';
import { addItemToCart } from 'commerce/cartApi';
import addWishListItem from '@salesforce/apex/AddWishList.addWishListItem';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import WebstoreId from '@salesforce/label/c.WebstoreId';
import getProfileName from '@salesforce/apex/Product2Controller.getProfileName';
import userId from '@salesforce/user/Id';


export default class QuestProducts extends NavigationMixin(LightningElement) {
    @track products = [];
    @track filteredProducts = [];
    @track filters = {
        productFamily: '',
        quantityUnit: '',
        pricingMethod: ''
    };

    @track productFamilyOptions = [];
    @track quantityUnitOptions = [];
    @track pricingMethodOptions = [];

    accountId;
    siteBaseUrl;
    categoryURL
    categoryId;
    categoryName;
    hasCategory = false;
    communityId;

    // Define icon paths
    heartRedIcon = heartRed+'#heartRed';
    heartWhiteIcon = heartWhite+'#heartWhite';

    @track isModalOpen = false;
    @track modalTitle = '';
    @track modalMessage = '';

    @track total = 0;
    @track isLoading = true;
    _pageNumber = 1;
    hideShowMore = false;


    //Added by Shubham fro Guest user access - ----------------------------------------------------------
    @track currentUser = {
        id: userId,
        profileName: null
    };

    @track isGuestUser = false;

    @wire(getProfileName)
    wiredProfileName({ data, error }) {
        if (data) {
            this.currentUser.profileName = data;
            // console.log('Profile Name:', data);
            this.checkIsGuestUser();
        } else if (error) {
            console.error('Error fetching profile name:', error);
        }
    }

    checkIsGuestUser() {
        this.isGuestUser = this.currentUser.profileName === 'CI_Quest EStore Profile';
        // console.log('Is Guest User:', this.isGuestUser);
    }

    //---------------------------------------------------------------------------------------


    get pageNumber() {
        return this._pageNumber;
    }


    @wire(getRecord, { recordId: USER_ID, fields: [ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.accountId = getFieldValue(data, ACCOUNT_ID);
        } else if (error) {
            console.error('Error fetching user data:', error);
        }
    }


    @wire(CurrentPageReference)
    getPageReference(pageReference) {
        if (pageReference?.attributes?.objectApiName === 'ProductCategory') {
            this.categoryId = pageReference.attributes.recordId;
            // console.log('Called on Page refresh or category navigation from Wire?');
            if (this.categoryId) {
                this.fetchProductsByCategory();
                this.fetchCategoryName();
            } else {
                this.fetchProducts();
            }
        }
    }


    connectedCallback() {
        this.checkIsGuestUser()
        this.storeId = WebstoreId;
        // console.log('Called on Page refresh or category navigation from connected callback?');
        if (this.categoryId) {
            this.fetchProductsByCategory();
        } else {
            this.fetchProducts();
        }
    }

    fetchProducts() {
        getProductRecs()
            .then((data) => {
                const newProducts = data.map(product => ({

                    ...product,
                    isWishlistItem: this.getWishListColor(product.Product2.isWishlistItem_Quest__c),
                    formattedUnitPrice: this.formatPrice(product.UnitPrice),
                    family: product.Product2.Family || 'Unknown',
                    unit: product.Product2.QuantityUnitOfMeasure || 'Unknown',
                    pricingMethod: product.Product2.SBQQ__PricingMethod__c || 'Unknown',
                }));

                this.products = newProducts; // Store all products fetched
                this._pageNumber = 1; // Reset page number
                this.loadMoreData(); // Show the first set of products
                this.isLoading = false;
                this.setFilterOptions();
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
            });
    }

    fetchProductsByCategory() {
        getProdId({ catId: this.categoryId })
            .then((data) => {
                const newProducts = data.map(product => {
                    // Get the currency code from the product
                     const prodCurrency = product.CurrencyIsoCode || product.Product2?.CurrencyIsoCode;
                    //  console.log('Currency Code:', prodCurrency);

                     // Set the currency symbol based on the currency code
                     let currencySymbol;
                     if (prodCurrency == 'USD') {
                         currencySymbol = '$';
                     } else if (prodCurrency == 'INR') {
                         currencySymbol = '₹'; // Using ₹ symbol for INR
                     } else {
                         currencySymbol = ''; // Default if currency is unknown
                     }
                    //  console.log('Currency Symbol:', currencySymbol);

                     return {
                    ...product,
                    isWishlistItem: this.getWishListColor(product.Product2.isWishlistItem_Quest__c),
                    formattedUnitPrice: this.formatPrice(product.UnitPrice),
                    currencySymbol: currencySymbol,
                    family: product.Product2.Family || 'Unknown',
                    unit: product.Product2.QuantityUnitOfMeasure || 'Unknown',
                    pricingMethod: product.Product2.SBQQ__PricingMethod__c || 'Unknown',
                }});

                this.products = newProducts; // Store all products fetched for this category
                this._pageNumber = 1; // Reset page number for new category
                this.loadMoreData(); // Show the first set of products for this category
                this.isLoading = false;
                this.setFilterOptions();
            })
            .catch((error) => {
                console.error('Error fetching products:', error);
            });
    }

    fetchCategoryName(){
        getCategoryName({ catId: this.categoryId })
        .then((data) => {
            if(data != null){
                this.categoryName = data;
                this.hasCategory = true; 
           }
        })
        .catch((error) => {
            console.error('Error getting category name', error);
        });
    }


    loadMoreData() {
        const startIndex = (this._pageNumber - 1) * 12;
        const endIndex = this._pageNumber * 12;

        this.filteredProducts = this.products.slice(0, endIndex);

        this.hideShowMore = this.filteredProducts.length >= this.products.length;
    }

    seeMoreHandler() {
        this._pageNumber += 1;
        this.loadMoreData();
    }

    formatPrice(price) {
        return Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }


    getWishListColor(isAdded) {
        return isAdded == true;
    }


    // Dynamically set filter options based on product data
    setFilterOptions() {
        const families = [...new Set(this.products.map(product => product.family || 'Unknown'))];
        const units = [...new Set(this.products.map(product => product.unit || 'Unknown'))];
        const pricingMethods = [...new Set(this.products.map(product => product.pricingMethod || 'Unknown'))];


        this.productFamilyOptions = this.generateOptions(families);
        this.quantityUnitOptions = this.generateOptionsUnits(units);
        this.pricingMethodOptions = this.generateOptionsPricing(pricingMethods);

    }



    // Helper to generate options for lightning-combobox
    generateOptions(values) {
        return [{ label: 'Select Product Family', value: '' }, ...values.map(value => ({
            label: value === 'Unknown' ? 'Not Specified' : value,
            value
        }))];
    }

    // Helper to generate options for lightning-combobox
    generateOptionsUnits(values) {
        return [{ label: 'Select Quantity Unit', value: '' }, ...values.map(value => ({
            label: value === 'Unknown' ? 'Not Specified' : value,
            value
        }))];
    }

    // Helper to generate options for lightning-combobox
    generateOptionsPricing(values) {
        return [{ label: 'Select Pricing Method', value: '' }, ...values.map(value => ({
            label: value === 'Unknown' ? 'Not Specified' : value,
            value
        }))];
    }



    handleBuy(event) {
        event.preventDefault();

        const productId = event.target.dataset.id;

        const url = `/product/${productId}`;
        console.log('Navigating to:', url);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        }).then(url => {
            window.open(url, "_blank");
        });
    }


     // handleAddToWishlist method with modal instead of toast
     handleAddToWishlist(event) {
        const button = event.target.closest('button');
        if (!button) {
            console.error('Button element not found in event context');
            return;
        }

        const productId = button ? button.dataset.id : null;

        if (productId) {
            const productIndex = this.filteredProducts.findIndex(product => product.Product2Id === productId);

            if (productIndex === -1) return;

            const productName = this.filteredProducts[productIndex].Product2.Name || 'Unknown Product';
            const listName = 'Default Wishlist';
            const isCurrentlyWishlistItem = this.filteredProducts[productIndex].isWishlistItem;
            const newWishlistStatus = !isCurrentlyWishlistItem;

            addWishListItem({
                storeId: this.storeId,
                productId: productId,
                accountId: this.accountId,
                isAdded: newWishlistStatus
            })
            .then((response) => {

                this.filteredProducts = [...this.filteredProducts]; 
                // Update the product's wishlist status
                this.filteredProducts[productIndex].isWishlistItem = newWishlistStatus;

                const successMessage = newWishlistStatus
                        ? `${productName} was added to the list "${listName}".`
                        : `${productName} was removed from the list "${listName}".`;

                    this.showModal('Success', successMessage);

            })
            .catch((error) => {
                console.error('Error adding to wishlist:', error);

                const errorMessage = error.body?.message || 'An unexpected error occurred.';
                    console.error('Error adding to wishlist:', error);
                    this.showModal('Error', errorMessage);
            });
        }
    }

    // Modal helper methods
    showModal(title, message) {
        this.modalTitle = title;
        this.modalMessage = message;
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleModalClose() {
        this.closeModal();
    }


    handleFilterChange(event) {
        const filterType = event.target.dataset.id;
        this.filters[filterType] = event.detail.value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            return (!this.filters.productFamily || product.family === this.filters.productFamily) &&
                (!this.filters.quantityUnit || product.unit === this.filters.quantityUnit) &&
                (!this.filters.pricingMethod || product.pricingMethod === this.filters.pricingMethod);
        });
    }

    clearFilters() {
        this.filters = { productFamily: '', quantityUnit: '', pricingMethod: '' };
        this.filteredProducts = this.products;
    }
}