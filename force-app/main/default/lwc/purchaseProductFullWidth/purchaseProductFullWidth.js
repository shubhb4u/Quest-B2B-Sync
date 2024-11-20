import { LightningElement, track, api, wire } from "lwc";
import getProductsByCode from '@salesforce/apex/Product2Controller.getProductsByCode';
import { NavigationMixin } from 'lightning/navigation';

export default class purchaseProductFullWidth extends NavigationMixin(LightningElement) {
    @track products = [];
    @api productcode; // Exposed public property to pass the product code
    @api productcode2;
    @api productcode3;
    @api productcode4;
    @track displayedProducts = [];
    @track carouselIndicators = [];
    @track currentPage = 0;
    @track itemsPerPage = 1;
    @track displayCarousel = false;

    parentClass;
    @api isAwardComponent;
    connectedCallback() {
        this.parentClass = this.isAwardComponent ? 'q-hero-top q-award-panel' : 'q-hero-top';
        this.sendDataToApex();
    }

    // Method to send the values to Apex
    sendDataToApex() {
        // Prepare parameters for the Apex method
        const params = {
            productcode: this.productcode,
            productcode2: this.productcode2,
            productcode3: this.productcode3,
            productcode4: this.productcode4
        };

        // Wire service to call the Apex method and fetch product details
        getProductsByCode({
            productcode: params.productcode,
            productcode2: params.productcode2,
            productcode3: params.productcode3,
            productcode4: params.productcode4
        }).then(data => {
                console.log('Apex response:', data);
                this.products = data; // Store product data if the wire call is successful
                if (data.length > 1) { // if only one product is returned, do not init the carousel
                    this.displayCarousel = true;
                    this.setupCarousel(data);
                } else { // init dispayedProducts object to render one card
                    this.displayedProducts = data;
                }
            })
            .catch(error => {
                console.error('Error calling Apex:', error);
            });
    }

    setupCarousel(data) {
        this.updateDisplayedProducts(data);
        this.carouselIndicators = Array(Math.ceil(this.products.length / this.itemsPerPage)).fill().map((_, index) => {

            return {
                index,
                class: `splide__pagination__page ${index === this.currentPage ? 'is-active' : ''}`
            };
        });
    }

    updateDisplayedProducts(data) {
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

    redirectToPDP (event) {
        const pid = event.target.dataset.id;
        const url = `/product/${pid}`;

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }
}