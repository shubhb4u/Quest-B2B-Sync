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
// import createAndAddToList from '@salesforce/apex/ProductTile.createAndAddToList';
import { addItemToCart } from 'commerce/cartApi';
import addWishListItem from '@salesforce/apex/AddWishList.addWishListItem';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import WebstoreId from '@salesforce/label/c.WebstoreId';


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
            console.log('Called on Page refresh or category navigation from Wire?');
            if (this.categoryId) {
                this.fetchProductsByCategory();
            } else {
                this.fetchProducts();
            }
        }
    }

    connectedCallback() {
        this.storeId = WebstoreId;
        console.log('Called on Page refresh or category navigation from connected callback?');
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
                const newProducts = data.map(product => ({
                    ...product,
                    isWishlistItem: this.getWishListColor(product.Product2.isWishlistItem_Quest__c),
                    formattedUnitPrice: this.formatPrice(product.UnitPrice),
                    family: product.Product2.Family || 'Unknown',
                    unit: product.Product2.QuantityUnitOfMeasure || 'Unknown',
                    pricingMethod: product.Product2.SBQQ__PricingMethod__c || 'Unknown',
                }));
    
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

        // console.log('Families:', families);
        // console.log('Quantity Units:', units);
        // console.log('Pricing Methods:', pricingMethods);

        this.productFamilyOptions = this.generateOptions(families);
        this.quantityUnitOptions = this.generateOptionsUnits(units);
        this.pricingMethodOptions = this.generateOptionsPricing(pricingMethods);

        // console.log('Generated Product Family Options:', this.productFamilyOptions);
        // console.log('Generated Quantity Unit Options:', this.quantityUnitOptions);
        // console.log('Generated Pricing Method Options:', this.pricingMethodOptions);
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

        const productId = event.target.dataset.id;
        
        const url = `/product/${productId}`;
        console.log('Navigating to:', url);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
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

        console.log('Checking handle add to wishlist ran successfully-->>>>'+ productId);

        if (productId) {
            const productIndex = this.filteredProducts.findIndex(product => product.Product2Id === productId);
            // console.log('Checking handle add to wishlist ran successfully-->>>>'+ productIndex);

            // console.log('productId:', productId);
            // console.log('this.products:', this.products.map(product => product.Product2Id));
            // console.log('this.filteredProducts:', this.filteredProducts.map(product => product.Product2Id));

            if (productIndex === -1) return;

        
            const productName = this.filteredProducts[productIndex].Product2.Name || 'Unknown Product';
            const listname = 'Default Wishlist';
            const isCurrentlyWishlistItem = this.filteredProducts[productIndex].isWishlistItem;
            const newWishlistStatus = !isCurrentlyWishlistItem;


            addWishListItem({
                storeId: this.storeId,
                productId: productId,
                accountId: this.accountId,
                isAdded: newWishlistStatus
            })
            .then((response) => {
                
                this.filteredProducts = [...this.filteredProducts]; // Refresh UI
                // Update the product's wishlist status
                this.filteredProducts[productIndex].isWishlistItem = newWishlistStatus;

                // Show a success modal with a different message for adding/removing
                this.modalTitle = 'Success';
                this.modalMessage = newWishlistStatus
                    ? `${productName} was added to the list "${listname}".`
                    : `${productName} was removed from the list "${listname}".`;
                this.isModalOpen = true;

                console.log('Checking handle add to wishlist ran successfully-->>>>');
            })
            .catch((error) => {
                console.error('Error adding to wishlist:', error);

                // Show error modal
                this.modalTitle = 'Product already in Wishlist';
                this.modalMessage = `${productName} is already added to your list.`;
                this.isModalOpen = true;
            });
        }
    }

    // Close the modal
    handleModalClose() {
        this.isModalOpen = false;
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
