/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

export const updateSettings = async (data, type) => {
  const isPasswordUpdate = type === 'password';

  try {
    const requestUrl = `/api/v1/users/${
      isPasswordUpdate ? 'update-my-password' : 'me'
    }`;

    const response = await axios({
      method: 'PATCH',
      url: requestUrl,
      data,
    });

    if (response.data.status === 'success') {
      showAlert(
        'success',
        `${isPasswordUpdate ? 'Password' : 'Data'} updated successfully!`
      );
    }
  } catch (error) {
    console.error('Failed to update user data', error.response.data);

    showAlert('error', error.response.data.message);
  }
};
