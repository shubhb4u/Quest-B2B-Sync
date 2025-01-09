import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';

export default class ProductSearch extends NavigationMixin(LightningElement) {
    @track searchKey = '';
    siteBaseUrl = '';
    onsearchkey = '';

    @wire(getSiteBaseUrl)
    wiredSiteBaseUrl({data, error}){
        if(data){
            this.siteBaseUrl = data.replace(/vforcesite/g, '').replace(/sfsites\/c\//g, '');
            console.log('Site Base Url: ', this.siteBaseUrl);
        } else if (error) {
            console.error('Error fetching site url: ', error);
        }
    }

    handleSearchKeyChange(event) {
        this.searchKey = event.target.value;
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.redirectToSearchResults();
        }
    }

    handleSearchClick() {
        this.redirectToSearchResults();
    }

    redirectToSearchResults() {
        if (!this.searchKey) {
            console.error('Search key is empty. Cannot navigate.');
            return;
        }

        console.log('Navigating to Product Results page with searchKey:', this.searchKey);

       // Redirect to the product results page with the search key appended to the URL
       const redirectUrl =  `${this.siteBaseUrl}/searchresults?searchKey=${encodeURIComponent(this.searchKey)}`;
        window.location.href = redirectUrl;
    }
}