import { api, LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getProductRecs from '@salesforce/apex/ProductTile.getProductRecs';
import { addItemToCart } from 'commerce/cartApi';
import addWishListItem from '@salesforce/apex/AddWishList.addWishListItem';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import USER_ID from '@salesforce/user/Id';
import ACCOUNT_ID from '@salesforce/schema/User.AccountId';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import getSiteBaseUrl from '@salesforce/apex/AddWishList.getSiteBaseUrl';
import WebstoreId from '@salesforce/label/c.WebstoreId';


export default class FeaturedProducts1 extends NavigationMixin(LightningElement) {
    @track products = [];
    @track productDiscountList = [];
    @track displayedProducts = [];
    @track carouselIndicators = [];
    @track currentPage = 0;
    @track itemsPerPage = 10;
    @track productCounters = {}; // Store quantity for each product
    @track accountId;
    @track storeId;
        siteBaseUrl;
    @api pricebookID;

  @wire(getSiteBaseUrl)
  wiredSiteBaseUrl({ error, data }) {
      if (data) {
          this.siteBaseUrl = data; // Set the base URL
           console.log('Site Base URL:', this.siteBaseUrl);
      } else if (error) {
          console.error('Error fetching site base URL:', error);
      }
  }
    @wire(getRecord, { recordId: USER_ID, fields: [ACCOUNT_ID] })
    user({ data, error }) {
        if (data) {
            this.accountId = getFieldValue(data, ACCOUNT_ID);
        } else if (error) {
            console.error('Error fetching user data:', error);
        }
    }

            fetchProducts() {
                getProductRecs()
                    .then((data) => {
                        this.products = data.map(product => ({
                            ...product,
                            formattedUnitPrice: this.formatPrice(product.UnitPrice)
                        }));
                        this.setupCarousel();
                        console.log('this.products', this.products);
                    })
                    .catch((error) => {
                        console.error('Error fetching products:', error);
                    });
            }

    formatPrice(price) {
       return Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    handleNavigate(event) {
        const productId = event.target.dataset.id;
        const productName = event.target.dataset.name;

       let url = `${this.siteBaseUrl}/product/${productName}/${productId}`;
       url = url.replace(/vforcesite/g, '');

        this[NavigationMixin.Navigate]({
            type: "standard__webPage",
            attributes: {
                url: url
            },
        });
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

    handleBuy(event) {
        const productId = event.target.dataset.id; // Get the product ID
        const quantity = this.productCounters[productId] || 1; // Get the quantity or default to 1

        addItemToCart(productId, quantity)
            .then(() => {
                this.showToast('Success', 'Item added to cart successfully', 'success');
            })
            .catch((error) => {
                console.error('Error adding item to cart:', error);
                this.showToast('Error', 'Failed to add item to cart', 'error');
            });
    }

    connectedCallback() {
        // Ensure `isWishlistItem` is initialized to false for all products if it's undefined
        this.displayedProducts = this.displayedProducts.map(product => ({
            ...product,
            isWishlistItem: product.isWishlistItem || false // Set default value to false if undefined
        }));
        this.storeId= WebstoreId;
        console.log('Store ID Label:', this.storeId);
        this.fetchProducts();
    }

    handleAddToWishlist(event) {
        const productId = event.target.dataset.id; // Get product ID dynamically
        console.log('Accont ID:' +this.accountId);
        if (!this.accountId || !this.storeId || !productId) {
            this.showToast('Error', 'Missing account, store, or product information', 'error');
            return;
        }

        console.log('StoreID:' +this.storeId);
        console.log('ProductId:' +productId);
        addWishListItem({ accountId:this.accountId, storeId: this.storeId, productIds: [productId] })
            .then(() => {
                this.showToast('Success', 'Product added to wishlist', 'success');
                this.updateWishlistIcon(productId, true);  
            })
            .catch(error => {
                console.error('Error adding to wishlist:', error);
                this.showToast('Error', 'Failed to add product to wishlist', 'error');
                this.updateWishlistIcon(productId, false); // Reset icon on failure
            });
    }

    updateWishlistIcon(productId, isAdded) {
        const product = this.displayedProducts.find(prod => prod.Product2Id === productId);
        if (product) {
            product.isWishlistItem = isAdded;
            product.wishlistIconClass = this.getProductWishlistIconClass(product); // Update the class
            this.displayedProducts = [...this.displayedProducts]; // Re-render
        }
    }

    getProductWishlistIconClass(product) {
        return product.isWishlistItem ? 'is-added-to-wishlist' : 'wishlist-icon';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant,
                mode: 'dismissable'
            })
        );
    }
}