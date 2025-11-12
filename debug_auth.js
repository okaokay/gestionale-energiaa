console.log('=== DEBUG AUTENTICAZIONE ===');
console.log('Token in localStorage:', localStorage.getItem('token'));
console.log('User in localStorage:', localStorage.getItem('user'));
console.log('API Base URL:', 'http://localhost:3001/api');

// Test chiamata API clienti
fetch('http://localhost:3001/api/clienti', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('Status:', response.status);
    return response.text();
})
.then(data => {
    console.log('Response:', data);
})
.catch(error => {
    console.error('Error:', error);
});
