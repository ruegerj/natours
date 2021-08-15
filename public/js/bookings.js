/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51JO4oGIQNTLO95PoBZ0g51ikgDP4puRADp55NaEEl0eBa8ImJERjiRqv6WEuQdv0ur6TlkTh6CheZZQSJ3Yu7fcD00nZH7yeMI'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from api
    const response = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: response.data.session.id,
    });
  } catch (error) {
    console.error('Booking failed for tour', error);

    showAlert('error', 'Tour booking failed, please try again later');
  }
};
