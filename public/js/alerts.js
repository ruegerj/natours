/* eslint-disable */

export const hideAlert = () => {
  const element = document.querySelector('.alert');

  if (!element) {
    return;
  }

  element.parentElement.removeChild(element);
};

export const showAlert = (type, message, duration = 7000) => {
  hideAlert();

  const markup = `<div class="alert alert--${type}">${message}</div`;

  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);

  window.setTimeout(hideAlert, duration);
};
