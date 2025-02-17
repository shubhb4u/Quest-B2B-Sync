/**
* @description This is a sample orchestrator that calls the inventory, pricing, promotions, shipping and tax calculators.
* This class must extend CartExtension.CartCalculate and must be linked to the orchestrator extension point (Commerce_Domain_Cart_Calculate).
* Calculates pricing and promotions for operations: Add product to cart, remove product from cart, edit cart item quantity.
* Calculates promotions for operations: add coupon to cart, remove coupon from cart.
* Calculates pricing, promotions, inventory for start checkout operation (without shipping address available).
* Calculates pricing, promotions, inventory, shipping, post shipping and taxes for start checkout operation (with shipping address available).
* Calculates shipping, post shipping and taxes for update shipping address operation.
* Calculates taxes for select delivery method operation.
*/
global class CCA_CartOrchestrator extends CartExtension.CartCalculate {

    /**
     * @description All classes extending CartExtension.CartCalculate must have a default constructor defined
     */
    global CCA_CartOrchestrator()
    {
        System.debug('CCA_CartOrchestrator ctor');
    }

    /**
     * @description Constructor used by unit tests only. See <<CartCalculateSampleUnitTest>>.
     * @param apexExecutor Executor which executes various calculators. Can be used to stub calculation results or delegate calculations to actual Calculator. See <<CartCalculateExecutorMock>>.
     */
    global CCA_CartOrchestrator(final CartExtension.CartCalculateExecutorMock apexExecutor) {
        // Must call super constructor in order for provided Executor to be used for calculations
        super(apexExecutor);
    }

    // Each orchestrator must override this calculate method.
    global virtual override void calculate(CartExtension.CartCalculateOrchestratorRequest request)
    {
        System.debug('### runPricing in CCA_CartOrchestrator');

        CartExtension.Cart cart = request.getCart();

        // Use BuyerActions to decide which calculators to invoke
        CartExtension.BuyerActions buyerActions = request.getBuyerActions();
        boolean runPricing = buyerActions.isCheckoutStarted() || buyerActions.isCartItemChanged();
        boolean runPromotions = buyerActions.isCheckoutStarted() || buyerActions.isCouponChanged() || buyerActions.isCartItemChanged();
        boolean runInventory = buyerActions.isCheckoutStarted();
        boolean runShipping = buyerActions.isDeliveryGroupChanged();
        boolean runPostShipping = buyerActions.isDeliveryGroupChanged() || buyerActions.isDeliveryMethodSelected();
        boolean runTaxes = buyerActions.isDeliveryGroupChanged() || buyerActions.isDeliveryMethodSelected();


        String calculateStatus = '### Calculate Boolean Status:\r\n';
        calculateStatus += 'runPricing: ' + runPricing + '\r\n';
        calculateStatus += 'runPromotions: ' + runPromotions + '\r\n';
        calculateStatus += 'runInventory: ' + runInventory + '\r\n';
        calculateStatus += 'runShipping: ' + runShipping + '\r\n';
        calculateStatus += 'runPostShipping: ' + runPostShipping + '\r\n';
        calculateStatus += 'runTaxes: ' + runTaxes + '\r\n';
        System.debug(calculateStatus);

        // OptionalBuyerActionDetails can be used to optimize the various calculators that are invoked
        CartExtension.CartCalculateCalculatorRequest calculatorRequest = new CartExtension.CartCalculateCalculatorRequest(cart, request.getOptionalBuyerActionDetails());

        if (runPricing) {
            System.debug('### runPricing in CCA_CartOrchestrator');
            prices(calculatorRequest);

            if (hasErrorLevelCartValidationOutput(cart.getCartValidationOutputs(), CartExtension.CartValidationOutputTypeEnum.PRICING)) {
                return;
            }
        }

        if (runPromotions) {
            System.debug('### runPromotions in CCA_CartOrchestrator');
            promotions(calculatorRequest);

            if (hasErrorLevelCartValidationOutput(cart.getCartValidationOutputs(), CartExtension.CartValidationOutputTypeEnum.PROMOTIONS)) {
                return;
            }
        }

        if (runInventory) {
            System.debug('### runInventory in CCA_CartOrchestrator');
            inventory(calculatorRequest);

            if (hasErrorLevelCartValidationOutput(cart.getCartValidationOutputs(), CartExtension.CartValidationOutputTypeEnum.INVENTORY)) {
                return;
            }
        }

        if (runShipping) {
            System.debug('### runShipping in CCA_CartOrchestrator');
            shipping(calculatorRequest);

            if (hasErrorLevelCartValidationOutput(cart.getCartValidationOutputs(), CartExtension.CartValidationOutputTypeEnum.SHIPPING)) {
                return;
            }
        }

        if (runPostShipping) {
            System.debug('### runPostShipping in CCA_CartOrchestrator');
            postShipping(calculatorRequest);

            if (hasErrorLevelCartValidationOutput(cart.getCartValidationOutputs(), CartExtension.CartValidationOutputTypeEnum.SYSTEM_ERROR)) {
                return;
            }
        }

        if (runTaxes) {
            System.debug('### runTaxes in CCA_CartOrchestrator');
            taxes(calculatorRequest);
        }
    }

    // This function evaluates whether there are errors in the CVO of a specific calculator type.
    private Boolean hasErrorLevelCartValidationOutput(CartExtension.CartValidationOutputList cartValidationOutputs,
        CartExtension.CartValidationOutputTypeEnum cartValidationOutputType)
    {
        System.debug('### hasErrorLevelCartValidationOutput in CCA_CartOrchestrator started');
        Iterator<CartExtension.CartValidationOutput> iterator = cartValidationOutputs.iterator();

        while (iterator.hasNext()) {
            CartExtension.CartValidationOutput cvo = iterator.next();

            Boolean cvoContainsCalculatorError = cvo.getType() == cartValidationOutputType
                    && cvo.getLevel() == CartExtension.CartValidationOutputLevelEnum.ERROR;

            if (cvoContainsCalculatorError)
            {
                System.debug('### hasErrorLevelCartValidationOutput in CCA_CartOrchestrator complete. Result: true.');
                return true;
            }
        }

        System.debug('### hasErrorLevelCartValidationOutput in CCA_CartOrchestrator complete. Result: false.');
        return false;
    }
}