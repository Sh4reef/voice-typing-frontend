// Parse query parameters
const params = new URLSearchParams(window.location.search);
const transactionId = params.get('transaction_id');
const customerEmail = params.get('customer_email');

// If there's no transaction ID, redirect immediately to home page
if (!transactionId) {
  window.location.replace('/');
} else {
  // Update the DOM with query parameters
  document.getElementById('display-email').textContent = customerEmail || 'N/A';
  document.getElementById('display-txn').textContent = transactionId;
  document.getElementById('instruction-email').textContent = customerEmail || 'your email';
}
