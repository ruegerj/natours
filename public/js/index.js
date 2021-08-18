/* eslint-disable */
import '@babel/polyfill';
import { login, logout } from './auth';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './bookings';
import { showAlert } from './alerts';

// DOM elements
const body = document.querySelector('body');
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.login-form > form.form');
const userDataForm = document.querySelector('form.form.form-user-data');
const userPassswordForm = document.querySelector(
  'form.form.form-user-password'
);
const logoutBtn = document.querySelector('.nav__el--logout');
const savePasswordBtn = document.querySelector('.btn--save-password');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const nameInput = document.getElementById('name');
const currentPasswordInput = document.getElementById('password-current');
const passwordConfirmInput = document.getElementById('password-confirm');
const photoInput = document.getElementById('photo');
const bookTourBtn = document.getElementById('book-tour-btn');

// Delegation
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('name', nameInput.value);
    form.append('email', emailInput.value);
    form.append('photo', photoInput.files[0]);

    updateSettings(form, 'data');
  });
}

if (userPassswordForm) {
  userPassswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = passwordInput.value;
    const passwordCurrent = currentPasswordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    savePasswordBtn.textContent = 'Updating...';

    await updateSettings(
      {
        password,
        passwordCurrent,
        passwordConfirm,
      },
      'password'
    );

    [passwordInput, currentPasswordInput, passwordConfirmInput].forEach(
      (input) => {
        input.value = '';
      }
    );

    savePasswordBtn.textContent = 'Save password';
  });
}

if (bookTourBtn) {
  bookTourBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

const alertMessage = body.dataset.alert;

if (alertMessage) {
  showAlert('success', alertMessage, 20000);
}
