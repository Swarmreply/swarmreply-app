// Keyboard-activation helper for non-native interactive elements.
// Elements given role="button"/"switch"/"checkbox" use this so Enter/Space
// triggers their onClick, mirroring native <button> behavior.
export const keyClick = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
};
