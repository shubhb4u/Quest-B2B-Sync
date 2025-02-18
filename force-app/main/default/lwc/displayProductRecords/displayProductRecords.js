import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';
import getProdId from '@salesforce/apex/DisplayProductRecords.getProdId'; //
export default class DisplayProductRecords extends NavigationMixin(LightningElement) {
    @track products;
    @track displayedProducts = [];
    @track carouselIndicators = [];
    @track currentPage = 0;
    @track itemsPerPage = 4;
    @api categoryID;
    @api categoryName;
    @api pricebookID;
    categoryURL;
    siteBaseUrl;
    connectedCallback() {
        this.fetchProductsByCategory();
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

    fetchProductsByCategory() {
        getProdId({ catId: this.categoryID }) // Call the getProdId method
            .then((data) => {
                console.log('Fetched Product records again... :', data);
                this.displayedProducts = data;
               //this.displayedProducts = data.filter(product => product.Product2 && product.Product2.Name);
            })
            .catch((error) => {
                console.error('Error fetching ProductCategoryProduct records:', error);
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

        let baseUrl = this.siteBaseUrl;
        baseUrl = baseUrl.replace(/vforcesite/g, '');

        productName = productName.toLowerCase();
        const url = `${baseUrl}/product/${productName}/${productId}`;
        console.log('Navigating to:', url);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }
}