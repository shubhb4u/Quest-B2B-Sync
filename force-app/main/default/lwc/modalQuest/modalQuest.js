import { LightningElement, api } from 'lwc';

export default class ModalQuest extends LightningElement {
    @api isModalOpen = false; 
    @api modalTitle = 'Modal Title'; 
    @api modalMessage = 'Modal Message'; 

    handleClose() {
        this.dispatchEvent(new CustomEvent('close')); // Notify parent to close the modal
    }
}