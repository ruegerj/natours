/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const response = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    if (response.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');

      window.setTimeout(() => {
        window.location.assign('/');
      }, 1500);
    }
  } catch (error) {
    console.error('Authentication failed', error.response.data);

    showAlert('error', 'Incorrect email or password');
  }
};

export const logout = async () => {
  try {
    const response = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });

    if (response.data.status === 'success') {
      window.location.assign('/');
    }
  } catch (error) {
    console.error('Logout failed', error);

    showAlert('error', 'Logout failed, please try again');
  }
};
