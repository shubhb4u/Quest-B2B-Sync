import { LightningElement, api, wire, track } from 'lwc';
import { getContent } from 'experience/cmsDeliveryApi';
import siteId from '@salesforce/site/Id';
import getSiteBaseUrl from '@salesforce/apex/SiteInfo.getSiteBaseUrl';

export default class SldsCarouselCmsPanel extends LightningElement {
  @api contentKey;
  @track data;
  baseDomain;
  url;
  siteBaseUrl;

  @wire(getSiteBaseUrl)
  wiredSiteBaseUrl({ error, data }) {
      if (data) {
          this.baseDomain = data; // Set the base URL
      } else if (error) {
          console.error('Error fetching site base URL:', error);
      }
  }

  @wire(getContent, { channelOrSiteId: siteId, contentKeyOrId: '$contentKey' })
  onGetContent(result) {
    if (result.data) {
      this.data = result.data;
      this.url = this.baseDomain+ this.data.contentBody['sfdc_cms:media'].url;

    } else if (result.error) {
      // Handle error, e.g., display a placeholder image or message
      console.error(result.error);
    }
  }
}