import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getProductRecs from '@salesforce/apex/DisplayProductRecords.getProductRecs';
import { addItemToCart } from 'commerce/cartApi';

export default class DisplayProductRecords extends NavigationMixin(LightningElement) {
    @track products;
    @track displayedProducts = [];
    @track carouselIndicators = [];
    @track currentPage = 0;
    @track itemsPerPage = 4;

    
    connectedCallback() {
        this.fetchProducts();
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
        const productId = event.target.dataset.id;
        let productName = event.target.dataset.name;

        addItemToCart(productId, 1);
        location.reload();

        console.log('event.target.dataset: ', event.target.dataset);
        console.log('event.target: ', event.target);

        console.log('productId: ', productId);

        productName = productName.toLowerCase();

        console.log('productName: ', productName);

        
    }
}