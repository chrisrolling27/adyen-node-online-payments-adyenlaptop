const clientKey = document.getElementById("clientKey").innerHTML;
const { AdyenCheckout, GooglePay } = window.AdyenWeb;

// Function to create AdyenCheckout instance
async function createAdyenCheckout(paymentMethodsResponse) {
  return AdyenCheckout({
    paymentMethodsResponse: paymentMethodsResponse,
    clientKey,
    environment: "test",
    amount: {
      value: 10000,
      currency: 'USD'
    },
    locale: "en_US",
    countryCode: 'NL',
    showPayButton: true,
    // override Security Code label
    translations: {
      'en-US': {
        'creditCard.securityCode.label': 'CVV/CVC'
      }
    },
    onSubmit: async (state, component, actions) => {
      console.info("onSubmit", state, component, actions);
      try {
        if (state.isValid) {
          const { action, order, resultCode } = await fetch("/api/payments", {
            method: "POST",
            body: state.data ? JSON.stringify(state.data) : "",
            headers: {
              "Content-Type": "application/json",
            }
          }).then(response => response.json());

          if (!resultCode) {
            console.warn("reject");
            actions.reject();
          }

          actions.resolve({
            resultCode,
            action,
            order
          });
        }
      } catch (error) {
        console.error(error);
        actions.reject();
      }
    },
    onPaymentCompleted: (result, component) => {
      console.info("onPaymentCompleted", result, component);
      handleOnPaymentCompleted(result.resultCode);
    },
    onPaymentFailed: (result, component) => {
      console.info("onPaymentFailed", result, component);
      handleOnPaymentFailed(result.resultCode);
    },
    onError: (error, component) => {
      console.error("onError", error.name, error.message, error.stack, component);
      window.location.href = "/result/error";
    },
    // Used for the Native 3DS2 Authentication flow, see: https://docs.adyen.com/online-payments/3d-secure/native-3ds2/
    onAdditionalDetails: async (state, component, actions) => {
      console.info("onAdditionalDetails", state, component);
      try {
        const { resultCode } = await fetch("/api/payments/details", {
          method: "POST",
          body: state.data ? JSON.stringify(state.data) : "",
          headers: {
            "Content-Type": "application/json",
          }
        }).then(response => response.json());

        if (!resultCode) {
          console.warn("reject");
          actions.reject();
        }

        actions.resolve({ resultCode });
      } catch (error) {
        console.error(error);
        actions.reject();
      }
    }
  });
}

// Function to handle payment completion redirects
function handleOnPaymentCompleted(resultCode) {
  switch (resultCode) {
    case "Authorised":
      window.location.href = "/result/success";
      break;
    case "Pending":
    case "Received":
      window.location.href = "/result/pending";
      break;
    default:
      window.location.href = "/result/error";
      break;
  }
}

// Function to handle payment failure redirects
function handleOnPaymentFailed(resultCode) {
  switch (resultCode) {
    case "Cancelled":
    case "Refused":
      window.location.href = "/result/failed";
      break;
    default:
      window.location.href = "/result/error";
      break;
  }
}

// Function to start checkout
async function startCheckout() {
  try {
    const paymentMethodsResponse = await fetch('/api/paymentMethods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(response => response.json());

    const checkout = await createAdyenCheckout(paymentMethodsResponse);
    const googlepay = new GooglePay(checkout, {
      emailRequired: true,
      billingAddressRequired: true,
      shippingAddressRequired: true,
    }).mount('#component-container');

  } catch (error) {
    console.error(error);
    alert("Error occurred. Look at console for details");
  }
}

startCheckout();
