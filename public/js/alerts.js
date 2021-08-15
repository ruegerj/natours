/* eslint-disable */

export const hideAlert = () => {
  const element = document.querySelector('.alert');

  if (!element) {
    return;
  }

  element.parentElement.removeChild(element);
};

export const showAlert = (type, message) => {
  hideAlert();

  const markup = `<div class="alert alert--${type}">${message}</div`;

  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);

  window.setTimeout(hideAlert, 5000);
};
